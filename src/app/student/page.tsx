'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiGet } from '@/lib/supabase-api'

export default function StudentDashboard() {
  const { profile } = useAuth()
  const [upcoming, setUpcoming] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      if (!profile) return
      const students = await apiGet(`students?select=id&user_id=eq.${profile.id}`)
      if (!students?.[0]) return

      const now = new Date()
      const today = now.toISOString().slice(0, 10)
      const time = now.toTimeString().slice(0, 5)

      const sessionIds = await apiGet(`session_students?select=session_id&student_id=eq.${students[0].id}`)
      if (!sessionIds?.length) return

      const ids = sessionIds.map((s: any) => s.session_id)
      const sessions = await apiGet(`sessions?select=*,teacher:teachers(id,color,subjects,profile:profiles(name))&in=id&id=in.(${ids.join(',')})&or=(date.gt.${today},and(date.eq.${today},start_time.gte.${time}))&order=date&order=start_time&limit=10`)

      setUpcoming(sessions ?? [])
    }
    load()
  }, [profile])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Schedule</h1>
        <p className="text-muted-foreground text-sm">Upcoming sessions</p>
      </div>
      {upcoming.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No upcoming sessions</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {upcoming.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="text-xs">{s.subject}</Badge>
                  {s.room && <span className="text-xs text-muted-foreground">{s.room}</span>}
                </div>
                <p className="text-lg font-bold">{s.date?.slice(0, 10)}</p>
                <p className="text-sm text-muted-foreground">{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}</p>
                <p className="text-sm">Teacher: {s.teacher?.profile?.name ?? 'Unassigned'}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
