'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import { apiGet } from '@/lib/supabase-api'

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<any[]>([])
  const [editing, setEditing] = useState<any | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState('')

  const load = async () => {
    const data = await apiGet('teachers?select=*,profile:profiles(name,email,phone)&order=created_at')
    setTeachers(data ?? [])
  }

  useEffect(() => { load() }, [])

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)

    try {
      if (editing) {
        const res = await fetch('/api/admin/update-teacher', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacherId: editing.id,
            userId: editing.user_id,
            name: form.get('name') as string,
            email: form.get('email') as string,
            phone: form.get('phone') as string || null,
            subjects: ((form.get('subjects') as string) || '').split(',').map(s => s.trim()).filter(Boolean),
            color: form.get('color') as string,
          }),
        })
        const result = await res.json()
        if (!res.ok) { toast.error(result.error || 'Update failed'); setSaving(false); return }
        toast.success('Updated')
      } else {
        const email = form.get('email') as string
        const password = form.get('password') as string
        const name = form.get('name') as string
        const subjects = ((form.get('subjects') as string) || '').split(',').map(s => s.trim()).filter(Boolean)
        const color = form.get('color') as string || '#6366f1'

        if (!email || !password) {
          toast.error('Email and password are required')
          setSaving(false)
          return
        }

        const res = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, role: 'teacher', subjects, color }),
        })

        const result = await res.json()
        if (!res.ok) {
          toast.error(result.error || 'Failed to create teacher')
          setSaving(false)
          return
        }

        toast.success('Teacher created')
      }

      setOpen(false)
      setEditing(null)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const deleteTeacher = async () => {
    if (!editing) return
    setSaving(true)
    const res = await fetch('/api/admin/update-teacher', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId: editing.id, userId: editing.user_id }),
    })
    const result = await res.json()
    if (!res.ok) { toast.error(result.error || 'Delete failed'); setSaving(false); return }
    toast.success('Teacher deleted')
    setOpen(false)
    setEditing(null)
    setConfirmDelete('')
    setSaving(false)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teachers</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setConfirmDelete('') } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Add Teacher</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? `Edit Teacher — ${editing?.profile?.name}` : 'Add Teacher'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              {!editing && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" required placeholder="teacher@email.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Temporary Password</Label>
                    <Input id="password" name="password" type="text" required placeholder="Set a temporary password" />
                  </div>
                </>
              )}
              {editing && (
                <div className="space-y-2">
                  <Label htmlFor="email-edit">Email</Label>
                  <Input id="email-edit" name="email" type="email" defaultValue={editing?.profile?.email ?? ''} required placeholder="teacher@email.com" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={editing?.profile?.name ?? ''} required placeholder="e.g. John Smith" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" defaultValue={editing?.profile?.phone ?? ''} placeholder="+61 4XX XXX XXX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subjects">Subjects (comma separated)</Label>
                <Input
                  id="subjects"
                  name="subjects"
                  defaultValue={editing?.subjects?.join(', ')}
                  placeholder="Math, English, Physics"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  name="color"
                  type="color"
                  defaultValue={editing?.color ?? '#6366f1'}
                />
              </div>
              <div className="flex justify-between items-center gap-2">
                <div>
                  {editing && confirmDelete !== editing?.profile?.email ? (
                    <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => setConfirmDelete(editing?.profile?.email ?? '')}>
                      <Trash2 className="h-4 w-4 mr-1" />Delete Teacher
                    </Button>
                  ) : editing ? (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-red-600">Type email to confirm</p>
                      <Input className="w-40 h-8 text-xs" value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)} placeholder={editing?.profile?.email} />
                      <Button type="button" variant="destructive" size="sm" disabled={confirmDelete !== editing?.profile?.email || saving} onClick={deleteTeacher}>
                        {saving ? 'Deleting...' : 'Confirm'}
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditing(null); setConfirmDelete('') }}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teachers.map((t: any) => (
          <Card key={t.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <div>
                  <p className="font-medium">{t.profile?.name ?? t.profile?.email ?? 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{t.profile?.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {t.subjects?.map((s: string) => (
                  <span key={s} className="text-xs bg-muted px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditing(t); setOpen(true) }}>
                  <Pencil className="h-3 w-3 mr-1" />Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {teachers.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-6 text-center text-muted-foreground">No teachers yet</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
