import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  try {
    const { studentId, userId, name, email, phone, notes } = await request.json()
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    const profileUpdates: Record<string, string> = {}
    if (name !== undefined) profileUpdates.name = name
    if (email !== undefined) profileUpdates.email = email
    if (phone !== undefined) profileUpdates.phone = phone
    if (email !== undefined && userId) {
      // Update auth user email
      const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ email }),
      })
      if (!authRes.ok) {
        const err = await authRes.json()
        return NextResponse.json({ error: err.msg || 'Failed to update auth email' }, { status: 400 })
      }
    }

    // Update profile
    if (Object.keys(profileUpdates).length > 0 && userId) {
      const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify(profileUpdates),
      })
      if (!profRes.ok) return NextResponse.json({ error: 'Failed to update profile' }, { status: 400 })
    }

    // Update notes in students table
    if (notes !== undefined) {
      const stuRes = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ notes }),
      })
      if (!stuRes.ok) return NextResponse.json({ error: 'Failed to update notes' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
