'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { format, startOfWeek, addDays } from 'date-fns'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function TeacherDashboard() {
  const { profile } = useAuth()
  const supabase = createClient()
  const [sessions, setSessions] = useState<any[]>([])
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })

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

      const weekEnd = addDays(weekStart, 6)
      const { data } = await supabase
        .from('sessions')
        .select(`
          *,
          session_students(
            student:students(id, notes, profile:profiles(name))
          )
        `)
        .eq('teacher_id', teacher.id)
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'))
        .order('date')
        .order('start_time')

      setSessions(data ?? [])
    }
    load()
  }, [profile, supabase, weekStart])

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!teacherId) return
    const form = new FormData(e.currentTarget)
    const data = {
      teacher_id: teacherId,
      subject: form.get('subject') as string,
      date: form.get('date') as string,
      start_time: form.get('start_time') as string,
      end_time: form.get('end_time') as string,
      room: form.get('room') as string || null,
      price_per_student: 0,
    }

    const { error } = await supabase.from('sessions').insert(data)
    if (error) { toast.error(error.message); return }
    toast.success('Session created')
    setOpen(false)
    // Reload sessions
    const weekEnd = addDays(weekStart, 6)
    const { data: refreshed } = await supabase
      .from('sessions')
      .select(`
        *,
        session_students(
          student:students(id, notes, profile:profiles(name))
        )
      `)
      .eq('teacher_id', teacherId)
      .gte('date', format(weekStart, 'yyyy-MM-dd'))
      .lte('date', format(weekEnd, 'yyyy-MM-dd'))
      .order('date')
      .order('start_time')
    setSessions(refreshed ?? [])
  }

  // Group by day
  const byDay = DAYS.map((_, i) => {
    const date = addDays(weekStart, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    return {
      day: DAYS[i],
      date,
      dateStr,
      sessions: sessions.filter((s) => s.date === dateStr),
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Schedule</h1>
          <p className="text-muted-foreground text-sm">
            {format(weekStart, 'M/d')} - {format(addDays(weekStart, 6), 'M/d')}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />New Session</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Session</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input id="start_time" name="start_time" type="time" defaultValue="09:00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input id="end_time" name="end_time" type="time" defaultValue="10:00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="room">Room</Label>
                <Input id="room" name="room" placeholder="e.g. Room 101" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!teacherId && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Teacher profile not set up yet. Please contact admin.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-7">
        {byDay.map(({ day, date, dateStr, sessions }) => (
          <Card key={dateStr} className="min-h-[200px]">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-sm text-center">
                <span className="text-muted-foreground">{day}</span>
                <br />
                <span className="text-lg">{format(date, 'd')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-2">
              {sessions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">—</p>
              ) : (
                sessions.map((s: any) => (
                  <div
                    key={s.id}
                    className="p-2 rounded-md border text-xs space-y-1 cursor-pointer hover:bg-accent"
                  >
                    <p className="font-medium">
                      {s.start_time.slice(0, 5)}
                    </p>
                    <p>{s.subject}</p>
                    {s.room && (
                      <Badge variant="outline" className="text-[10px] px-1">
                        {s.room}
                      </Badge>
                    )}
                    <p className="text-muted-foreground">
                      {s.session_students?.length ?? 0} students
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
