import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

// Validate invite code (does NOT consume it)
export async function POST(req: NextRequest) {
  const { code, role } = await req.json()
  if (!code || !role) return NextResponse.json({ error: 'code and role required' }, { status: 400 })

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/invite_codes?code=eq.${code}&select=*`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    )
    if (!res.ok) return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 })
    const codes = await res.json()
    const inv = codes?.[0]
    if (!inv) return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 })

    if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite code has expired' }, { status: 400 })
    }
    if (inv.role !== role) {
      return NextResponse.json({ error: `This code is for ${inv.role}s` }, { status: 400 })
    }
    if (inv.used_count >= inv.max_uses) {
      return NextResponse.json({ error: 'Invite code has been fully used' }, { status: 400 })
    }

    return NextResponse.json({ valid: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
