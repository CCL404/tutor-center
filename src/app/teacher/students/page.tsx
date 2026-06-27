'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { apiGet } from '@/lib/supabase-api'

export default function TeacherStudents() {
  const { profile } = useAuth()
  const [students, setStudents] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      if (!profile) return
      const teachers = await apiGet(`teachers?select=id&user_id=eq.${profile.id}`)
      if (!teachers?.[0]) return

      const sessions = await apiGet(`sessions?select=id&teacher_id=eq.${teachers[0].id}`)
      if (!sessions?.length) return

      const sessionIds = sessions.map((s: any) => s.id)
      const ss = await apiGet(`session_students?select=student:students(id,notes,profile:profiles(name,email,phone))&in=session_id&session_id=in.(${sessionIds.join(',')})`)

      const seen = new Set<string>()
      const unique = (ss ?? []).map((s: any) => s.student).filter((s: any) => { if (seen.has(s.id)) return false; seen.add(s.id); return true })
      setStudents(unique as any[])
    }
    load()
  }, [profile])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Students</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {students.map((s: any) => (
          <Card key={s.id}>
            <CardContent className="p-4 space-y-2">
              <p className="font-medium">{s.profile?.name ?? 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">{s.profile?.email}</p>
              {s.profile?.phone && <p className="text-xs text-muted-foreground">Phone: {s.profile.phone}</p>}
              {s.notes && <p className="text-xs text-muted-foreground italic">Notes: {s.notes}</p>}
            </CardContent>
          </Card>
        ))}
        {students.length === 0 && <Card className="col-span-full"><CardContent className="p-6 text-center text-muted-foreground">No students yet</CardContent></Card>}
      </div>
    </div>
  )
}
