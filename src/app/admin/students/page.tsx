'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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

export default function AdminStudents() {
  const supabase = createClient()
  const [students, setStudents] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<any | null>(null)
  const [open, setOpen] = useState(false)

  const load = async () => {
    let query = supabase
      .from('students')
      .select('*, profile:profiles(name, email, phone), parent:profiles!students_parent_id_fkey(name, email)')
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`profile.name.ilike.%${search}%,profile.email.ilike.%${search}%`)
    }

    const { data } = await query
    setStudents(data ?? [])
  }

  useEffect(() => { load() }, [search])

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const updates = { notes: form.get('notes') as string }
    const { error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', editing.id)
    if (error) { toast.error(error.message); return }
    toast.success('已更新')
    setOpen(false)
    setEditing(null)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold shrink-0">Students</h1>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search學生Name或電郵..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {students.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="font-medium">{s.profile?.name ?? '未知'}</p>
                <p className="text-xs text-muted-foreground">{s.profile?.email}</p>
              </div>
              {s.profile?.phone && (
                <p className="text-xs text-muted-foreground">
                  Phone：{s.profile.phone}
                </p>
              )}
              {s.parent && (
                <p className="text-xs text-muted-foreground">
                  Parent：{s.parent.name} ({s.parent.email})
                </p>
              )}
              {s.notes && (
                <p className="text-xs text-muted-foreground italic">
                  Notes：{s.notes}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setEditing(s); setOpen(true) }}
              >
                EditNotes
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
            <DialogTitle>Edit學生Notes</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <p className="text-sm">{editing?.profile?.name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                name="notes"
                defaultValue={editing?.notes ?? ''}
                placeholder="特殊學習需求、注意事項..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
