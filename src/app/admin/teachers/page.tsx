'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export default function AdminTeachers() {
  const supabase = createClient()
  const [teachers, setTeachers] = useState<any[]>([])
  const [editing, setEditing] = useState<any | null>(null)
  const [open, setOpen] = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('teachers')
      .select('*, profile:profiles(name, email, phone)')
      .order('created_at')
    setTeachers(data ?? [])
  }

  useEffect(() => { load() }, [])

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const subjects = (form.get('subjects') as string).split(',').map(s => s.trim()).filter(Boolean)

    if (editing) {
      const { error } = await supabase
        .from('teachers')
        .update({ subjects, color: form.get('color') as string })
        .eq('id', editing.id)
      if (error) { toast.error(error.message); return }
      toast.success('已更新')
    } else {
      // For new teacher, first create user via admin (or just add teacher record)
      toast.error('First assign a teacher account in User Management')
      return
    }
    setOpen(false)
    setEditing(null)
    load()
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from('teachers').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('已Delete')
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teachers</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teachers.map((t) => (
          <Card key={t.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: t.color }}
                />
                <div>
                  <p className="font-medium">{t.profile?.name ?? '未知'}</p>
                  <p className="text-xs text-muted-foreground">{t.profile?.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {t.subjects?.map((s: string) => (
                  <span key={s} className="text-xs bg-muted px-2 py-0.5 rounded">
                    {s}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setEditing(t); setOpen(true) }}
                >
                  <Pencil className="h-3 w-3 mr-1" />Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => remove(t.id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {teachers.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-6 text-center text-muted-foreground">
              No teachers yet
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit老師' : 'New老師'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <p className="text-sm text-muted-foreground">{editing?.profile?.name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subjects">科目（逗號分隔）</Label>
              <Input
                id="subjects"
                name="subjects"
                defaultValue={editing?.subjects?.join(', ')}
                placeholder="數學, 英文, 物理"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">標示顏色</Label>
              <Input
                id="color"
                name="color"
                type="color"
                defaultValue={editing?.color ?? '#6366f1'}
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
