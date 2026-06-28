'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Check, X, Save, RotateCcw } from 'lucide-react'
import { apiGet, getAccessToken, ANON_KEY, SUPABASE_URL } from '@/lib/supabase-api'

export default function TeacherAttendance() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<any | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!profile) { setLoaded(true); return }
      setLoaded(false)
      const start = Date.now()
      const teachers = await apiGet(`teachers?select=id&user_id=eq.${profile.id}`)
      if (!teachers?.[0]) { setLoaded(true); return }
      setTeacherId(teachers[0].id)

      const data = await apiGet(`sessions?select=*,teacher:teachers(id,color,subjects,profile:profiles(name))&teacher_id=eq.${teachers[0].id}&date=eq.${date}&order=start_time`)
      setSessions(data ?? [])
      setSelectedSession(null)
      setStudents([])
      setAttendance({})
      setDirty(new Set())
      const elapsed = Date.now() - start
      if (elapsed < 200) await new Promise(r => setTimeout(r, 200 - elapsed))
      setLoaded(true)
    }
    load()
  }, [profile, date])

  const loadStudents = async (session: any) => {
    setSelectedSession(session)
    setStudents([])
    setAttendance({})
    setDirty(new Set())
    setStudentsLoading(true)

    const stuRes = await fetch(`/api/attendance/session-students?sessionId=${session.id}`)
    const stuData = await stuRes.json()
    setStudents(stuData.students ?? [])

    const att = await apiGet(`attendance?select=*&session_id=eq.${session.id}&date=eq.${date}`)
    const attMap: Record<string, string> = {}
    att?.forEach((a: any) => { attMap[a.student_id] = a.status })
    setAttendance(attMap)
    setStudentsLoading(false)
  }
  }

  const setStatusLocal = async (studentId: string, status: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }))
    setDirty(prev => new Set(prev).add(studentId))
  }

  const saveAll = async () => {
    if (!selectedSession || dirty.size === 0) return
    setSaving(true)
    const token = await getAccessToken()
    let errors = 0

    for (const studentId of dirty) {
      const status = attendance[studentId]
      if (!status) continue

      const existing = await apiGet(`attendance?select=id&session_id=eq.${selectedSession.id}&student_id=eq.${studentId}&date=eq.${date}`)
      const baseHeaders = { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${token}` }

      if (existing?.[0]) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/attendance?id=eq.${existing[0].id}`, {
          method: 'PATCH', headers: baseHeaders, body: JSON.stringify({ status }),
        })
        if (!res.ok) errors++
      } else {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/attendance`, {
          method: 'POST', headers: baseHeaders,
          body: JSON.stringify({ session_id: selectedSession.id, student_id: studentId, date, status }),
        })
        if (!res.ok) errors++
      }
    }

    if (errors > 0) toast.error(`${errors} update(s) failed`)
    else toast.success(`Saved ${dirty.size} change(s)`)
    setDirty(new Set())
    setSaving(false)
  }

  const statusLabel: Record<string, { label: string; icon: React.ReactNode; activeClass: string }> = {
    present: { label: 'Present', icon: <Check className="h-4 w-4" />, activeClass: 'bg-green-600 hover:bg-green-700 text-white' },
    absent: { label: 'Absent', icon: <X className="h-4 w-4" />, activeClass: 'bg-red-600 hover:bg-red-700 text-white' },
    pending: { label: 'Pending', icon: <span className="text-xs font-bold">—</span>, activeClass: 'bg-amber-600 hover:bg-amber-700 text-white' },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">Select a session card below to mark attendance</p>
        </div>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
      </div>

      {!teacherId && <Card><CardContent className="p-6 text-center text-muted-foreground">Teacher profile not set up. Please contact admin.</CardContent></Card>}

      {!loaded ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : sessions.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No sessions on this date</CardContent></Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground/60 -mt-3">Click a session to manage attendance</p>
          <div className="grid gap-3 md:grid-cols-3">
            {sessions.map((s: any) => (
              <Card key={s.id} className={`cursor-pointer transition-all duration-150 card-hover ${selectedSession?.id === s.id && studentsLoading ? 'opacity-60' : ''} ${selectedSession?.id === s.id && !studentsLoading ? 'ring-2 ring-primary shadow-md' : ''}`} onClick={() => !studentsLoading && loadStudents(s)}>
                <CardContent className="p-4 space-y-1">
                  <p className="font-medium">{s.subject}</p>
                  <p className="text-sm text-muted-foreground">{s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}</p>
                  <p className="text-xs text-muted-foreground">{s.teacher?.profile?.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {selectedSession && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {selectedSession.subject} — {selectedSession.start_time?.slice(0, 5)} ~ {selectedSession.end_time?.slice(0, 5)}
              </CardTitle>
              {dirty.size > 0 && <p className="text-xs text-amber-600 mt-1">{dirty.size} unsaved change(s)</p>}
            </div>
            <div className="flex gap-2">
              {dirty.size > 0 && (
                <Button size="sm" variant="outline" onClick={() => { setAttendance({}); loadStudents(selectedSession) }}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />Reset
                </Button>
              )}
              <Button size="sm" onClick={saveAll} disabled={saving || dirty.size === 0}>
                <Save className="h-3.5 w-3.5 mr-1" />{saving ? 'Saving...' : `Save (${dirty.size})`}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {studentsLoading ? (
              <div className="text-center text-muted-foreground text-sm py-4">
                <span className="inline-block animate-pulse">Loading students...</span>
              </div>
            ) : students.length === 0 ? (
              <p className="text-muted-foreground text-sm">No students enrolled in this session</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {students.map((s: any) => (
                  <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${dirty.has(s.id) ? 'border-amber-300 bg-amber-50/50' : ''}`}>
                    <span className="font-medium text-sm">{s.profile?.name ?? 'Unknown'}</span>
                    <div className="flex gap-1">
                      {(['present', 'absent', 'pending'] as const).map((status) => {
                        const active = attendance[s.id] === status
                        return (
                          <Button key={status} size="sm"
                            variant={active ? 'default' : 'outline'}
                            className={`h-8 w-8 p-0 ${active ? statusLabel[status].activeClass : ''}`}
                            onClick={() => setStatusLocal(s.id, status)}
                            title={statusLabel[status].label}>
                            {statusLabel[status].icon}
                          </Button>
                        )
                      })}
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
