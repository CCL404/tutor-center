'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarRange, Users, BookOpen, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { apiAdmin } from '@/lib/supabase-api'

export default function TeacherDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ todaySessions: 0, myStudents: 0 })
  const [todaySessions, setTodaySessions] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!profile) return
      setLoaded(false)
      const today = format(new Date(), 'yyyy-MM-dd')
      const teachers = await apiAdmin(`teachers?select=id&user_id=eq.${profile.id}`)
      if (!teachers?.[0]) return
      const tid = teachers[0].id

      const sessions = await apiAdmin(`sessions?select=*,session_students(student:students(id))&teacher_id=eq.${tid}&date=eq.${today}&order=start_time`)
      setTodaySessions(sessions ?? [])

      const allSessions = await apiAdmin(`sessions?select=id,session_students(student:students(id))&teacher_id=eq.${tid}`)
      const studentSet = new Set<string>()
      allSessions?.forEach((s: any) => s.session_students?.forEach((ss: any) => studentSet.add(ss.student?.id)))

      setStats({
        todaySessions: sessions?.length ?? 0,
        myStudents: studentSet.size,
      })
      setLoaded(true)
    }
    load()
  }, [profile])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">{format(new Date(), 'EEEE, MMM d, yyyy')}</p>
      </div>
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50"><CalendarRange className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-xs text-muted-foreground">Today's Sessions</p><p className="text-xl font-bold">{stats.todaySessions}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50"><BookOpen className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-xs text-muted-foreground">My Students</p><p className="text-xl font-bold">{stats.myStudents}</p></div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Today's Sessions</CardTitle></CardHeader>
        <CardContent>
          {!loaded ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : todaySessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sessions today</p>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{s.subject}</p>
                    <p className="text-sm text-muted-foreground">{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}{s.room && ` · ${s.room}`}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{s.session_students?.length ?? 0} students</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
