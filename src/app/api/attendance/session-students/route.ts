import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  try {
    // Get session_students joined with students and profiles
    const ssRes = await fetch(
      `${SUPABASE_URL}/rest/v1/session_students?select=student_id,student:students(id,notes,user_id)&session_id=eq.${sessionId}`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    )
    if (!ssRes.ok) return NextResponse.json({ students: [] })
    const ssData = await ssRes.json()

    const userIds = [...new Set(ssData.map((s: any) => s.student?.user_id).filter(Boolean))]
    if (!userIds.length) return NextResponse.json({ students: [] })

    const profRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=id,name,email,phone&id=in.(${userIds.join(',')})`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    )
    const profiles = await profRes.json()
    const profileMap: Record<string, any> = {}
    profiles.forEach((p: any) => { profileMap[p.id] = p })

    const students = ssData.map((s: any) => ({
      ...s.student,
      profile: profileMap[s.student?.user_id],
    }))

    return NextResponse.json({ students })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
