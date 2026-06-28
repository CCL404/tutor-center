'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'
import { apiGet, getAccessToken, ANON_KEY, SUPABASE_URL } from '@/lib/supabase-api'
import { useAuth } from '@/contexts/auth-context'

export default function TeacherSchedule() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState<any[]>([])
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [currentTeacher, setCurrentTeacher] = useState<any | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [studentSearch, setStudentSearch] = useState('')

  const filteredStudents = students.filter((s: any) =>
    !studentSearch || s.profile?.name?.toLowerCase().includes(studentSearch.toLowerCase())
  )

  const load = async () => {
    const dateStart = format(weekStart, 'yyyy-MM-dd')
    const dateEnd = format(addDays(weekStart, 6), 'yyyy-MM-dd')

    // Get current teacher's ID and info
    if (!teacherId && profile) {
      const tData = await apiGet(`teachers?select=id,color,subjects,profile:profiles(name)&user_id=eq.${profile.id}`)
      if (tData?.[0]) {
        setTeacherId(tData[0].id)
        setCurrentTeacher(tData[0])
      }
    }

    const [sessData, stuRes] = await Promise.all([
      apiGet(`sessions?select=*,session_students(student_id),teacher:teachers(id,color,subjects,profile:profiles(name))&date=gte.${dateStart}&date=lte.${dateEnd}&order=date&order=start_time`),
      fetch('/api/admin/students').then(r => r.json()),
    ])

    setSessions(sessData ?? [])
    setStudents(stuRes?.students ?? [])
  }

  useEffect(() => { load() }, [weekStart, profile])

  const openEdit = async (s: any) => {
    setEditing(s)
    // Load current students for this session
    const ssData = await apiGet(`session_students?select=student_id&session_id=eq.${s.id}`)
    setSelectedStudents((ssData ?? []).map((ss: any) => ss.student_id))
    setStudentSearch('')
    setOpen(true)
  }

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const data = {
      teacher_id: teacherId || editing?.teacher_id,
      subject: form.get('subject') as string,
      date: form.get('date') as string,
      start_time: form.get('start_time') as string,
      end_time: form.get('end_time') as string,
    }

    const token = await getAccessToken()

    if (editing) {
      // Update session
      const res = await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      })
      if (!res.ok) { toast.error('Update failed'); return }

      // Replace session_students: delete all then insert new
      await fetch(`${SUPABASE_URL}/rest/v1/session_students?session_id=eq.${editing.id}`, {
        method: 'DELETE', headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
      })
      if (selectedStudents.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/session_students`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${token}` },
          body: JSON.stringify(selectedStudents.map((sid: string) => ({ session_id: editing.id, student_id: sid }))),
        })
      }
    } else {
      // Create session
      const res = await fetch(`${SUPABASE_URL}/rest/v1/sessions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${token}`, Prefer: 'return=representation' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { toast.error('Create failed'); return }
      const newSessions = await res.json()
      if (selectedStudents.length > 0 && newSessions?.[0]) {
        await fetch(`${SUPABASE_URL}/rest/v1/session_students`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${token}` },
          body: JSON.stringify(selectedStudents.map((sid: string) => ({ session_id: newSessions[0].id, student_id: sid }))),
        })
      }
    }

    toast.success(editing ? 'Updated' : 'Created')
    setOpen(false)
    setEditing(null)
    setSelectedStudents([])
    load()
  }

  const remove = async (id: string) => {
    const token = await getAccessToken()
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${id}`, {
      method: 'DELETE', headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
    })
    if (!res.ok) { toast.error('Delete failed'); return }
    toast.success('Deleted')
    load()
  }

  // Build student name map
  const studentMap: Record<string, string> = {}
  students.forEach((s: any) => { if (s.profile?.name) studentMap[s.id] = s.profile.name })

  const byDay = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    return { label: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i], dateStr: format(date, 'yyyy-MM-dd'), sessions: sessions.filter(s => s.date === format(date, 'yyyy-MM-dd')) }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Schedule</h1>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm text-muted-foreground min-w-[140px] text-center">{format(weekStart, 'M/d')} - {format(addDays(weekStart, 6), 'M/d')}</span>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setSelectedStudents([]); setStudentSearch('') } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New Session</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Edit Session' : 'New Session'}</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teacher</Label>
                  <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                    <span className="w-2 h-2 rounded-full shrink-0 mr-2" style={{ backgroundColor: editing?.teacher?.color || currentTeacher?.color || '#6366f1' }} />
                    {editing?.teacher?.profile?.name || currentTeacher?.profile?.name || 'Loading...'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" name="subject" defaultValue={editing?.subject} required />
                </div>
              </div>
              <div className="space-y-2"><Label htmlFor="date">Date</Label><Input id="date" name="date" type="date" defaultValue={editing?.date ?? format(weekStart, 'yyyy-MM-dd')} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="start_time">Start Time</Label><Input id="start_time" name="start_time" type="time" defaultValue={editing?.start_time ?? '09:00'} /></div>
                <div className="space-y-2"><Label htmlFor="end_time">End Time</Label><Input id="end_time" name="end_time" type="time" defaultValue={editing?.end_time ?? '10:00'} /></div>
              </div>
              <div className="space-y-2">
                <Label>Students (select multiple)</Label>
                <Input placeholder="Search students..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="mb-2" />
                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                  {filteredStudents.map((s: any) => (
                    <label key={s.id} className="flex items-center gap-1 text-sm cursor-pointer">
                      <input type="checkbox" checked={selectedStudents.includes(s.id)}
                        onChange={(e) => e.target.checked ? setSelectedStudents([...selectedStudents, s.id]) : setSelectedStudents(selectedStudents.filter((id: string) => id !== s.id))} />
                      {s.profile?.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-3 md:grid-cols-7">
        {byDay.map(({ label, dateStr, sessions: daySessions }) => (
          <div key={dateStr} className="space-y-2">
            <div className="text-center text-sm font-medium py-1 bg-muted rounded-md">{label}<br /><span className="text-muted-foreground text-xs">{format(new Date(dateStr + 'T00:00:00'), 'M/d')}</span></div>
            <div className="space-y-2 min-h-[120px]">
              {daySessions.map((s: any) => (
                <div key={s.id} className="p-2 rounded-md border cursor-pointer hover:bg-accent text-xs space-y-1" onClick={() => openEdit(s)}>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.teacher?.color ?? '#6366f1' }} />
                    <span className="font-medium">{s.start_time?.slice(0, 5)}</span>
                  </div>
                  <p className="font-medium">{s.subject}</p>
                  <p className="text-muted-foreground">{s.teacher?.profile?.name}</p>
                  <p className="text-muted-foreground">
                    {(s.session_students ?? []).map((ss: any) => studentMap[ss.student_id]).filter(Boolean).join(', ')}
                  </p>
                  <Badge variant="outline" className="text-[10px] px-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); remove(s.id) }}>Delete</Badge>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
