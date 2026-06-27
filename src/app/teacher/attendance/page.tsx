'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Check, X, RotateCcw } from 'lucide-react'
import { apiGet, getAccessToken, ANON_KEY, SUPABASE_URL } from '@/lib/supabase-api'

export default function TeacherAttendance() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [teacherId, setTeacherId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!profile) return
      const teachers = await apiGet(`teachers?select=id&user_id=eq.${profile.id}`)
      if (!teachers?.[0]) return
      setTeacherId(teachers[0].id)

      const today = format(new Date(), 'yyyy-MM-dd')
      const data = await apiGet(`sessions?select=*&teacher_id=eq.${teachers[0].id}&date=eq.${today}&order=start_time`)
      setSessions(data ?? [])
    }
    load()
  }, [profile])

  const loadStudents = async (sessionId: string) => {
    setSelectedSession(sessionId)
    const today = format(new Date(), 'yyyy-MM-dd')

    const ss = await apiGet(`session_students?select=student:students(id,notes,profile:profiles(name))&session_id=eq.${sessionId}`)
    const att = await apiGet(`attendance?select=*&session_id=eq.${sessionId}&date=eq.${today}`)

    setStudents(ss?.map((s: any) => s.student) ?? [])
    const attMap: Record<string, string> = {}
    att?.forEach((a: any) => { attMap[a.student_id] = a.status })
    setAttendance(attMap)
  }

  const setStatus = async (studentId: string, status: string) => {
    if (!selectedSession) return
    const today = format(new Date(), 'yyyy-MM-dd')
    const token = await getAccessToken()

    // Check if existing
    const existing = await apiGet(`attendance?select=id&session_id=eq.${selectedSession}&student_id=eq.${studentId}&date=eq.${today}`)

    if (existing?.[0]) {
      await fetch(`${SUPABASE_URL}/rest/v1/attendance?id=eq.${existing[0].id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/attendance`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: selectedSession, student_id: studentId, date: today, status }),
      })
    }

    setAttendance(prev => ({ ...prev, [studentId]: status }))
    toast.success('Attendance updated')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Take Attendance</h1>
        <p className="text-muted-foreground text-sm">{format(new Date(), 'yyyy/M/d')}</p>
      </div>
      {!teacherId && <Card><CardContent className="p-6 text-center text-muted-foreground">Teacher profile not set up yet. Please contact admin.</CardContent></Card>}
      {sessions.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No sessions today</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {sessions.map((s: any) => (
            <Card key={s.id} className={`cursor-pointer transition-colors ${selectedSession === s.id ? 'ring-2 ring-primary' : ''}`} onClick={() => loadStudents(s.id)}>
              <CardContent className="p-4">
                <p className="font-medium">{s.subject}</p>
                <p className="text-sm text-muted-foreground">{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}{s.room && ` · ${s.room}`}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {selectedSession && students.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Student Attendance</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {students.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="font-medium text-sm">{s.profile?.name}</span>
                  <div className="flex gap-1">
                    {['present', 'absent', 'makeup'].map((status) => (
                      <Button key={status} size="sm" variant={attendance[s.id] === status ? 'default' : 'outline'}
                        className={`h-8 w-8 p-0`}
                        onClick={() => setStatus(s.id, status)}
                        title={status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : 'Make-up'}>
                        {status === 'present' ? <Check className="h-4 w-4" /> : status === 'absent' ? <X className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
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
