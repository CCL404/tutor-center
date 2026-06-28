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

    // Get profiles
    const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,name,email,phone&id=in.(${userIds.join(',')})`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    })
    const profiles = profRes.ok ? await profRes.json() : []

    const profileMap: Record<string, any> = {}
    profiles.forEach((p: any) => { profileMap[p.id] = p })

    const students = await Promise.all(stuData.map(async (s: any) => {
      const studentId = s.id

      // Get enrolled sessions with price
      const ssRes = await fetch(
        `${SUPABASE_URL}/rest/v1/session_students?select=price,session:sessions(id,date,subject,start_time)&student_id=eq.${studentId}&order=session.date.desc,session.start_time.desc`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
      )
      const enrolled = ssRes.ok ? await ssRes.json() : []
      const totalSessions = enrolled.length
      const totalDue = enrolled.reduce((sum: number, e: any) => sum + (e.price || 0), 0)

      // Attendance count
      const attRes = await fetch(
        `${SUPABASE_URL}/rest/v1/attendance?select=id&student_id=eq.${studentId}&status=eq.present`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
      )
      const attended = attRes.ok ? (await attRes.json()).length : 0

      // Payments made
      const payRes = await fetch(
        `${SUPABASE_URL}/rest/v1/payments?select=amount_paid&student_id=eq.${studentId}`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
      )
      const totalPaid = payRes.ok
        ? (await payRes.json()).reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0)
        : 0

      return {
        ...s,
        profile: profileMap[s.user_id] ?? null,
        stats: { totalSessions, attended, totalDue, totalPaid, outstanding: totalDue - totalPaid },
        sessions: enrolled.map((e: any) => ({
          id: e.session?.id,
          date: e.session?.date,
          subject: e.session?.subject,
          start_time: e.session?.start_time,
          price: e.price || 0,
        })),
      }
    }))

    return NextResponse.json({ students })
  } catch {
    return NextResponse.json({ students: [] })
  }
}
