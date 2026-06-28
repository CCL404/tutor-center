'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { getAccessToken, ANON_KEY, SUPABASE_URL } from '@/lib/supabase-api'

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwbXNxbmRyanJvcmZ3eHp2cmNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1NjA1NywiZXhwIjoyMDk4MTMyMDU3fQ.oesRAH8vpOQRx1Qz6gGfudZFsuYF4zfwb3VZTZtdCdo'

export default function AdminFinance() {
  const [students, setStudents] = useState<any[]>([])
  const [sessionsMap, setSessionsMap] = useState<Record<string, any[]>>({})
  const [paymentsMap, setPaymentsMap] = useState<Record<string, number>>({})
  const [payDialog, setPayDialog] = useState<{ student: any; totalDue: number; totalPaid: number } | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    // Get all students
    const stuRes = await fetch(`${SUPABASE_URL}/rest/v1/students?select=id,user_id,notes`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    const stuData = stuRes.ok ? await stuRes.json() : []
    const userIds = stuData.map((s: any) => s.user_id).filter(Boolean)

    // Get profiles
    const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,name,email,phone&id=in.(${userIds.join(',')})`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    const profiles = profRes.ok ? await profRes.json() : []
    const profileMap: Record<string, any> = {}
    profiles.forEach((p: any) => { profileMap[p.id] = p })

    // For each student, get enrolled sessions with prices
    const ssMap: Record<string, any[]> = {}
    const payMap: Record<string, number> = {}

    await Promise.all(stuData.map(async (s: any) => {
      const sid = s.id

      // Get all enrolled sessions with prices
      const ssRes = await fetch(
        `${SUPABASE_URL}/rest/v1/session_students?select=price,session:sessions(id,date,subject,start_time)&student_id=eq.${sid}`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
      )
      const enrolled = ssRes.ok ? await ssRes.json() : []

      // Get attendance records — maintain status map
      const attRes = await fetch(
        `${SUPABASE_URL}/rest/v1/attendance?select=session_id,date,status&student_id=eq.${sid}`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
      )
      const attendanceRecords = attRes.ok ? await attRes.json() : []
      const attendedSessionIds = new Set(attendanceRecords.map((a: any) => a.session_id))
      const statusMap: Record<string, string> = {}
      attendanceRecords.forEach((a: any) => { statusMap[a.session_id] = a.status })

      // Only include sessions that have attendance marked
      ssMap[sid] = enrolled
        .filter((e: any) => attendedSessionIds.has(e.session?.id))
        .map((e: any) => ({
          id: e.session?.id,
          date: e.session?.date,
          subject: e.session?.subject,
          start_time: e.session?.start_time,
          price: e.price || 0,
          status: statusMap[e.session?.id] || '',
        }))
        .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || '') || (b.start_time || '').localeCompare(a.start_time || ''))

      // Payments
      const payRes = await fetch(`${SUPABASE_URL}/rest/v1/payments?select=amount_paid&student_id=eq.${sid}`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      })
      payMap[sid] = payRes.ok
        ? (await payRes.json()).reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0)
        : 0
    }))

    setStudents(stuData.map((s: any) => ({ ...s, profile: profileMap[s.user_id] ?? null })))
    setSessionsMap(ssMap)
    setPaymentsMap(payMap)
  }

  useEffect(() => { load() }, [])

  const getStudentStats = (s: any) => {
    const sessions = sessionsMap[s.id] || []
    const totalDue = sessions.reduce((sum: number, ss: any) => sum + (ss.price || 0), 0)
    const totalPaid = paymentsMap[s.id] || 0
    return { sessions, totalDue, totalPaid, outstanding: totalDue - totalPaid }
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
      <h1 className="text-2xl font-bold">Finance</h1>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-3">
        <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Total Due</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold">${students.reduce((s, stu) => s + getStudentStats(stu).totalDue, 0).toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Total Paid</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-green-600">${students.reduce((s, stu) => s + getStudentStats(stu).totalPaid, 0).toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className={`text-2xl font-bold ${students.reduce((s, stu) => s + getStudentStats(stu).outstanding, 0) > 0 ? 'text-red-600' : ''}`}>${students.reduce((s, stu) => s + getStudentStats(stu).outstanding, 0).toFixed(2)}</p></CardContent></Card>
      </div>

      {/* Per-student breakdown */}
      {students.map((s) => {
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
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-4">No sessions enrolled</TableCell></TableRow>
                  ) : (
                    (st.sessions ?? []).map((ss: any) => (
                      <TableRow key={ss.id}>
                        <TableCell>{ss.date ? format(new Date(ss.date + 'T00:00:00'), 'yyyy/M/d') : '-'}</TableCell>
                        <TableCell>{ss.subject}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            ss.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {ss.status === 'present' ? 'Present' : 'Absent'}
                          </span>
                        </TableCell>
                        <TableCell>${(ss.price || 0).toFixed(2)}</TableCell>
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

      {students.length === 0 && (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No students found</CardContent></Card>
      )}

      <Dialog open={!!payDialog} onOpenChange={(v) => { if (!v) setPayDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Record Payment — {payDialog?.student?.profile?.name}
            </DialogTitle>
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
