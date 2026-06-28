'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { apiAdmin } from '@/lib/supabase-api'

export default function StudentFinance() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState<any[]>([])
  const [totalPaid, setTotalPaid] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!profile) return
      const students = await apiAdmin(`students?select=id&user_id=eq.${profile.id}`)
      const student = students?.[0]
      if (!student) { setLoaded(true); return }

      // Get enrolled sessions with prices
      const enrolled = (await apiAdmin(`session_students?select=price,session:sessions(id,date,subject,start_time)&student_id=eq.${student.id}`)) ?? []

      // Get attendance — only sessions with attendance count toward fees
      const attendanceRecords = (await apiAdmin(`attendance?select=session_id&student_id=eq.${student.id}`)) ?? []
      const attendedSessionIds = new Set(attendanceRecords.filter((a: any) => a.status === 'present').map((a: any) => a.session_id))

      setSessions(enrolled
        .filter((e: any) => attendedSessionIds.has(e.session?.id))
        .map((e: any) => ({
          id: e.session?.id,
          date: e.session?.date,
          subject: e.session?.subject,
          start_time: e.session?.start_time,
          price: e.price || 0,
        }))
        .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || '') || (b.start_time || '').localeCompare(a.start_time || ''))
      )

      // Get payments made
      const payments = (await apiAdmin(`payments?select=amount_paid,paid_at,notes&student_id=eq.${student.id}&order=created_at.desc`)) ?? []
      setTotalPaid(payments.reduce((s: number, p: any) => s + (p.amount_paid || 0), 0))
      setLoaded(true)
    }
    load()
  }, [profile])

  const totalDue = sessions.reduce((s, ss) => s + (ss.price || 0), 0)
  const outstanding = totalDue - totalPaid

  if (!loaded) return <div className="p-6 text-center text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Finance</h1>

      <div className="grid gap-4 grid-cols-3">
        <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Total Due</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold">${totalDue.toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Paid</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</p></CardContent></Card>
        <Card><CardHeader className="p-4 pb-2"><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className={`text-2xl font-bold ${outstanding > 0 ? 'text-red-600' : ''}`}>${outstanding.toFixed(2)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">My Sessions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No enrolled sessions</TableCell></TableRow>
              ) : (
                sessions.map((ss: any) => (
                  <TableRow key={ss.id}>
                    <TableCell>{ss.date ? format(new Date(ss.date + 'T00:00:00'), 'yyyy/M/d') : '-'}</TableCell>
                    <TableCell>{ss.start_time?.slice(0, 5) || '-'}</TableCell>
                    <TableCell>{ss.subject}</TableCell>
                    <TableCell>${(ss.price || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Payment History</CardTitle></CardHeader>
        <CardContent>
          {totalPaid === 0 ? (
            <p className="text-center text-muted-foreground py-4">No payments recorded yet</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Total paid: <span className="font-medium text-green-600">${totalPaid.toFixed(2)}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
