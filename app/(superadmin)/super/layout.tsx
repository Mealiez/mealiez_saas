import React from 'react'
import { headers } from 'next/headers'
import { requireSuperAdmin } from '@/lib/auth/guards'
import SuperAdminSidebar from './SuperAdminSidebar'

export default async function SuperAdminProtectedLayout({
  children
}: { children: React.ReactNode }) {

  // Read the pathname forwarded by middleware (x-pathname header).
  // The login page lives inside this layout's route segment, so without
  // this check, requireSuperAdmin() would redirect to /super/login, which
  // triggers this layout again → infinite 307 redirect loop.
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  // Public entry point — skip auth entirely so the login form can render.
  if (pathname === '/super/login') {
    return <>{children}</>
  }

  // All other /super/* routes require super admin authentication.
  const superUser = await requireSuperAdmin()

  return (
    <div className="flex min-h-screen bg-gray-950">
      <SuperAdminSidebar email={superUser.email} />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
