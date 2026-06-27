'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { apiGet } from '@/lib/supabase-api'

export default function StudentFinance() {
  const { profile } = useAuth()
  const [payments, setPayments] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      if (!profile) return
      const student = await apiGet(`students?select=id&user_id=eq.${profile.id}`)
      if (!student?.[0]) return

      const data = await apiGet(`payments?select=*&student_id=eq.${student[0].id}&order=created_at.desc`)
      setPayments(data ?? [])
    }
    load()
  }, [profile])

  const totalDue = payments.reduce((s, p) => s + (p.amount_due || 0), 0)
  const totalPaid = payments.reduce((s, p) => s + (p.amount_paid || 0), 0)
  const outstanding = totalDue - totalPaid

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Finance</h1>
      <div className="grid gap-4 grid-cols-3">
        <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Total Due</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold">${totalDue.toFixed(0)}</p></CardContent></Card>
        <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Paid</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-green-600">${totalPaid.toFixed(0)}</p></CardContent></Card>
        <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className={`text-2xl font-bold ${outstanding > 0 ? 'text-red-600' : ''}`}>${outstanding.toFixed(0)}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Payment Details</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Due</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.due_date ? format(new Date(p.due_date + 'T00:00:00'), 'yyyy/M/d') : '-'}</TableCell>
                  <TableCell>${(p.amount_due || 0).toFixed(0)}</TableCell>
                  <TableCell>${(p.amount_paid || 0).toFixed(0)}</TableCell>
                  <TableCell>{p.paid_at ? <span className="text-green-600">✓ Paid</span> : <span className="text-red-600">Unpaid</span>}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.notes ?? '-'}</TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No payment records</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
