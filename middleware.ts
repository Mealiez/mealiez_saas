import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Always run updateSession.
  // This refreshes expiring JWT tokens on every request.
  //
  // Route protection is NOT handled here.
  // Protected routes: requireAuth() in (web)/layout.tsx
  // Public routes:    no auth check in (auth)/layout.tsx
  // Mobile routes:    useAuthGuard hook in each page
  const response = await updateSession(request)

  // Forward pathname so server components (e.g. super/layout.tsx)
  // can read the current route without importing next/navigation.
  // Used to skip auth guard on /super/login (public entry point).
  response.headers.set('x-pathname', request.nextUrl.pathname)

  return response
}

export const config = {
  matcher: [
    /*
     * Match ALL request paths EXCEPT:
     * - /api/onboarding/* public API endpoint
     * - _next internals and static files
     */
    '/((?!api/onboarding|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
