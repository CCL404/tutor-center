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

async function completeSignup(email: string, name: string, role: string, inviteCode?: string) {
  const res = await fetch('/api/auth/complete-signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, role, inviteCode }),
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
  const [inviteCode, setInviteCode] = useState('')
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
        await completeSignup(email, name, role, inviteCode)
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-muted/40 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/[0.02] blur-3xl" />
      </div>
      <Card className="w-full max-w-md relative">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-2 w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-2xl">
            📚
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">狀元軒</CardTitle>
          <CardDescription className="text-sm">
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="h-10"
              />
            </div>
            {mode === 'signup' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Display Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex Wang" required className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Role</Label>
                  <div className="flex gap-3">
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${role === 'student' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-muted-foreground/30'}`}>
                      <input type="radio" name="role" value="student" checked={role === 'student'} onChange={() => setRole('student')} className="sr-only" />
                      <span>🎓 Student</span>
                    </label>
                    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${role === 'teacher' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-muted-foreground/30'}`}>
                      <input type="radio" name="role" value="teacher" checked={role === 'teacher'} onChange={() => setRole('teacher')} className="sr-only" />
                      <span>👨‍🏫 Teacher</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="inviteCode" className="text-xs font-medium text-muted-foreground">Invite Code</Label>
                  <Input id="inviteCode" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="AB12CD34" required className="h-10 font-mono tracking-widest text-center uppercase" />
                  <p className="text-xs text-muted-foreground">Ask your admin for an invite code</p>
                </div>
              </>
            )}
            <Button type="submit" className="w-full h-10 rounded-lg" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                  Signing in...
                </span>
              ) : mode === 'login' ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm">
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 decoration-muted-foreground/30 hover:decoration-primary/50"
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
