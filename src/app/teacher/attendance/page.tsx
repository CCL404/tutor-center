'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Check, X } from 'lucide-react'
import { apiGet, getAccessToken, ANON_KEY, SUPABASE_URL } from '@/lib/supabase-api'

export default function TeacherAttendance() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!profile) { setLoaded(true); return }
      setLoaded(false)
      const teachers = await apiGet(`teachers?select=id&user_id=eq.${profile.id}`)
      if (!teachers?.[0]) { setLoaded(true); return }
      setTeacherId(teachers[0].id)

      const data = await apiGet(`sessions?select=*,teacher:teachers(id,color,subjects,profile:profiles(name))&teacher_id=eq.${teachers[0].id}&date=eq.${date}&order=start_time`)
      setSessions(data ?? [])
      setSelectedSession(null)
      setStudents([])
      setAttendance({})
      setLoaded(true)
    }
    load()
  }, [profile, date])

  const loadStudents = async (session: any) => {
    setSelectedSession(session)
    setStudents([])
    setAttendance({})

    // Get enrolled students via API
    const stuRes = await fetch(`/api/attendance/session-students?sessionId=${session.id}`)
    const stuData = await stuRes.json()
    setStudents(stuData.students ?? [])

    // Get existing attendance records for this session + date
    const att = await apiGet(`attendance?select=*&session_id=eq.${session.id}&date=eq.${date}`)
    const attMap: Record<string, string> = {}
    att?.forEach((a: any) => { attMap[a.student_id] = a.status })
    setAttendance(attMap)
  }

  const setStatus = async (studentId: string, status: string) => {
    if (!selectedSession) return
    const token = await getAccessToken()

    const existing = await apiGet(`attendance?select=id&session_id=eq.${selectedSession.id}&student_id=eq.${studentId}&date=eq.${date}`)

    if (existing?.[0]) {
      await fetch(`${SUPABASE_URL}/rest/v1/attendance?id=eq.${existing[0].id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/attendance`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: selectedSession.id, student_id: studentId, date, status }),
      })
    }

    setAttendance(prev => ({ ...prev, [studentId]: status }))
    toast.success(`Marked ${status}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
      </div>

      {!teacherId && <Card><CardContent className="p-6 text-center text-muted-foreground">Teacher profile not set up. Please contact admin.</CardContent></Card>}

      {!loaded ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : sessions.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No sessions on this date</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {sessions.map((s: any) => (
            <Card key={s.id} className={`cursor-pointer transition-colors ${selectedSession?.id === s.id ? 'ring-2 ring-primary' : ''}`} onClick={() => loadStudents(s)}>
              <CardContent className="p-4 space-y-1">
                <p className="font-medium">{s.subject}</p>
                <p className="text-sm text-muted-foreground">{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}</p>
                <p className="text-xs text-muted-foreground">{s.teacher?.profile?.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedSession && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedSession.subject} — {selectedSession.start_time?.slice(0, 5)} ~ {selectedSession.end_time?.slice(0, 5)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-muted-foreground text-sm">No students enrolled in this session</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {students.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="font-medium text-sm">{s.profile?.name ?? 'Unknown'}</span>
                    <div className="flex gap-1">
                      {(['present', 'absent'] as const).map((status) => (
                        <Button key={status} size="sm"
                          variant={attendance[s.id] === status ? 'default' : 'outline'}
                          className={`h-8 w-8 p-0 ${attendance[s.id] === status
                            ? status === 'present' ? 'bg-green-600 hover:bg-green-700'
                              : status === 'absent' ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-amber-600 hover:bg-amber-700'
                            : ''
                          }`}
                          onClick={() => setStatus(s.id, status)}
                          title={status === 'present' ? 'Present' : 'Absent'}>
                          {status === 'present' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
