'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { format, addMonths } from 'date-fns'
import { getAccessToken, ANON_KEY, SUPABASE_URL, apiAdmin, apiAdminPost, apiAdminPatch } from '@/lib/supabase-api'

export default function AdminFinance() {
  const [students, setStudents] = useState<any[]>([])
  const [sessionsMap, setSessionsMap] = useState<Record<string, any[]>>({})
  const [paymentsMap, setPaymentsMap] = useState<Record<string, number>>({})
  const [payDialog, setPayDialog] = useState<{ student: any; totalDue: number; totalPaid: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [month, setMonth] = useState(new Date())
  const [loaded, setLoaded] = useState(false)
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set())
  const monthStr = format(month, 'yyyy-MM')

  const load = useCallback(async () => {
    setLoaded(false)
    const start = Date.now()
    const stuData = (await apiAdmin('students?select=id,user_id,notes&order=created_at.desc')) ?? []
    const userIds = stuData.map((s: any) => s.user_id).filter(Boolean)
    const profiles = userIds.length > 0 ? (await apiAdmin(`profiles?select=id,name,email,phone&id=in.(${userIds.join(',')})`)) ?? [] : []
    const profileMap: Record<string, any> = {}
    profiles.forEach((p: any) => { profileMap[p.id] = p })

    const monthStart = `${monthStr}-01`
    const monthEnd = format(addMonths(new Date(monthStart), 1), 'yyyy-MM-dd')

    // Batch fetch all data for the month — 3 queries total instead of N+1
    const [allEnrolled, allAttendance, allPayments] = await Promise.all([
      apiAdmin(`session_students?select=id,price,student_id,session:sessions(id,date,subject,start_time)&session.date=gte.${monthStart}&session.date=lt.${monthEnd}`),
      apiAdmin(`attendance?select=id,session_id,student_id,status&date=gte.${monthStart}&date=lt.${monthEnd}`),
      apiAdmin(`payments?select=student_id,amount_paid,paid_at&paid_at=gte.${monthStart}&paid_at=lt.${monthEnd}`),
    ])

    const ssMap: Record<string, any[]> = {}
    const payMap: Record<string, number> = {}

    // Group session_students by student_id
    ;(allEnrolled ?? []).forEach((e: any) => {
      if (!e.session) return
      const sid = e.student_id
      if (!ssMap[sid]) ssMap[sid] = []
      ssMap[sid].push({
        id: e.session.id,
        ssId: e.id,
        date: e.session.date,
        subject: e.session.subject,
        start_time: e.session.start_time,
        price: e.price || 0,
        status: 'pending',
        attId: null,
      })
    })

    // Apply attendance status
    const attByStudent: Record<string, Record<string, { status: string; id: string }>> = {}
    ;(allAttendance ?? []).forEach((a: any) => {
      if (!attByStudent[a.student_id]) attByStudent[a.student_id] = {}
      attByStudent[a.student_id][a.session_id] = { status: a.status, id: a.id }
    })

    Object.entries(ssMap).forEach(([sid, sessions]) => {
      const studentAtt = attByStudent[sid] || {}
      sessions.forEach((s: any) => {
        const att = studentAtt[s.id]
        if (att) { s.status = att.status; s.attId = att.id }
      })
      // Sort by date desc, then time desc
      sessions.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || '') || (b.start_time || '').localeCompare(a.start_time || ''))
    })

    // Sum payments by student
    ;(allPayments ?? []).forEach((p: any) => {
      payMap[p.student_id] = (payMap[p.student_id] || 0) + (p.amount_paid || 0)
    })

    setStudents(stuData.map((s: any) => ({ ...s, profile: profileMap[s.user_id] ?? null })))
    setSessionsMap(ssMap)
    setPaymentsMap(payMap)
    const elapsed = Date.now() - start
    if (elapsed < 200) await new Promise(r => setTimeout(r, 200 - elapsed))
    setLoaded(true)
  }, [monthStr])

  useEffect(() => { load() }, [load])

  const getStudentStats = (s: any) => {
    const sessions = sessionsMap[s.id] || []
    const totalDue = sessions.filter(ss => ss.status === 'present').reduce((sum: number, ss: any) => sum + (ss.price || 0), 0)
    const totalPaid = paymentsMap[s.id] || 0
    return { sessions, totalDue, totalPaid, outstanding: Math.max(0, totalDue - totalPaid) }
  }

  const setStatus = async (studentId: string, sessionId: string, sessionDate: string, newStatus: string, attId: string | null) => {
    if (attId) {
      const ok = await apiAdminPatch(`attendance?id=eq.${attId}`, { status: newStatus })
      if (!ok) { toast.error('Failed to update status'); return }
    } else if (newStatus !== 'pending') {
      const ok = await apiAdminPost('attendance', {
        student_id: studentId,
        session_id: sessionId,
        date: sessionDate,
        status: newStatus,
      })
      if (!ok) { toast.error('Failed to create attendance'); return }
    }
    toast.success(`Marked ${newStatus}`)
    load()
  }

  const updatePrice = async (ssId: string, price: number) => {
    const ok = await apiAdminPatch(`session_students?id=eq.${ssId}`, { price })
    if (!ok) { toast.error('Failed to update price'); return }
    toast.success('Price updated')
    load()
  }

  const recordPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!payDialog) return
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const token = await getAccessToken()
    const res = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        student_id: payDialog.student.id,
        amount_due: 0,
        amount_paid: parseFloat(form.get('amount') as string) || 0,
        notes: form.get('notes') as string || 'Payment received',
        paid_at: new Date().toISOString(),
      }),
    })
    if (!res.ok) { toast.error('Failed'); setSaving(false); return }
    toast.success('Payment recorded')
    setPayDialog(null)
    setSaving(false)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finance</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={monthStr}
            onChange={e => setMonth(new Date(e.target.value + '-01'))}
            className="text-sm font-medium text-center border rounded px-2 py-1 w-auto"
          />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-3">
        {!loaded ? (
          <>
            <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Loading...</CardContent></Card>
            <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Loading...</CardContent></Card>
            <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Loading...</CardContent></Card>
          </>
        ) : (
          <>
            <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Total Due</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold">${students.reduce((s, stu) => s + getStudentStats(stu).totalDue, 0).toFixed(2)}</p></CardContent></Card>
            <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Total Paid</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-green-600">${students.reduce((s, stu) => s + getStudentStats(stu).totalPaid, 0).toFixed(2)}</p></CardContent></Card>
            <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className={`text-2xl font-bold ${students.reduce((s, stu) => s + getStudentStats(stu).outstanding, 0) > 0 ? 'text-red-600' : ''}`}>${students.reduce((s, stu) => s + getStudentStats(stu).outstanding, 0).toFixed(2)}</p></CardContent></Card>
          </>
        )}
      </div>

      {students.filter(s => (sessionsMap[s.id] || []).length > 0).map((s) => {
        const st = getStudentStats(s)
        const expanded = expandedStudents.has(s.id)
        const toggle = () => {
          const next = new Set(expandedStudents)
          if (expanded) next.delete(s.id); else next.add(s.id)
          setExpandedStudents(next)
        }
        return (
          <Card key={s.id}>
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50" onClick={toggle}>
              <div className="flex items-center gap-3">
                <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
                <div>
                  <CardTitle className="text-base">{s.profile?.name ?? 'Unknown'}</CardTitle>
                  <p className="text-xs text-muted-foreground">{s.profile?.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${st.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${st.outstanding.toFixed(2)} outstanding
                </p>
                <p className="text-xs text-muted-foreground">Due: ${st.totalDue.toFixed(2)} · Paid: ${st.totalPaid.toFixed(2)}</p>
              </div>
            </CardHeader>
            {expanded && (
              <>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(st.sessions ?? []).length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-4">No sessions this month</TableCell></TableRow>
                      ) : (
                        (st.sessions ?? []).map((ss: any) => (
                          <TableRow key={ss.id} className={ss.status !== 'present' ? 'opacity-60' : ''}>
                            <TableCell>{ss.date ? format(new Date(ss.date + 'T00:00:00'), 'yyyy/M/d') : '-'}</TableCell>
                            <TableCell>{ss.subject}</TableCell>
                            <TableCell>
                              <select
                                value={ss.status}
                                onChange={(e) => setStatus(s.id, ss.id, ss.date, e.target.value, ss.attId)}
                                className={`text-xs rounded border px-1.5 py-0.5 cursor-pointer ${
                                  ss.status === 'present'
                                    ? 'bg-green-100 text-green-800 border-green-300'
                                    : ss.status === 'absent'
                                    ? 'bg-red-100 text-red-800 border-red-300'
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}
                              >
                                <option value="present">Present</option>
                                <option value="absent">Absent</option>
                                <option value="pending">Pending</option>
                              </select>
                            </TableCell>
                            <TableCell>
                              <EditablePrice
                                value={ss.price}
                                ssId={ss.ssId}
                                onSave={updatePrice}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
                <div className="p-3 border-t flex justify-end">
                  <Button size="sm" onClick={() => setPayDialog({ student: s, totalDue: st.totalDue, totalPaid: st.totalPaid })}>
                    Record Payment
                  </Button>
                </div>
              </>
            )}
          </Card>
        )
      })}

      {!loaded ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : students.filter(s => (sessionsMap[s.id] || []).length > 0).length === 0 && (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No students found</CardContent></Card>
      )}

      <Dialog open={!!payDialog} onOpenChange={(v) => { if (!v) setPayDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment — {payDialog?.student?.profile?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={recordPayment} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Outstanding: <span className="font-bold text-red-600">${((payDialog?.totalDue ?? 0) - (payDialog?.totalPaid ?? 0)).toFixed(2)}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount ($)</Label>
              <Input id="amount" name="amount" type="number" step="0.01" required placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" placeholder="e.g. Cash / Bank transfer" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPayDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Record'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditablePrice({ value, ssId, onSave }: { value: number; ssId: string; onSave: (ssId: string, price: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState(String(value))

  const handleSave = async () => {
    const num = parseFloat(inputVal)
    if (isNaN(num) || num < 0) return
    await onSave(ssId, num)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        type="number"
        step="0.01"
        className="w-20 h-7 px-1 text-sm border rounded"
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setInputVal(String(value)); setEditing(false) } }}
        autoFocus
      />
    )
  }

  return (
    <span
      className="cursor-pointer hover:bg-muted px-1 rounded text-sm"
      onClick={() => { setInputVal(String(value)); setEditing(true) }}
    >
      ${(value || 0).toFixed(2)}
    </span>
  )
}
