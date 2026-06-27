const SUPABASE_URL = 'https://tpmsqndrjrorfwxzvrcq.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwbXNxbmRyanJvcmZ3eHp2cmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTYwNTcsImV4cCI6MjA5ODEzMjA1N30.Td8-yOHt3JqiY-88Q16s3-Gb4Fc0ka-vVjnzFHbAse0'
const STORAGE_KEY = 'sb-tpmsqndrjrorfwxzvrcq-auth-token'

function getStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function store(data: any) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export async function getAccessToken(): Promise<string | null> {
  const stored = getStored()
  if (!stored?.access_token) return null

  // Check if expired — if so, refresh
  const expiresAt = stored.expires_at
  if (expiresAt && Date.now() / 1000 > expiresAt - 60) {
    // Try to refresh
    if (stored.refresh_token) {
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
          body: JSON.stringify({ refresh_token: stored.refresh_token }),
        })
        if (res.ok) {
          const data = await res.json()
          store({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: data.expires_at,
            expires_in: data.expires_in,
            token_type: data.token_type,
            user: data.user ?? stored.user,
          })
          return data.access_token
        }
      } catch {
        // Refresh failed, return existing token (will likely 401)
      }
    }
  }

  return stored.access_token
}

export async function apiGet(path: string): Promise<any> {
  const token = await getAccessToken()
  if (!token) return null
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

export async function apiPatch(path: string, body: any): Promise<boolean> {
  const token = await getAccessToken()
  if (!token) return false
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  return res.ok
}

export async function apiDelete(path: string): Promise<boolean> {
  const token = await getAccessToken()
  if (!token) return false
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'DELETE',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  })
  return res.ok
}

export { SUPABASE_URL, ANON_KEY, STORAGE_KEY }
