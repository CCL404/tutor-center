import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Get teacher auth from request header (forwarded from client)
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify the user is a teacher by checking their profile
    const { searchParams } = new URL(req.url)
    const teacherUserId = searchParams.get('userId')
    if (!teacherUserId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    // Get teacher's sessions
    const teacherRes = await fetch(`${SUPABASE_URL}/rest/v1/teachers?select=id&user_id=eq.${teacherUserId}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    if (!teacherRes.ok) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    const teachers = await teacherRes.json()
    if (!teachers?.[0]) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })

    // Get their session IDs
    const sessionsRes = await fetch(`${SUPABASE_URL}/rest/v1/sessions?select=id&teacher_id=eq.${teachers[0].id}`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    const sessions = await sessionsRes.json()
    if (!sessions?.length) return NextResponse.json({ students: [] })

    const sessionIds = sessions.map((s: any) => s.id)

    // Get session_students with student profiles
    const ssRes = await fetch(`${SUPABASE_URL}/rest/v1/session_students?select=student_id,student:students!inner(id,notes,user_id)&in=session_id&session_id=in.(${sessionIds.join(',')})`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    const ssData = await ssRes.json()
    if (!ssData?.length) return NextResponse.json({ students: [] })

    const userIds = [...new Set(ssData.map((s: any) => s.student?.user_id).filter(Boolean))] as string[]
    if (!userIds.length) return NextResponse.json({ students: [] })

    // Get profiles for those students
    const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,name,email,phone&id=in.(${userIds.join(',')})`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    const profiles = await profRes.json()

    // Merge
    const profileMap: Record<string, any> = {}
    profiles.forEach((p: any) => { profileMap[p.id] = p })

    const seen = new Set<string>()
    const students = ssData
      .map((s: any) => s.student)
      .filter((s: any) => {
        if (!s || seen.has(s.id)) return false
        seen.add(s.id)
        return true
      })
      .map((s: any) => ({ ...s, profile: profileMap[s.user_id] }))

    return NextResponse.json({ students })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
