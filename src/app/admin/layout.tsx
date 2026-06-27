'use client'

import { useAuth } from '@/contexts/auth-context'
import { AppShell } from '@/components/shared/app-shell'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'admin')) {
      router.replace('/login')
    }
  }, [profile, loading, router])

  if (loading || !profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading...</p>
      </div>
    )
  }

  return <AppShell>{children}</AppShell>
}
