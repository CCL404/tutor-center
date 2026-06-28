import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  try {
    const { teacherId, userId, name, email, phone, subjects, color } = await request.json()
    if (!teacherId) return NextResponse.json({ error: 'teacherId required' }, { status: 400 })

    if (email !== undefined && userId) {
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

    const profileUpdates: Record<string, string> = {}
    if (name !== undefined) profileUpdates.name = name
    if (email !== undefined) profileUpdates.email = email
    if (phone !== undefined) profileUpdates.phone = phone
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

    const teacherUpdates: Record<string, any> = {}
    if (subjects !== undefined) teacherUpdates.subjects = subjects
    if (color !== undefined) teacherUpdates.color = color
    if (Object.keys(teacherUpdates).length > 0) {
      const teaRes = await fetch(`${SUPABASE_URL}/rest/v1/teachers?id=eq.${teacherId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify(teacherUpdates),
      })
      if (!teaRes.ok) return NextResponse.json({ error: 'Failed to update teacher' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { teacherId, userId } = await request.json()
    if (!teacherId) return NextResponse.json({ error: 'teacherId required' }, { status: 400 })

    const headers = {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    }

    // Delete teacher's sessions (cascade to session_students + attendance)
    await fetch(`${SUPABASE_URL}/rest/v1/session_students?session:teachers(id)=eq.${teacherId}`, {
      method: 'DELETE', headers,
    })
    await fetch(`${SUPABASE_URL}/rest/v1/attendance?session:teachers(id)=eq.${teacherId}`, {
      method: 'DELETE', headers,
    })
    await fetch(`${SUPABASE_URL}/rest/v1/sessions?teacher_id=eq.${teacherId}`, {
      method: 'DELETE', headers,
    })
    await fetch(`${SUPABASE_URL}/rest/v1/teachers?id=eq.${teacherId}`, {
      method: 'DELETE', headers,
    })
    if (userId) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'DELETE', headers,
      })
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
