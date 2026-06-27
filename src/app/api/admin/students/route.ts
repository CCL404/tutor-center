import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?select=id,user_id,notes&order=created_at.desc`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    if (!res.ok) return NextResponse.json({ students: [] })
    const stuData = await res.json()

    const userIds = stuData.map((s: any) => s.user_id).filter(Boolean)
    if (userIds.length === 0) return NextResponse.json({ students: [] })

    const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,name,email,phone&id=in.(${userIds.join(',')})`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    const profiles = profRes.ok ? await profRes.json() : []

    const profileMap: Record<string, any> = {}
    profiles.forEach((p: any) => { profileMap[p.id] = p })

    const students = stuData.map((s: any) => ({ ...s, profile: profileMap[s.user_id] ?? null }))

    return NextResponse.json({ students })
  } catch {
    return NextResponse.json({ students: [] })
  }
}
