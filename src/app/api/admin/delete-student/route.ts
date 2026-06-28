import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  try {
    const { studentId, userId } = await request.json()
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    // Delete related records
    const headers = {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    }

    // 1. Attendance records
    await fetch(`${SUPABASE_URL}/rest/v1/attendance?student_id=eq.${studentId}`, {
      method: 'DELETE', headers,
    })

    // 2. Session_students records
    await fetch(`${SUPABASE_URL}/rest/v1/session_students?student_id=eq.${studentId}`, {
      method: 'DELETE', headers,
    })

    // 3. Payments records
    await fetch(`${SUPABASE_URL}/rest/v1/payments?student_id=eq.${studentId}`, {
      method: 'DELETE', headers,
    })

    // 4. Student record
    await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${studentId}`, {
      method: 'DELETE', headers,
    })

    // 5. Profile record
    if (userId) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'DELETE', headers,
      })
    }

    // 6. Auth user
    if (userId) {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
