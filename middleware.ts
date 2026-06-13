import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const userAgent = request.headers.get('user-agent') || ''
  const isMobile = /mobile/i.test(userAgent)

  // 1. Instant Redirection Logic (Optimized)
  if (pathname === '/') {
    const target = isMobile ? '/m/home' : '/dashboard'
    return NextResponse.redirect(new URL(target, request.url))
  }

  // Enforcement for main entry points
  if (isMobile && pathname === '/dashboard') {
    return NextResponse.redirect(new URL('/m/home', request.url))
  }
  if (!isMobile && pathname === '/m/home') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Always run updateSession.
  const response = await updateSession(request)

  // Forward pathname for layout logic
  response.headers.set('x-pathname', pathname)

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
