import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export const dynamic = 'force-dynamic'

export async function POST() {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN
  const projectRef = SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)?.[1]

  const sql = `
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('teacher', 'student')),
  max_uses int NOT NULL DEFAULT 1,
  used_count int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invite_codes' AND policyname = 'Admin all - invite_codes') THEN
    ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admin all - invite_codes" ON public.invite_codes
      FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
    CREATE POLICY "Anyone read - invite_codes" ON public.invite_codes
      FOR SELECT USING (true);
  END IF;
END $$;
`

  if (!accessToken || !projectRef) {
    return NextResponse.json({
      setupUrl: `/admin/setup`,
      sql,
      error: 'SUPABASE_ACCESS_TOKEN not configured. Paste this SQL in Supabase SQL Editor, or store SUPABASE_ACCESS_TOKEN in Vercel env vars.',
    }, { status: 400 })
  }

  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ query: sql }),
    })
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Migration failed: ${err}`, sql }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err), sql }, { status: 500 })
  }
}
