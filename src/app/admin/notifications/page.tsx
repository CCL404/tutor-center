'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { Send } from 'lucide-react'

export default function AdminNotifications() {
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [notifType, setNotifType] = useState<'email' | 'whatsapp'>('email')

  useEffect(() => {
    const load = async () => {
      const [uRes, lRes] = await Promise.all([
        supabase.from('profiles').select('*').order('name'),
        supabase.from('notifications').select('*, profile:profiles(name)').order('sent_at', { ascending: false }).limit(50),
      ])
      setUsers(uRes.data ?? [])
      setLogs(lRes.data ?? [])
    }
    load()
  }, [])

  const send = async () => {
    if (!message.trim()) { toast.error('Please enter a message'); return }

    const targets = selectedUser === 'all'
      ? users.map(u => u.id)
      : [selectedUser]

    const records = targets.map(userId => ({
      user_id: userId,
      type: notifType,
      message: message.trim(),
    }))

    const { error } = await (supabase.from('notifications') as any).insert(records)
    if (error) { toast.error(error.message); return }

    toast.success(`Logged ${records.length} notifications. (Setup Email/WhatsApp API to auto-send)`)

    // Refresh logs
    const { data } = await supabase
      .from('notifications')
      .select('*, profile:profiles(name)')
      .order('sent_at', { ascending: false })
      .limit(50)
    setLogs(data ?? [])
    setMessage('')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Notifications</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Send通知</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Recipient</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role === 'admin' ? 'Admin' : u.role === 'teacher' ? 'Teacher' : 'Student'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={notifType} onValueChange={(v) => setNotifType(v as 'email' | 'whatsapp')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="輸入通知內容..."
              rows={4}
            />
          </div>

          <Button onClick={send} disabled={!message.trim()}>
            <Send className="h-4 w-4 mr-1" />Send
          </Button>

          <p className="text-xs text-muted-foreground">
            ⚠️ Currently in logging mode. Setup Email/WhatsApp API for auto-send.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {l.sent_at ? format(new Date(l.sent_at), 'M/d HH:mm') : '未Send'}
                  </TableCell>
                  <TableCell>{l.profile?.name ?? '未知'}</TableCell>
                  <TableCell>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      {l.type === 'email' ? 'Email' : 'WhatsApp'}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{l.message}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    No records yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
