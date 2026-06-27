'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { apiGet } from '@/lib/supabase-api'

export default function StudentAttendance() {
  const { profile } = useAuth()
  const [records, setRecords] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      if (!profile) return
      const student = await apiGet(`students?select=id&user_id=eq.${profile.id}`)
      if (!student?.[0]) return

      const data = await apiGet(`attendance?select=*,session:sessions(subject,start_time,end_time,teacher:teachers(profile:profiles(name)))&student_id=eq.${student[0].id}&order=date.desc`)
      setRecords(data ?? [])
    }
    load()
  }, [profile])

  const statusLabel: Record<string, { label: string; color: string }> = {
    present: { label: 'Present', color: 'bg-green-100 text-green-800' },
    absent: { label: 'Absent', color: 'bg-red-100 text-red-800' },
    makeup: { label: 'Make-up', color: 'bg-blue-100 text-blue-800' },
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Attendance Records</h1>
      {records.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No attendance records</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {records.map((r: any) => {
            const st = statusLabel[r.status] ?? { label: r.status, color: 'bg-gray-100' }
            return (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.session?.subject}</p>
                    <p className="text-sm text-muted-foreground">{r.date} {r.session?.start_time?.slice(0, 5)}{r.session?.teacher?.profile?.name && ` · ${r.session.teacher.profile.name}`}</p>
                  </div>
                  <Badge className={st.color}>{st.label}</Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
