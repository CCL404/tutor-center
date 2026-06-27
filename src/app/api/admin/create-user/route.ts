import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role, subjects, color } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // 1. Create auth user (auto-confirms email when using service role)
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: name || email.split('@')[0] },
      }),
    })

    if (!createRes.ok) {
      const err = await createRes.json()
      return NextResponse.json({ error: err.msg || 'Failed to create user' }, { status: 400 })
    }

    const authUser = await createRes.json()
    const userId = authUser.id

    // 2. Upsert profile
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: userId,
        email,
        name: name || email.split('@')[0],
        role: role || 'student',
      }),
    })

    // 3. Create role-specific record
    if (role === 'teacher') {
      await fetch(`${SUPABASE_URL}/rest/v1/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ user_id: userId, subjects: subjects || [], color: color || '#6366f1' }),
      })
    } else if (role === 'student') {
      await fetch(`${SUPABASE_URL}/rest/v1/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ user_id: userId, notes: '' }),
      })
    }

    return NextResponse.json({ success: true, userId, email })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
