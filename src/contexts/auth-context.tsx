'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Profile } from '@/lib/types'

interface AuthContextType {
  user: { id: string; email: string } | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

const SUPABASE_URL = 'https://tpmsqndrjrorfwxzvrcq.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwbXNxbmRyanJvcmZ3eHp2cmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTYwNTcsImV4cCI6MjA5ODEzMjA1N30.Td8-yOHt3JqiY-88Q16s3-Gb4Fc0ka-vVjnzFHbAse0'
const STORAGE_KEY = 'sb-tpmsqndrjrorfwxzvrcq-auth-token'

function getStoredSession(): { id: string; email: string; accessToken: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data?.user?.id || !data?.user?.email) return null
    return { id: data.user.id, email: data.user.email, accessToken: data.access_token }
  } catch {
    return null
  }
}

async function fetchProfile(userId: string, accessToken: string): Promise<Profile | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.[0] || null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    user: { id: string; email: string } | null
    profile: Profile | null
    loading: boolean
  }>({ user: null, profile: null, loading: true })

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const session = getStoredSession()
      if (!session) {
        if (mounted) setState({ user: null, profile: null, loading: false })
        return
      }

      if (mounted) setState(prev => ({ ...prev, user: { id: session.id, email: session.email } }))

      const profile = await fetchProfile(session.id, session.accessToken)
      if (mounted) {
        setState({
          user: { id: session.id, email: session.email },
          profile,
          loading: false,
        })
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  const signOut = useCallback(async () => {
    try {
      const session = getStoredSession()
      if (session) {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${session.accessToken}`,
          },
        })
      }
    } catch {}
    localStorage.removeItem(STORAGE_KEY)
    setState({ user: null, profile: null, loading: false })
    window.location.href = '/login'
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
