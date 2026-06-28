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

    // For each student, get session count and fee info
    const students = await Promise.all(stuData.map(async (s: any) => {
      const studentId = s.id

      // Attendance count
      const attRes = await fetch(
        `${SUPABASE_URL}/rest/v1/attendance?select=id&student_id=eq.${studentId}&status=eq.present`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
      )
      const attended = attRes.ok ? (await attRes.json()).length : 0

      // Total session count (enrolled)
      const ssRes = await fetch(
        `${SUPABASE_URL}/rest/v1/session_students?select=session_id&student_id=eq.${studentId}`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
      )
      const sessionIds = ssRes.ok ? (await ssRes.json()).map((ss: any) => ss.session_id) : []
      const totalSessions = sessionIds.length

      // Fee calculation: sum price_per_student for enrolled sessions
      let totalDue = 0
      let totalPaid = 0
      if (sessionIds.length > 0) {
        // Only session_students with explicit session prices
        const sessRes = await fetch(
          `${SUPABASE_URL}/rest/v1/sessions?select=price_per_student&id=in.(${sessionIds.join(',')})`,
          { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
        )
        if (sessRes.ok) {
          const sessions = await sessRes.json()
          totalDue = sessions.reduce((sum: number, sess: any) => sum + (sess.price_per_student || 0), 0)
        }

        // Payments made by this student
        const payRes = await fetch(
          `${SUPABASE_URL}/rest/v1/payments?select=amount_paid&student_id=eq.${studentId}`,
          { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
        )
        if (payRes.ok) {
          const payments = await payRes.json()
          totalPaid = payments.reduce((sum: number, p: any) => sum + (p.amount_paid || 0), 0)
        }
      }

      return {
        ...s,
        profile: profileMap[s.user_id] ?? null,
        stats: {
          totalSessions,
          attended,
          totalDue,
          totalPaid,
          outstanding: totalDue - totalPaid,
        },
      }
    }))

    return NextResponse.json({ students })
  } catch {
    return NextResponse.json({ students: [] })
  }
}
