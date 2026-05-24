import { createBrowserClient } from '@supabase/ssr'

/**
 * createClient()
 * Lazy-initializes the Supabase client for the browser.
 */
export function createClient() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']

  if (!url || !key) {
    throw new Error('Missing Supabase configuration')
  }

  return createBrowserClient(url, key)
}
