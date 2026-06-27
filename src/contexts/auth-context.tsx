'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

interface AuthContextType {
  user: User | null
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ user: User | null; profile: Profile | null; loading: boolean }>({
    user: null,
    profile: null,
    loading: true,
  })
  const supabase = useRef<any>(null)

  // Initialize sync on mount - no async dependencies
  useEffect(() => {
    let mounted = true
    const client = createClient()
    supabase.current = client

    if (!client) {
      setState({ user: null, profile: null, loading: false })
      return
    }

    // Direct localStorage read for the initial state
    const storedKey = Object.keys(localStorage).find(k =>
      k.startsWith('sb-') && k.endsWith('-auth-token')
    )
    const storedData = storedKey ? localStorage.getItem(storedKey) : null

    if (!storedData) {
      setState({ user: null, profile: null, loading: false })
      return
    }

    // We have stored session - try to use it immediately
    client.auth.getSession().then(({ data: { session } }: any) => {
      if (!mounted) return
      if (!session?.user) {
        setState({ user: null, profile: null, loading: false })
        return
      }

      setState(prev => ({ ...prev, user: session.user }))

      // Fetch profile separately - don't block on it
      client.from('profiles').select('*').eq('id', session.user.id).single()
        .then(({ data }: any) => {
          if (!mounted) return
          setState({ user: session.user, profile: data || null, loading: false })
        })
        .catch(() => {
          if (mounted) setState(prev => ({ ...prev, loading: false }))
        })
    }).catch(() => {
      if (mounted) setState({ user: null, profile: null, loading: false })
    })

    // Subscribe to auth changes
    const { data: { subscription } } = client.auth.onAuthStateChange(
      async (event: string, session: any) => {
        if (!mounted) return
        if (event === 'SIGNED_IN' && session?.user) {
          const { data } = await client.from('profiles').select('*').eq('id', session.user.id).single()
          if (mounted) setState({ user: session.user, profile: data || null, loading: false })
        } else if (event === 'SIGNED_OUT') {
          if (mounted) setState({ user: null, profile: null, loading: false })
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    const client = createClient()
    if (client) await client.auth.signOut()
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
