'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { getAccessToken, ANON_KEY, SUPABASE_URL } from '@/lib/supabase-api'

export default function ProfilePage() {
  const { profile, user, signOut } = useAuth()
  const [saving, setSaving] = useState(false)

  const saveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const newName = form.get('name') as string
    const newEmail = form.get('email') as string
    const newPhone = form.get('phone') as string
    const newPassword = form.get('password') as string

    const token = await getAccessToken()
    if (!token) { toast.error('Not authenticated'); setSaving(false); return }

    try {
      // Update email/password via Supabase Auth API
      if (newEmail !== user?.email || newPassword) {
        const body: any = { email: newEmail }
        if (newPassword) body.password = newPassword

        const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            apikey: ANON_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        })
        if (!authRes.ok) {
          const err = await authRes.json()
          toast.error(err.msg || 'Failed to update credentials')
          setSaving(false)
          return
        }
      }

      // Update phone & name in profiles table
      const profileUpdates: any = { phone: newPhone || null }
      if (newName !== profile?.name) profileUpdates.name = newName

      const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileUpdates),
      })
      if (!profRes.ok) {
        toast.error('Failed to update profile')
        setSaving(false)
        return
      }

      toast.success('Profile updated')

      if (newPassword) {
        toast.info('Password changed — please sign in again')
        signOut()
      } else {
        window.location.reload()
      }
    } catch (err) {
      toast.error('Something went wrong')
    }
    setSaving(false)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Profile Settings</h1>
      <Card>
        <CardHeader><CardTitle>Personal Info</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={profile?.name ?? ''} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={user?.email ?? ''} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={profile?.phone ?? ''} placeholder="+61 4XX XXX XXX" />
            </div>
            <hr />
            <div className="space-y-1">
              <Label htmlFor="password">New Password</Label>
              <Input id="password" name="password" type="password" placeholder="Leave blank to keep current" />
            </div>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
