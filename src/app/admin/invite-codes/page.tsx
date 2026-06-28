'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Copy, RefreshCw, Trash2 } from 'lucide-react'

export default function InviteCodesPage() {
  const [codes, setCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [genOpen, setGenOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/invite-codes')
    const data = await res.json()
    setCodes(data.codes ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const generate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const role = form.get('role') as string
    const maxUses = parseInt(form.get('maxUses') as string) || 1
    const expiresInDays = parseInt(form.get('expiresInDays') as string) || 0

    const res = await fetch('/api/admin/invite-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, maxUses, expiresInDays: expiresInDays || null }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Failed'); return }
    toast.success('Code generated')
    setGenOpen(false)
    load()
  }

  const isExpired = (code: any) => code.expires_at && new Date(code.expires_at) < new Date()
  const isFullyUsed = (code: any) => code.used_count >= code.max_uses

  const remove = async (id: string) => {
    const res = await fetch(`/api/admin/invite-codes?id=${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Delete failed'); return }
    toast.success('Code deleted')
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invite Codes</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Dialog open={genOpen} onOpenChange={setGenOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Generate Code</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Generate Invite Code</DialogTitle></DialogHeader>
              <form onSubmit={generate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="role" value="student" defaultChecked />
                      <span className="text-sm">Student</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="role" value="teacher" />
                      <span className="text-sm">Teacher</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxUses">Max Uses</Label>
                  <Input id="maxUses" name="maxUses" type="number" defaultValue={1} min={1} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiresInDays">Expires In (days, 0 = never)</Label>
                  <Input id="expiresInDays" name="expiresInDays" type="number" defaultValue={30} min={0} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
                  <Button type="submit">Generate</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : codes.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No invite codes yet. Generate one!</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {codes.map((c: any) => (
            <Card key={c.id} className={` ${isExpired(c) || isFullyUsed(c) ? 'opacity-50' : ''}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-lg font-bold tracking-wider">{c.code}</code>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(c.code); toast.success('Copied') }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Badge variant={c.role === 'teacher' ? 'default' : 'secondary'} className="text-[10px]">{c.role}</Badge>
                    {(isExpired(c) || isFullyUsed(c)) && <Badge variant="outline" className="text-[10px] text-destructive border-destructive">Expired</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used {c.used_count}/{c.max_uses}
                    {c.expires_at && ` · Expires ${new Date(c.expires_at).toLocaleDateString()}`}
                    {c.created_at && ` · Created ${new Date(c.created_at).toLocaleDateString()}`}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => remove(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
