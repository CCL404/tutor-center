import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let browserClient: any = null

export function createClient(): any {
  // Guard against SSR where env vars might not be available
  try {
    if (browserClient) return browserClient
    browserClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    return browserClient
  } catch {
    return null
  }
}
