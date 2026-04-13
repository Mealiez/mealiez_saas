import { createBrowserClient } from '@supabase/ssr'

/**
 * Use this ONLY in client components and (mobile) routes
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
