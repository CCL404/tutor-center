import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const path = searchParams.get('path')
    if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

    // Remove our special param and forward the rest as Supabase query params
    const qs = new URLSearchParams()
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'path') qs.set(key, value)
    }
    const qstr = qs.toString()
    const url = `${SUPABASE_URL}/rest/v1/${path}${qstr ? '?' + qstr : ''}`

    const res = await fetch(url, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    })

    const data = res.ok ? await res.json() : null
    return NextResponse.json({ data, error: res.ok ? null : `${res.status}: ${res.statusText}` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { path, body, prefer } = await request.json()
    if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    }
    if (prefer) headers['Prefer'] = prefer

    const url = `${SUPABASE_URL}/rest/v1/${path}`
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    const data = res.ok ? await res.json() : null
    return NextResponse.json({ data, error: res.ok ? null : `${res.status}: ${res.statusText}` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { path, body, prefer } = await request.json()
    if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    }
    if (prefer) headers['Prefer'] = prefer

    const url = `${SUPABASE_URL}/rest/v1/${path}`
    const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) })
    return NextResponse.json({ ok: res.ok, error: res.ok ? null : `${res.status}: ${res.statusText}` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
