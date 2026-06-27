'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarRange, Users, DollarSign, BookOpen } from 'lucide-react'
import { format } from 'date-fns'

interface DashboardStats {
  todaySessions: number
  totalTeachers: number
  totalStudents: number
  outstandingPayments: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todaySessions: 0,
    totalTeachers: 0,
    totalStudents: 0,
    outstandingPayments: 0,
  })
  const [todaySessions, setTodaySessions] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const today = format(new Date(), 'yyyy-MM-dd')

      const { count: sessionCount } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)

      const { count: teacherCount } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })

      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })

      const { data: payments } = await supabase
        .from('payments')
        .select('amount_due, amount_paid')
        .is('paid_at', null)

      const outstanding = ((payments as any[]) || []).reduce(
        (sum: number, p: any) => sum + (p.amount_due - p.amount_paid), 0
      )

      const { data: sessions } = await supabase
        .from('sessions')
        .select(`
          *,
          teacher:teachers(id, color, subjects, profile:profiles(name))
        `)
        .eq('date', today)
        .order('start_time')

      setStats({
        todaySessions: sessionCount ?? 0,
        totalTeachers: teacherCount ?? 0,
        totalStudents: studentCount ?? 0,
        outstandingPayments: outstanding,
      })
      setTodaySessions(sessions ?? [])
    }
    load()
  }, [supabase])

  const statCards = [
    {
      title: 'Today\'s Sessions',
      value: stats.todaySessions,
      icon: <CalendarRange className="h-5 w-5" />,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Teachers',
      value: stats.totalTeachers,
      icon: <Users className="h-5 w-5" />,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Students',
      value: stats.totalStudents,
      icon: <BookOpen className="h-5 w-5" />,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Outstanding',
      value: `$${stats.outstandingPayments.toFixed(0)}`,
      icon: <DollarSign className="h-5 w-5" />,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          {format(new Date(), 'EEEE, MMM d, yyyy')}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <span className={card.color}>{card.icon}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.title}</p>
                <p className="text-xl font-bold">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today&apos;s Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {todaySessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sessions today</p>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{s.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                      {s.room && ` · ${s.room}`}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">
                      {s.teacher?.profile?.name ?? 'Unassigned'}
                    </p>
                    <p className="text-muted-foreground">
                      ${s.price_per_student}/student
                    </p>
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
