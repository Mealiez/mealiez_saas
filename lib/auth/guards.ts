import { getCurrentUser, getSuperAdminUser } from './session'
import { isAdminOrAbove, isManagerOrAbove, SuperAdminUser } from './roles'
import { redirect } from 'next/navigation'

/**
 * requireAuth()
 * Used in server components to enforce basic tenant membership.
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  return user
}

/**
 * requireAdmin()
 * Restricts access to users with the Admin role.
 * (Formerly requireOwnerOrAdmin)
 */
export async function requireAdmin() {
  const user = await getCurrentUser()
  
  if (!user) redirect('/login')
  
  if (!isAdminOrAbove(user.role)) {
    redirect('/dashboard')
  }

  return user
}

/**
 * requireManager()
 * Restricts access to Manager role or higher.
 */
export async function requireManager() {
  const user = await getCurrentUser()
  
  if (!user) redirect('/login')

  if (!isManagerOrAbove(user.role)) {
    redirect('/dashboard')
  }

  return user
}

/**
 * requireSuperAdmin()
 * Restricts access to platform-level Super Admins.
 * Used exclusively in /super/ dashboard.
 */
export async function requireSuperAdmin(): Promise<SuperAdminUser> {
  const superUser = await getSuperAdminUser()

  if (!superUser) {
    redirect('/super/login')
    // redirect() throws, following error is for TS narrowing
    throw new Error('Not reachable')
  }

  return superUser
}
