'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { Send } from 'lucide-react'
import { apiGet, getAccessToken, ANON_KEY, SUPABASE_URL } from '@/lib/supabase-api'

export default function TeacherNotifications() {
  const [users, setUsers] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [notifType, setNotifType] = useState<'email' | 'whatsapp'>('email')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoaded(false)
      const [uData, lData] = await Promise.all([
        apiGet('profiles?select=*&order=name'),
        apiGet('notifications?select=*,profile:profiles(name)&order=sent_at.desc&limit=50'),
      ])
      setUsers(uData ?? [])
      setLogs(lData ?? [])
      setLoaded(true)
    }
    load()
  }, [])

  const send = async () => {
    if (!message.trim()) { toast.error('Please enter a message'); return }
    const token = await getAccessToken()

    const targets = selectedUser === 'all' ? users.map(u => u.id) : [selectedUser]
    const records = targets.map(userId => ({ user_id: userId, type: notifType, message: message.trim() }))

    const res = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${token}` },
      body: JSON.stringify(records),
    })
    if (!res.ok) { toast.error('Send failed'); return }

    toast.success(`Logged ${records.length} notifications`)
    const lData = await apiGet('notifications?select=*,profile:profiles(name)&order=sent_at.desc&limit=50')
    setLogs(lData ?? [])
    setMessage('')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <Card>
        <CardHeader><CardTitle className="text-lg">Send Notification</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Recipient</Label>
              <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="all">All Users</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role === 'admin' ? 'Admin' : u.role === 'teacher' ? 'Teacher' : 'Student'})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <select value={notifType} onChange={e => setNotifType(e.target.value as 'email' | 'whatsapp')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your notification message..." rows={4} />
          </div>
          <Button onClick={send} disabled={!message.trim()}><Send className="h-4 w-4 mr-1" />Send</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-lg">History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Recipient</TableHead><TableHead>Method</TableHead><TableHead>Message</TableHead></TableRow></TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs whitespace-nowrap">{l.sent_at ? format(new Date(l.sent_at), 'M/d HH:mm') : 'Pending'}</TableCell>
                  <TableCell>{l.profile?.name ?? 'Unknown'}</TableCell>
                  <TableCell><span className="text-xs bg-muted px-2 py-0.5 rounded">{l.type === 'email' ? 'Email' : 'WhatsApp'}</span></TableCell>
                  <TableCell className="max-w-xs truncate">{l.message}</TableCell>
                </TableRow>
              ))}
              {!loaded ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Loading...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No records yet</TableCell></TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
