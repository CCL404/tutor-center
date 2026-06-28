import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, studentIds, studentPrices } = await request.json()
    if (!sessionId || !Array.isArray(studentIds)) {
      return NextResponse.json({ error: 'sessionId and studentIds required' }, { status: 400 })
    }

    const headers = {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    }

    // Delete all existing session_students for this session
    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/session_students?session_id=eq.${sessionId}`, {
      method: 'DELETE',
      headers,
    })
    if (!delRes.ok) {
      return NextResponse.json({ error: `Delete failed: ${delRes.status}` }, { status: 500 })
    }

    // Insert new session_students
    if (studentIds.length > 0) {
      const records = studentIds.map((sid: string) => ({
        session_id: sessionId,
        student_id: sid,
        price: studentPrices?.[sid] ?? null,
      }))

      const insRes = await fetch(`${SUPABASE_URL}/rest/v1/session_students`, {
        method: 'POST',
        headers,
        body: JSON.stringify(records),
      })
      if (!insRes.ok) {
        return NextResponse.json({ error: `Insert failed: ${insRes.status}` }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
