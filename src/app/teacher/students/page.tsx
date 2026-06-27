'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent } from '@/components/ui/card'

export default function TeacherStudents() {
  const { profile } = useAuth()
  const supabase = createClient()
  const [students, setStudents] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      if (!profile) return
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', profile.id)
        .single()

      if (!teacher) return

      // Get sessions of this teacher
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('teacher_id', teacher.id)

      if (!sessions?.length) return

      const sessionIds = sessions.map((s) => s.id)

      // Get students from those sessions
      const { data: ss } = await supabase
        .from('session_students')
        .select('student:students(id, notes, profile:profiles(name, email, phone))')
        .in('session_id', sessionIds)

      // Deduplicate
      const seen = new Set<string>()
      const unique = (ss ?? [])
        .map(s => s.student)
        .filter((s: any) => {
          if (seen.has(s.id)) return false
          seen.add(s.id)
          return true
        })

      setStudents(unique as any[])
    }
    load()
  }, [profile, supabase])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Students</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {students.map((s: any) => (
          <Card key={s.id}>
            <CardContent className="p-4 space-y-2">
              <p className="font-medium">{s.profile?.name ?? '未知'}</p>
              <p className="text-xs text-muted-foreground">{s.profile?.email}</p>
              {s.profile?.phone && (
                <p className="text-xs text-muted-foreground">Phone：{s.profile.phone}</p>
              )}
              {s.notes && (
                <p className="text-xs text-muted-foreground italic">Notes：{s.notes}</p>
              )}
            </CardContent>
          </Card>
        ))}
        {students.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-6 text-center text-muted-foreground">
              No students yet
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
