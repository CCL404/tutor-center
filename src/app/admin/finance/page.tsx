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

export default function AdminFinance() {
  const [students, setStudents] = useState<any[]>([])
  const [payDialog, setPayDialog] = useState<{ student: any; totalDue: number; totalPaid: number } | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const res = await fetch('/api/admin/students')
    const data = await res.json()
    setStudents(data.students ?? [])
  }

  useEffect(() => { load() }, [])

  const totals = students.reduce(
    (acc, s) => {
      const st = s.stats || { totalDue: 0, totalPaid: 0, outstanding: 0 }
      return {
        totalDue: acc.totalDue + st.totalDue,
        totalPaid: acc.totalPaid + st.totalPaid,
        outstanding: acc.outstanding + st.outstanding,
      }
    },
    { totalDue: 0, totalPaid: 0, outstanding: 0 }
  )

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
        <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Total Due</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold">${totals.totalDue.toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Total Paid</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-green-600">${totals.totalPaid.toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className={`text-2xl font-bold ${totals.outstanding > 0 ? 'text-red-600' : ''}`}>${totals.outstanding.toFixed(2)}</p></CardContent></Card>
      </div>

      {/* Per-student breakdown */}
      {students.map((s) => {
        const st = s.stats || { totalDue: 0, totalPaid: 0, outstanding: 0 }
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
                    <TableHead>Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(s.sessions ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-4">No sessions enrolled</TableCell></TableRow>
                  ) : (
                    (s.sessions ?? []).map((ss: any) => (
                      <TableRow key={ss.id}>
                        <TableCell>{ss.date ? format(new Date(ss.date + 'T00:00:00'), 'yyyy/M/d') : '-'}</TableCell>
                        <TableCell>{ss.subject}</TableCell>
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
