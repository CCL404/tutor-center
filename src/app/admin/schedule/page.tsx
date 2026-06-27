'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, subWeeks } from 'date-fns'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function AdminSchedule() {
  const supabase = createClient()
  const [sessions, setSessions] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])

  const load = async () => {
    const weekEnd = addDays(weekStart, 6)
    const dateStart = format(weekStart, 'yyyy-MM-dd')
    const dateEnd = format(weekEnd, 'yyyy-MM-dd')

    const [sessRes, teacherRes, studentRes] = await Promise.all([
      supabase
        .from('sessions')
        .select(`*, teacher:teachers(id, color, subjects, profile:profiles(name))`)
        .gte('date', dateStart)
        .lte('date', dateEnd)
        .order('date')
        .order('start_time'),
      supabase.from('teachers').select('*, profile:profiles(name)'),
      supabase.from('students').select('*, profile:profiles(name)'),
    ])

    setSessions(sessRes.data ?? [])
    setTeachers(teacherRes.data ?? [])
    setStudents(studentRes.data ?? [])
  }

  useEffect(() => { load() }, [weekStart])

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const data = {
      teacher_id: form.get('teacher_id') as string,
      subject: form.get('subject') as string,
      date: form.get('date') as string,
      start_time: form.get('start_time') as string,
      end_time: form.get('end_time') as string,
      room: form.get('room') as string || null,
      price_per_student: parseFloat(form.get('price') as string) || 0,
      is_recurring: form.get('is_recurring') === 'on',
      recur_day: form.get('is_recurring') === 'on'
        ? new Date(form.get('date') as string).getDay()
        : null,
    }

    if (editing) {
      const { error } = await supabase.from('sessions').update(data).eq('id', editing.id)
      if (error) { toast.error(error.message); return }
    } else {
      const { data: newSess, error } = await supabase.from('sessions').insert(data).select().single()
      if (error) { toast.error(error.message); return }

      // Add selected students
      if (selectedStudents.length > 0 && newSess) {
        const { error: ssError } = await supabase.from('session_students').insert(
          selectedStudents.map(sid => ({
            session_id: newSess.id,
            student_id: sid,
          }))
        )
        if (ssError) toast.error('Failed to link students: ' + ssError.message)
      }
    }

    toast.success(editing ? 'Updated' : 'Created')
    setOpen(false)
    setEditing(null)
    setSelectedStudents([])
    load()
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('sessions').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Deleted')
    load()
  }

  // Group by day
  const byDay = DAYS.map((_, i) => {
    const date = addDays(weekStart, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    return {
      label: DAYS[i],
      dateStr,
      sessions: sessions.filter((s) => s.date === dateStr),
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Schedule</h1>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[140px] text-center">
            {format(weekStart, 'M/d')} - {format(addDays(weekStart, 6), 'M/d')}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setSelectedStudents([]) } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />New Session</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Session' : 'New Session'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teacher_id">Teacher</Label>
                  <Select name="teacher_id" defaultValue={editing?.teacher_id}>
                    <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.profile?.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" name="subject" defaultValue={editing?.subject} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" defaultValue={editing?.date ?? format(weekStart, 'yyyy-MM-dd')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input id="start_time" name="start_time" type="time" defaultValue={editing?.start_time ?? '09:00'} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input id="end_time" name="end_time" type="time" defaultValue={editing?.end_time ?? '10:00'} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room">Room</Label>
                  <Input id="room" name="room" defaultValue={editing?.room ?? ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input id="price" name="price" type="number" defaultValue={editing?.price_per_student ?? 0} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_recurring" defaultChecked={editing?.is_recurring} />
                Repeat weekly
              </label>

              {!editing && (
                <div className="space-y-2">
                  <Label>Students (select multiple)</Label>
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                    {students.map((s) => (
                      <label key={s.id} className="flex items-center gap-1 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents([...selectedStudents, s.id])
                            } else {
                              setSelectedStudents(selectedStudents.filter(id => id !== s.id))
                            }
                          }}
                        />
                        {s.profile?.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-7">
        {byDay.map(({ label, dateStr, sessions: daySessions }) => (
          <div key={dateStr} className="space-y-2">
            <div className="text-center text-sm font-medium py-1 bg-muted rounded-md">
              {label}<br />
              <span className="text-muted-foreground text-xs">
                {format(new Date(dateStr + 'T00:00:00'), 'M/d')}
              </span>
            </div>
            <div className="space-y-2 min-h-[120px]">
              {daySessions.map((s: any) => (
                <div
                  key={s.id}
                  className="p-2 rounded-md border cursor-pointer hover:bg-accent text-xs space-y-1"
                  onClick={() => { setEditing(s); setOpen(true) }}
                >
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.teacher?.color ?? '#6366f1' }} />
                    <span className="font-medium">{s.start_time.slice(0, 5)}</span>
                  </div>
                  <p>{s.subject}</p>
                  <p className="text-muted-foreground">{s.teacher?.profile?.name}</p>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); remove(s.id) }}
                  >
                    Delete
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
