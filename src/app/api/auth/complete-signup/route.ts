import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, name, role } = await req.json()
    if (!email || !role) return NextResponse.json({ error: 'email and role required' }, { status: 400 })
    if (!['teacher', 'student'].includes(role)) return NextResponse.json({ error: 'role must be teacher or student' }, { status: 400 })

    // Find the auth user by email
    const adminRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?filter=email%3D${encodeURIComponent(email)}`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    })
    if (!adminRes.ok) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const usersData = await adminRes.json()
    const authUser = usersData.users?.[0]
    if (!authUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const userId = authUser.id

    // Update profile
    const updateBody: any = { name, role }
    const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify(updateBody),
    })
    if (!profRes.ok) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })

    // Create teacher or student record
    if (role === 'teacher') {
      const teacherRes = await fetch(`${SUPABASE_URL}/rest/v1/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: userId, subjects: '', color: '#6366f1' }),
      })
      if (!teacherRes.ok) { const e = await teacherRes.json(); return NextResponse.json({ error: 'Failed to create teacher: ' + JSON.stringify(e) }, { status: 500 }) }
    } else {
      // For students, they might already have a student record from existing signups
      const existingStu = await fetch(`${SUPABASE_URL}/rest/v1/students?select=id&user_id=eq.${userId}`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      })
      const existing = await existingStu.json()
      if (!existing?.length) {
        const stuRes = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=representation' },
          body: JSON.stringify({ user_id: userId }),
        })
        if (!stuRes.ok) { const e = await stuRes.json(); return NextResponse.json({ error: 'Failed to create student: ' + JSON.stringify(e) }, { status: 500 }) }
      }
    }

    return NextResponse.json({ success: true, role })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
