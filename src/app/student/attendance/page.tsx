'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

export default function StudentAttendance() {
  const { profile } = useAuth()
  const supabase = createClient()
  const [records, setRecords] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      if (!profile) return
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', profile.id)
        .single()
      if (!student) return

      const { data } = await supabase
        .from('attendance')
        .select(`
          *,
          session:sessions(subject, start_time, end_time, teacher:teachers(profile:profiles(name)))
        `)
        .eq('student_id', student.id)
        .order('date', { ascending: false })

      setRecords(data ?? [])
    }
    load()
  }, [profile, supabase])

  const statusLabel: Record<string, { label: string; color: string }> = {
    present: { label: '出席', color: 'bg-green-100 text-green-800' },
    absent: { label: '缺席', color: 'bg-red-100 text-red-800' },
    makeup: { label: '補課', color: 'bg-blue-100 text-blue-800' },
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Attendance Records</h1>

      {records.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            暫無Attendance Records
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((r) => {
            const st = statusLabel[r.status] ?? { label: r.status, color: 'bg-gray-100' }
            return (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.session?.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.date} {r.session?.start_time?.slice(0, 5)}
                      {r.session?.teacher?.profile?.name && ` · ${r.session.teacher.profile.name}`}
                    </p>
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
