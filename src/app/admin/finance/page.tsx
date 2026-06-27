'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { apiGet, getAccessToken, ANON_KEY, SUPABASE_URL } from '@/lib/supabase-api'

export default function AdminFinance() {
  const [payments, setPayments] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [summary, setSummary] = useState({ totalDue: 0, totalPaid: 0, outstanding: 0 })
  const [open, setOpen] = useState(false)

  const load = async () => {
    const [payData, stuData] = await Promise.all([
      apiGet('payments?select=*,student:students!inner(user_id,profile:profiles(name))&order=created_at.desc'),
      apiGet('students?select=*,profile:profiles(name)'),
    ])
    setPayments(payData ?? [])
    setStudents(stuData ?? [])
    const totalDue = (payData ?? []).reduce((s: number, p: any) => s + (p.amount_due || 0), 0)
    const totalPaid = (payData ?? []).reduce((s: number, p: any) => s + (p.amount_paid || 0), 0)
    setSummary({ totalDue, totalPaid, outstanding: totalDue - totalPaid })
  }

  useEffect(() => { load() }, [])

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const token = await getAccessToken()
    const res = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        student_id: form.get('student_id') as string,
        amount_due: parseFloat(form.get('amount_due') as string) || 0,
        amount_paid: parseFloat(form.get('amount_paid') as string) || 0,
        due_date: form.get('due_date') as string || null,
        notes: form.get('notes') as string || null,
      }),
    })
    if (!res.ok) { toast.error('Failed to save'); return }
    toast.success('Added payment record')
    setOpen(false)
    load()
  }

  const markPaid = async (id: string) => {
    const token = await getAccessToken()
    const pay = await apiGet(`payments?select=amount_due&id=eq.${id}`)
    if (pay?.[0]) {
      await fetch(`${SUPABASE_URL}/rest/v1/payments?id=eq.${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount_paid: pay[0].amount_due, paid_at: new Date().toISOString() }),
      })
    }
    toast.success('Marked as paid')
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finance</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New Record</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Payment Record</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="student_id">Student</Label>
                <select name="student_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select student</option>
                  {students.map((s: any) => <option key={s.id} value={s.id}>{s.profile?.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="amount_due">Amount Due</Label><Input id="amount_due" name="amount_due" type="number" required /></div>
                <div className="space-y-2"><Label htmlFor="amount_paid">Amount Paid</Label><Input id="amount_paid" name="amount_paid" type="number" defaultValue="0" /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="due_date">Due Date</Label><Input id="due_date" name="due_date" type="date" /></div>
              <div className="space-y-2"><Label htmlFor="notes">Notes</Label><Input id="notes" name="notes" placeholder="e.g. March tuition" /></div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Save</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Tabs defaultValue="overview">
        <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="details">Details</TabsTrigger></TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 grid-cols-3">
            <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Total Due</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold">${summary.totalDue.toFixed(0)}</p></CardContent></Card>
            <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Total Paid</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-green-600">${summary.totalPaid.toFixed(0)}</p></CardContent></Card>
            <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-red-600">${summary.outstanding.toFixed(0)}</p></CardContent></Card>
          </div>
        </TabsContent>
        <TabsContent value="details">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Due</TableHead><TableHead>Paid</TableHead><TableHead>Outstanding</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.student?.profile?.name ?? 'Unknown'}</TableCell>
                    <TableCell>${(p.amount_due || 0).toFixed(0)}</TableCell>
                    <TableCell>${(p.amount_paid || 0).toFixed(0)}</TableCell>
                    <TableCell className={p.amount_due > p.amount_paid ? 'text-red-600 font-medium' : ''}>${(p.amount_due - p.amount_paid).toFixed(0)}</TableCell>
                    <TableCell>{p.due_date ? format(new Date(p.due_date + 'T00:00:00'), 'M/d') : '-'}</TableCell>
                    <TableCell>{p.paid_at ? <span className="text-green-600 text-sm">✓ Paid</span> : <span className="text-red-600 text-sm">Unpaid</span>}</TableCell>
                    <TableCell>{!p.paid_at && <Button variant="outline" size="sm" onClick={() => markPaid(p.id)}>Mark Paid</Button>}</TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No payment records</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
