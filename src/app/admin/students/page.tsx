'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Search } from 'lucide-react'

export default function AdminStudents() {
  const [students, setStudents] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<any | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const res = await fetch('/api/admin/students')
    const data = await res.json()
    const all = data.students ?? []

    if (search) {
      const q = search.toLowerCase()
      setStudents(all.filter((s: any) =>
        s.profile?.name?.toLowerCase().includes(q) ||
        s.profile?.email?.toLowerCase().includes(q)
      ))
    } else {
      setStudents(all)
    }
  }

  useEffect(() => { load() }, [search])

  const addStudent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const email = form.get('email') as string
    const password = form.get('password') as string
    const name = form.get('name') as string

    if (!email || !password) {
      toast.error('Email and password are required')
      setSaving(false)
      return
    }

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, role: 'student' }),
    })
    const result = await res.json()
    if (!res.ok) { toast.error(result.error || 'Failed'); setSaving(false); return }
    toast.success('Student created')
    setAddOpen(false)
    setSaving(false)
    load()
  }

  const saveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const res = await fetch('/api/admin/update-student', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: editing.id,
        userId: editing.user_id,
        name: form.get('name') as string,
        email: form.get('email') as string,
        phone: form.get('phone') as string || null,
        notes: form.get('notes') as string || null,
      }),
    })
    const result = await res.json()
    if (!res.ok) { toast.error(result.error || 'Update failed'); setSaving(false); return }
    toast.success('Student updated')
    setEditOpen(false)
    setEditing(null)
    setSaving(false)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold shrink-0">Students</h1>
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Student</DialogTitle></DialogHeader>
              <form onSubmit={addStudent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required placeholder="student@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input id="password" name="password" type="text" required placeholder="Set a temporary password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input id="name" name="name" placeholder="e.g. Alex Wang" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {students.map((s) => {
          return (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="font-medium">{s.profile?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{s.profile?.email}</p>
                </div>
                {s.profile?.phone && <p className="text-xs text-muted-foreground">Phone: {s.profile.phone}</p>}
                {s.notes && <p className="text-xs text-muted-foreground italic">Notes: {s.notes}</p>}
                <Button variant="outline" size="sm" onClick={() => { setEditing(s); setEditOpen(true) }}>Edit</Button>
              </CardContent>
            </Card>
          )
        })}
        {students.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-6 text-center text-muted-foreground">
              {search ? 'No results' : 'No students yet'}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Student — {editing?.profile?.name}</DialogTitle></DialogHeader>
          <form onSubmit={saveEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" name="name" defaultValue={editing?.profile?.name ?? ''} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" name="email" type="email" defaultValue={editing?.profile?.email ?? ''} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input id="edit-phone" name="phone" type="tel" defaultValue={editing?.profile?.phone ?? ''} placeholder="+61 4XX XXX XXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Input id="edit-notes" name="notes" defaultValue={editing?.notes ?? ''} placeholder="Special needs, notes..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
