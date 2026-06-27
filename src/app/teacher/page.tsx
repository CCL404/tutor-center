'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format, startOfWeek, addDays } from 'date-fns'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function TeacherDashboard() {
  const { profile } = useAuth()
  const supabase = createClient()
  const [sessions, setSessions] = useState<any[]>([])
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

  useEffect(() => {
    const load = async () => {
      if (!profile) return

      // Get teacher record
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', profile.id)
        .single()

      if (!teacher) return
      setTeacherId(teacher.id)

      // Get this week's sessions
      const weekEnd = addDays(weekStart, 6)
      const { data } = await supabase
        .from('sessions')
        .select(`
          *,
          session_students(
            student:students(id, notes, profile:profiles(name))
          )
        `)
        .eq('teacher_id', teacher.id)
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'))
        .order('date')
        .order('start_time')

      setSessions(data ?? [])
    }
    load()
  }, [profile, supabase, weekStart])

  // Group by day
  const byDay = DAYS.map((_, i) => {
    const date = addDays(weekStart, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    return {
      day: DAYS[i],
      date,
      dateStr,
      sessions: sessions.filter((s) => s.date === dateStr),
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Schedule</h1>
        <p className="text-muted-foreground text-sm">
          {format(weekStart, 'M月d日')} - {format(addDays(weekStart, 6), 'M月d日')}
        </p>
      </div>

      {!teacherId && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
          Teacher profile not set up yet. Please contact admin.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-7">
        {byDay.map(({ day, date, dateStr, sessions }) => (
          <Card key={dateStr} className="min-h-[200px]">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-sm text-center">
                <span className="text-muted-foreground">{day}</span>
                <br />
                <span className="text-lg">{format(date, 'd')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-2">
              {sessions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">—</p>
              ) : (
                sessions.map((s: any) => (
                  <div
                    key={s.id}
                    className="p-2 rounded-md border text-xs space-y-1 cursor-pointer hover:bg-accent"
                  >
                    <p className="font-medium">
                      {s.start_time.slice(0, 5)}
                    </p>
                    <p>{s.subject}</p>
                    {s.room && (
                      <Badge variant="outline" className="text-[10px] px-1">
                        {s.room}
                      </Badge>
                    )}
                    <p className="text-muted-foreground">
                      {s.session_students?.length ?? 0} students
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
