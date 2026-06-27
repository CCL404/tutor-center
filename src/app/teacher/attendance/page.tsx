'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Check, X, RotateCcw } from 'lucide-react'

export default function TeacherAttendance() {
  const { profile } = useAuth()
  const supabase = createClient()
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [teacherId, setTeacherId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!profile) return
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', profile.id)
        .single()
      if (!teacher) return
      setTeacherId(teacher.id)

      const today = format(new Date(), 'yyyy-MM-dd')
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('teacher_id', teacher.id)
        .eq('date', today)
        .order('start_time')

      setSessions(data ?? [])
    }
    load()
  }, [profile, supabase])

  const loadStudents = async (sessionId: string) => {
    setSelectedSession(sessionId)
    const today = format(new Date(), 'yyyy-MM-dd')

    // Get session students
    const { data: ss } = await supabase
      .from('session_students')
      .select('student:students(id, notes, profile:profiles(name))')
      .eq('session_id', sessionId)

    // Get existing attendance
    const { data: att } = await supabase
      .from('attendance')
      .select('*')
      .eq('session_id', sessionId)
      .eq('date', today)

    const stuList = ss?.map(s => (s.student as any)) ?? []
    setStudents(stuList)

    const attMap: Record<string, string> = {}
    att?.forEach((a) => {
      attMap[a.student_id] = a.status
    })
    setAttendance(attMap)
  }

  const setStatus = async (studentId: string, status: string) => {
    if (!selectedSession) return
    const today = format(new Date(), 'yyyy-MM-dd')

    const existing = await supabase
      .from('attendance')
      .select('id')
      .eq('session_id', selectedSession)
      .eq('student_id', studentId)
      .eq('date', today)
      .single()

    if (existing.data) {
      await supabase
        .from('attendance')
        .update({ status })
        .eq('id', existing.data.id)
    } else {
      await supabase
        .from('attendance')
        .insert({
          session_id: selectedSession,
          student_id: studentId,
          date: today,
          status,
        })
    }

    setAttendance(prev => ({ ...prev, [studentId]: status }))
    toast.success('已更新出席狀態')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <Check className="h-4 w-4 text-green-600" />
      case 'absent': return <X className="h-4 w-4 text-red-600" />
      case 'makeup': return <RotateCcw className="h-4 w-4 text-blue-600" />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Take Attendance</h1>
        <p className="text-muted-foreground text-sm">
          {format(new Date(), 'yyyy年M月d日')}
        </p>
      </div>

      {!teacherId && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            尚未分配老師資料
          </CardContent>
        </Card>
      )}

      {/* Session selection */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            今日沒有課堂需要標記出席
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {sessions.map((s) => (
            <Card
              key={s.id}
              className={`cursor-pointer transition-colors ${
                selectedSession === s.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => loadStudents(s.id)}
            >
              <CardContent className="p-4">
                <p className="font-medium">{s.subject}</p>
                <p className="text-sm text-muted-foreground">
                  {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                  {s.room && ` · ${s.room}`}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Student attendance grid */}
      {selectedSession && students.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">學生出席</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {students.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="font-medium text-sm">{s.profile?.name}</span>
                  <div className="flex gap-1">
                    {['present', 'absent', 'makeup'].map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={attendance[s.id] === status ? 'default' : 'outline'}
                        className={`h-8 w-8 p-0 ${
                          status === 'present'
                            ? 'data-[variant=default]:bg-green-600'
                            : status === 'absent'
                            ? 'data-[variant=default]:bg-red-600'
                            : 'data-[variant=default]:bg-blue-600'
                        }`}
                        onClick={() => setStatus(s.id, status)}
                        title={
                          status === 'present' ? '出席' :
                          status === 'absent' ? '缺席' : '補課'
                        }
                      >
                        {status === 'present' ? <Check className="h-4 w-4" /> :
                         status === 'absent' ? <X className="h-4 w-4" /> :
                         <RotateCcw className="h-4 w-4" />}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
