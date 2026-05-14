import React from 'react'
import { requireSuperAdmin } from '@/lib/auth/guards'
import SuperAdminSidebar from './SuperAdminSidebar'

export default async function SuperAdminProtectedLayout({
  children
}: { children: React.ReactNode }) {

  const superUser = await requireSuperAdmin()
  // redirects to /super/login if not super admin

  return (
    <div className="flex min-h-screen bg-gray-950">
      <SuperAdminSidebar email={superUser.email} />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
