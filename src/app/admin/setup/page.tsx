'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Copy, Play } from 'lucide-react'

const SQL = `CREATE TABLE IF NOT EXISTS public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('teacher', 'student')),
  max_uses int NOT NULL DEFAULT 1,
  used_count int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin all - invite_codes" ON public.invite_codes
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Anyone read - invite_codes" ON public.invite_codes
  FOR SELECT USING (true);`

export default function SetupPage() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const runMigration = async () => {
    setRunning(true)
    setResult(null)
    const res = await fetch('/api/admin/setup-db', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      toast.success('Database setup complete!')
      setResult('✅ Migration ran successfully')
    } else if (data.sql) {
      setResult(data.sql)
      toast.error(data.error || 'Setup failed')
    } else {
      setResult(JSON.stringify(data, null, 2))
      toast.error('Setup failed')
    }
    setRunning(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Database Setup</h1>
      <Card>
        <CardHeader><CardTitle>Invite Codes Table</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The invite codes system needs a new database table. You can auto-run or manually paste into Supabase SQL Editor.
          </p>
          <Button onClick={runMigration} disabled={running}>
            <Play className="h-4 w-4 mr-1" />{running ? 'Running...' : 'Auto-Run Migration'}
          </Button>
          {result && (
            <Card className="bg-muted">
              <CardContent className="p-4">
                <pre className="whitespace-pre-wrap text-xs font-mono">{result}</pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Manual SQL</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Copy this SQL and paste it into Supabase Dashboard → SQL Editor.
          </p>
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(SQL); toast.success('Copied') }}>
            <Copy className="h-4 w-4 mr-1" />Copy SQL
          </Button>
          <pre className="whitespace-pre-wrap text-xs font-mono bg-muted p-4 rounded-md overflow-x-auto">{SQL}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
