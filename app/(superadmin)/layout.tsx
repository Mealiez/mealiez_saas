import React from 'react'

/**
 * app/(superadmin)/layout.tsx
 * Minimal root layout for the super admin group.
 * No auth check here to avoid infinite redirects on the login page.
 */
export default function SuperAdminRootLayout({
  children
}: { children: React.ReactNode }) {
  return <>{children}</>
}
