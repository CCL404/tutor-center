'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const SUPABASE_URL = 'https://tpmsqndrjrorfwxzvrcq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwbXNxbmRyanJvcmZ3eHp2cmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTYwNTcsImV4cCI6MjA5ODEzMjA1N30.Td8-yOHt3JqiY-88Q16s3-Gb4Fc0ka-vVjnzFHbAse0'

async function signIn(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const errBody = await res.json()
    throw new Error(errBody.error_description || errBody.msg || 'Login failed')
  }
  const data = await res.json()

  // Store session in localStorage for Supabase client to pick up
  const projectRef = SUPABASE_URL.match(/https:\/\/(.+)\.supabase/)?.[1] || 'tpmsqndrjrorfwxzvrcq'
  const storageKey = `sb-${projectRef}-auth-token`
  localStorage.setItem(storageKey, JSON.stringify({
    access_token: data.access_token,
    expires_in: data.expires_in,
    expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + data.expires_in,
    refresh_token: data.refresh_token,
    token_type: data.token_type,
    user: data.user,
  }))

  return data
}

async function fetchRole(userId: string, accessToken: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=role`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
    },
  })
  if (!res.ok) return null
  const profiles = await res.json()
  return profiles?.[0]?.role || null
}

async function signUp(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.msg || 'Signup failed')
  }
}

async function completeSignup(email: string, name: string, role: string) {
  const res = await fetch('/api/auth/complete-signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, role }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Profile setup failed')
  }
  return res.json()
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'student' | 'teacher'>('student')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'login') {
        const data = await signIn(email, password)

        // Fetch role and redirect immediately
        const role = data.user?.id ? await fetchRole(data.user.id, data.access_token) : null

        if (role === 'admin') window.location.href = '/admin'
        else if (role === 'teacher') window.location.href = '/teacher'
        else window.location.href = '/'

        // If redirect doesn't happen, clear loading
        setLoading(false)
      } else {
        await signUp(email, password)
        await completeSignup(email, name, role)
        toast.success(`${role === 'teacher' ? 'Teacher' : 'Student'} account created! You can now sign in.`)
        setMode('login')
        setLoading(false)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred'
      toast.error(msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">📚 狀元軒</CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex Wang" required />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="role" value="student" checked={role === 'student'} onChange={() => setRole('student')} />
                      <span className="text-sm">Student</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="role" value="teacher" checked={role === 'teacher'} onChange={() => setRole('teacher')} />
                      <span className="text-sm">Teacher</span>
                    </label>
                  </div>
                </div>
              </>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <button
                onClick={() => setMode('signup')}
                className="underline hover:text-primary"
              >
                No account? Sign up
              </button>
            ) : (
              <button
                onClick={() => setMode('login')}
                className="underline hover:text-primary"
              >
                Already have an account? Sign in
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
