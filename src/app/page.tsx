'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

export default function Home() {
  const { profile, loading } = useAuth()
  const router = useRouter()
  const checked = useRef(false)

  useEffect(() => {
    if (checked.current || loading) return
    checked.current = true

    if (!profile) {
      router.replace('/login')
      return
    }

    switch (profile.role) {
      case 'admin':    router.replace('/admin'); break
      case 'teacher':  router.replace('/teacher'); break
      default:         router.replace('/student')
    }
  }, [profile, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground animate-pulse">Loading...</p>
    </div>
  )
}
