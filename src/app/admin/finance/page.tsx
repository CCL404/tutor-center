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
  const monthStr = format(month, 'yyyy-MM')

  const load = useCallback(async () => {
    const stuData = (await apiAdmin('students?select=id,user_id,notes&order=created_at.desc')) ?? []
    const userIds = stuData.map((s: any) => s.user_id).filter(Boolean)
    const profiles = userIds.length > 0 ? (await apiAdmin(`profiles?select=id,name,email,phone&id=in.(${userIds.join(',')})`)) ?? [] : []
    const profileMap: Record<string, any> = {}
    profiles.forEach((p: any) => { profileMap[p.id] = p })

    const ssMap: Record<string, any[]> = {}
    const payMap: Record<string, number> = {}
    const monthStart = `${monthStr}-01`
    const monthEnd = format(addMonths(month, 1), 'yyyy-MM-dd')

    await Promise.all(stuData.map(async (s: any) => {
      const sid = s.id

      // All enrolled sessions (no attendance filter)
      const enrolled = (await apiAdmin(`session_students?select=id,price,session:sessions(id,date,subject,start_time)&student_id=eq.${sid}&session.date=gte.${monthStart}&session.date=lt.${monthEnd}`)) ?? []

      // Attendance for this student
      const attendanceRecords = (await apiAdmin(`attendance?select=id,session_id,status&student_id=eq.${sid}&date=gte.${monthStart}&date=lt.${monthEnd}`)) ?? []
      const statusMap: Record<string, string> = {}
      const attIdMap: Record<string, string> = {}
      attendanceRecords.forEach((a: any) => {
        statusMap[a.session_id] = a.status
        attIdMap[a.session_id] = a.id
      })

      ssMap[sid] = enrolled
        .filter((e: any) => e.session) // only if session exists
        .map((e: any) => ({
          id: e.session?.id,
          ssId: e.id,
          date: e.session?.date,
          subject: e.session?.subject,
          start_time: e.session?.start_time,
          price: e.price || 0,
          status: statusMap[e.session?.id] || 'absent',
          attId: attIdMap[e.session?.id] || null,
        }))
        .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || '') || (b.start_time || '').localeCompare(a.start_time || ''))

      const pays = (await apiAdmin(`payments?select=amount_paid&student_id=eq.${sid}&paid_at=gte.${monthStart}&paid_at=lt.${monthEnd}`)) ?? []
      payMap[sid] = pays.reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0)
    }))

    setStudents(stuData.map((s: any) => ({ ...s, profile: profileMap[s.user_id] ?? null })))
    setSessionsMap(ssMap)
    setPaymentsMap(payMap)
  }, [monthStr])

  useEffect(() => { load() }, [load])

  const getStudentStats = (s: any) => {
    const sessions = sessionsMap[s.id] || []
    const totalDue = sessions.filter(ss => ss.status === 'present').reduce((sum: number, ss: any) => sum + (ss.price || 0), 0)
    const totalPaid = paymentsMap[s.id] || 0
    return { sessions, totalDue, totalPaid, outstanding: totalDue - totalPaid }
  }

  const toggleStatus = async (studentId: string, sessionId: string, currentStatus: string, attId: string | null) => {
    const newStatus = currentStatus === 'present' ? 'absent' : 'present'
    if (attId) {
      const ok = await apiAdminPatch(`attendance?id=eq.${attId}`, { status: newStatus })
      if (!ok) { toast.error('Failed to update status'); return }
    } else {
      const ok = await apiAdminPost('attendance', {
        student_id: studentId,
        session_id: sessionId,
        date: new Date().toISOString().split('T')[0],
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
        <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Total Due</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold">${students.reduce((s, stu) => s + getStudentStats(stu).totalDue, 0).toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Total Paid</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-green-600">${students.reduce((s, stu) => s + getStudentStats(stu).totalPaid, 0).toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className={`text-2xl font-bold ${students.reduce((s, stu) => s + getStudentStats(stu).outstanding, 0) > 0 ? 'text-red-600' : ''}`}>${students.reduce((s, stu) => s + getStudentStats(stu).outstanding, 0).toFixed(2)}</p></CardContent></Card>
      </div>

      {students.filter(s => (sessionsMap[s.id] || []).length > 0).map((s) => {
        const st = getStudentStats(s)
        return (
          <Card key={s.id}>
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{s.profile?.name ?? 'Unknown'}</CardTitle>
                <p className="text-xs text-muted-foreground">{s.profile?.email}</p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${st.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${st.outstanding.toFixed(2)} outstanding
                </p>
                <p className="text-xs text-muted-foreground">Due: ${st.totalDue.toFixed(2)} · Paid: ${st.totalPaid.toFixed(2)}</p>
              </div>
            </CardHeader>
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
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleStatus(s.id, ss.id, ss.status, ss.attId)}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-pointer border ${
                                ss.status === 'present'
                                  ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                                  : 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                              }`}
                            >
                              {ss.status === 'present' ? 'Present' : 'Absent'}
                            </button>
                          </div>
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
          </Card>
        )
      })}

      {students.filter(s => (sessionsMap[s.id] || []).length > 0).length === 0 && (
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
