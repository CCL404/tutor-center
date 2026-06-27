'use client'

import { useEffect, useState } from 'react'
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
import { toast } from 'sonner'
import { Plus, Search } from 'lucide-react'
import { apiGet, apiPatch, ANON_KEY, SUPABASE_URL } from '@/lib/supabase-api'
import { getAccessToken } from '@/lib/supabase-api'

export default function AdminStudents() {
  const [students, setStudents] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<any | null>(null)
  const [open, setOpen] = useState(false)

  const load = async () => {
    let path = 'students?select=*,profile:profiles(name,email,phone),parent:profiles!students_parent_id_fkey(name,email)&order=created_at.desc'
    if (search) {
      path += `&profile.name=ilike.*${search}*&profile.email=ilike.*${search}*`
    }
    const data = await apiGet(path)
    setStudents(data ?? [])
  }

  useEffect(() => { load() }, [search])

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const ok = await apiPatch(`students?id=eq.${editing.id}`, { notes: form.get('notes') as string })
    if (!ok) { toast.error('Update failed'); return }
    toast.success('Updated')
    setOpen(false)
    setEditing(null)
    load()
  }

  const addStudent = async () => {
    // Open dialog to create user + student
    const name = prompt('Student name:')
    if (!name) return
    const email = prompt('Student email:')
    if (!email) return
    const password = prompt('Temporary password (min 8 chars):')
    if (!password || password.length < 8) { toast.error('Password must be at least 8 characters'); return }

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role: 'student' }),
    })
    const result = await res.json()
    if (!res.ok) { toast.error(result.error || 'Failed'); return }
    toast.success('Student created')
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold shrink-0">Students</h1>
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button size="sm" onClick={addStudent}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {students.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="font-medium">{s.profile?.name ?? 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">{s.profile?.email}</p>
              </div>
              {s.profile?.phone && (
                <p className="text-xs text-muted-foreground">Phone: {s.profile.phone}</p>
              )}
              {s.parent && (
                <p className="text-xs text-muted-foreground">
                  Parent: {s.parent.name} ({s.parent.email})
                </p>
              )}
              {s.notes && (
                <p className="text-xs text-muted-foreground italic">Notes: {s.notes}</p>
              )}
              <Button variant="outline" size="sm" onClick={() => { setEditing(s); setOpen(true) }}>
                Edit Notes
              </Button>
            </CardContent>
          </Card>
        ))}
        {students.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-6 text-center text-muted-foreground">
              {search ? 'No results' : 'No students yet'}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student Notes</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <p className="text-sm">{editing?.profile?.name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" defaultValue={editing?.notes ?? ''} placeholder="Special needs, notes..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
