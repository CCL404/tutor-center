'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarRange, Users, DollarSign, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import { apiGet, SUPABASE_URL } from '@/lib/supabase-api'

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwbXNxbmRyanJvcmZ3eHp2cmNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjU1NjA1NywiZXhwIjoyMDk4MTMyMDU3fQ.oesRAH8vpOQRx1Qz6gGfudZFsuYF4zfwb3VZTZtdCdo'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ todaySessions: 0, totalTeachers: 0, totalStudents: 0, outstandingPayments: 0 })
  const [todaySessions, setTodaySessions] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const today = format(new Date(), 'yyyy-MM-dd')

      const sessions = await apiGet(`sessions?select=*,teacher:teachers(id,color,subjects,profile:profiles(name))&date=eq.${today}&order=start_time`)
      setTodaySessions(sessions ?? [])

      const teachers = await apiGet('teachers?select=id')
      const students = await apiGet('students?select=id')

      // Calculate outstanding: total session fees (attendance confirmed) - total payments
      const skHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
      
      // Sum all payments
      const payRes = await fetch(`${SUPABASE_URL}/rest/v1/payments?select=amount_paid`, {
        headers: skHeaders,
      })
      const payments = payRes.ok ? await payRes.json() : []
      const totalPaid = payments.reduce((s: number, p: any) => s + (p.amount_paid || 0), 0)

      // Sum all session_students prices with attendance
      const ssRes = await fetch(`${SUPABASE_URL}/rest/v1/session_students?select=session_id,price,student_id`, {
        headers: skHeaders,
      })
      const sessionStudents = ssRes.ok ? await ssRes.json() : []

      // Get all attendance to know which sessions count
      const attRes = await fetch(`${SUPABASE_URL}/rest/v1/attendance?select=session_id,student_id`, {
        headers: skHeaders,
      })
      const attendance = attRes.ok ? await attRes.json() : []
      // Build a set of "session_student" attendance combos
      const attendedKeys = new Set(attendance.map((a: any) => `${a.session_id}|${a.student_id}`))

      // Filter session_students to only those with attendance
      const totalDue = sessionStudents
        .filter((ss: any) => attendedKeys.has(`${ss.session_id}|${ss.student_id}`))
        .reduce((s: number, ss: any) => s + (ss.price || 0), 0)

      setStats({
        todaySessions: sessions?.length ?? 0,
        totalTeachers: teachers?.length ?? 0,
        totalStudents: students?.length ?? 0,
        outstandingPayments: totalDue - totalPaid,
      })
    }
    load()
  }, [])

  const statCards = [
    { title: "Today's Sessions", value: stats.todaySessions, icon: <CalendarRange className="h-5 w-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Teachers', value: stats.totalTeachers, icon: <Users className="h-5 w-5" />, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Students', value: stats.totalStudents, icon: <BookOpen className="h-5 w-5" />, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Outstanding', value: `$${stats.outstandingPayments.toFixed(0)}`, icon: <DollarSign className="h-5 w-5" />, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">{format(new Date(), 'EEEE, MMM d, yyyy')}</p>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.bg}`}><span className={card.color}>{card.icon}</span></div>
              <div>
                <p className="text-xs text-muted-foreground">{card.title}</p>
                <p className="text-xl font-bold">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Today&apos;s Sessions</CardTitle></CardHeader>
        <CardContent>
          {todaySessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sessions today</p>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{s.subject}</p>
                    <p className="text-sm text-muted-foreground">{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}{s.room && ` · ${s.room}`}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{s.teacher?.profile?.name ?? 'Unassigned'}</p>
                    <p className="text-muted-foreground">${s.price_per_student}/student</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
