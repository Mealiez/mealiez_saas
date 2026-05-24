/*
 * SERVER-ONLY: Do not import this in client components
 * or any file inside app/(mobile)/
 * Use lib/auth/client-session.ts for client-side auth.
 */

// import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { AuthUser, SuperAdminUser, TenantRole } from './roles'

/**
 * getSession()
 * Wrapped in React cache() for deduplication across the same request.
 */
export const getSession = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) return null

  // Although getUser is the source of truth, we retrieve the session
  // object to fulfill the requirement of returning both.
  const { data: { session } } = await supabase.auth.getSession()
  
  return { user, session }
})

/**
 * getCurrentUser()
 * Assembles the full user profile including tenant and role context.
 * NOTE: Returns null for platform Super Admins. Use getSuperAdminUser() instead.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const sessionData = await getSession()
  if (!sessionData) return null

  const { user } = sessionData

  // Super admin check
  const isSuperAdmin =
    user.user_metadata?.is_super_admin === true ||
    user.app_metadata?.is_super_admin === true

  if (isSuperAdmin) return null

  const tenant_id = user.app_metadata?.tenant_id as string | undefined
  if (!tenant_id) {
    console.error('[AUTH] tenant_id missing from JWT')
    return null
  }

  const supabase = await createClient()
  const { data: profile, error } = await supabase
    .from('users')
    .select(`
      id, 
      full_name, 
      is_active, 
      role, 
      branch_id, 
      avatar_url,
      tenants (
        logo_url
      )
    `)
    .eq('auth_id', user.id)
    .single()

  if (error || !profile || profile.is_active === false) {
    return null
  }

  // Source of truth for role:
  // Note: 'owner' is mapped to 'admin' for backward compatibility during transition
  let finalRole = profile.role
  if (finalRole === 'owner') finalRole = 'admin'

  return {
    id: profile.id,
    auth_id: user.id,
    tenant_id,
    role: finalRole as TenantRole,
    full_name: profile.full_name,
    is_active: profile.is_active,
    branch_id: profile.branch_id,
    avatar_url: profile.avatar_url,
    tenant_logo: profile.tenants?.logo_url
  }
}

/**
 * getSuperAdminUser()
 * Returns platform admin context. No tenant_id.
 */
export async function getSuperAdminUser(): Promise<SuperAdminUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const isSuperAdmin =
    user.user_metadata?.is_super_admin === true ||
    user.app_metadata?.is_super_admin === true

  if (!isSuperAdmin) return null

  return {
    id:             user.id,
    email:          user.email ?? '',
    is_super_admin: true
  }
}

/**
 * requireAuth()
 * Used in server components to enforce authentication and redirect if missing.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  return user
}
