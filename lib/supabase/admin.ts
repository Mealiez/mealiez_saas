import { createClient } from '@supabase/supabase-js'

/*
 * PRODUCTION-GRADE SUPABASE ADMIN LIFECYCLE MANAGEMENT
 *
 * This module implements a strict LAZY INITIALIZATION factory pattern for 
 * high-privilege Supabase Admin operations.
 *
 * ARCHITECTURAL CONSTRAINTS:
 *
 * 1. Build-Time Safety:
 *    Next.js evaluates module imports during 'next build'. If credentials are accessed
 *    at the module scope (top-level), the build will crash if those variables are 
 *    not present in the build environment. Using a factory function ensures 
 *    secrets are only evaluated during runtime execution.
 *
 * 2. Serverless Cold-Start Optimization:
 *    Initializing database clients globally can lead to stale internal states and
 *    increased memory consumption in Netlify/Vercel serverless functions. Factory
 *    initialization allows for cleaner lifecycle management within the execution context.
 *
 * 3. Secret Leak Prevention:
 *    We use dynamic property access (process.env['KEY']) to prevent Webpack and 
 *    other bundlers from statically analyzing and inlining sensitive keys into 
 *    compiled JavaScript chunks.
 *
 * 4. Runtime Integrity:
 *    This module MUST ONLY be imported in server-only contexts (API routes,
 *    Server Actions). The runtime=nodejs constraint is required in callers to
 *    ensure access to Node-native environment variables.
 */

/**
 * createAdminClient()
 * Factory function to create a high-privilege Supabase client using the Secret Key.
 * 
 * SECURITY WARNING: 
 * This client bypasses Row-Level Security (RLS). 
 * NEVER expose this client or its data to the browser bundle.
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('SECURITY VIOLATION: Supabase Admin client attempted to run in browser.')
  }

  // Dynamic access prevents static analysis from leaking secrets to build logs
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['SUPABASE_SECRET_KEY']

  if (!url || !key) {
    throw new Error('INFRASTRUCTURE ERROR: Missing Supabase Admin configuration.')
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
