import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

// List invite codes
export async function GET() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/invite_codes?select=*&order=created_at.desc`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  )
  if (!res.ok) return NextResponse.json({ codes: [] })
  const codes = await res.json()
  return NextResponse.json({ codes })
}

// Generate new invite code
export async function POST(req: NextRequest) {
  const { role, maxUses, expiresInDays } = await req.json()
  if (!role || !['teacher', 'student'].includes(role)) {
    return NextResponse.json({ error: 'role must be teacher or student' }, { status: 400 })
  }

  // Generate a random 8-character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid confusion
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]

  const maxUsesNum = maxUses || 1
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
    : null

  const res = await fetch(`${SUPABASE_URL}/rest/v1/invite_codes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Prefer: 'return=representation' },
    body: JSON.stringify({ code, role, max_uses: maxUsesNum, expires_at: expiresAt }),
  })

  if (!res.ok) {
    const err = await res.json()
    return NextResponse.json({ error: 'Failed to create: ' + JSON.stringify(err) }, { status: 500 })
  }

  const newCode = await res.json()
  return NextResponse.json({ code: newCode?.[0] || newCode })
}
