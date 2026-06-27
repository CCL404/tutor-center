'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { getAccessToken } from '@/lib/supabase-api'

export default function TeacherStudents() {
  const { profile } = useAuth()
  const [students, setStudents] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      if (!profile?.id) return
      const token = await getAccessToken()

      const res = await fetch(`/api/teacher/students?userId=${profile.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setStudents(data.students ?? [])
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
        {students.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-6 text-center text-muted-foreground">No students yet</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
