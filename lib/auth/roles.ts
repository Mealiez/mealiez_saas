export const ROLE_RANK: Record<string, number> = {
  admin:   3,
  manager: 2,
  member:  1
}

export type TenantRole = 'admin' | 'manager' | 'member'
export type UserRole = TenantRole

export type AuthUser = {
  id:          string
  auth_id:     string
  tenant_id:   string
  full_name:   string
  role:        TenantRole
  is_active:   boolean
}

export type SuperAdminUser = {
  id:            string    // auth.uid()
  email:         string
  is_super_admin: true
}

export const ROLE_LABELS: Record<string, string> = {
  admin:   'Admin',
  manager: 'Manager',
  member:  'Member'
}

/**
 * Roles that can be assigned via invite.
 */
export const ASSIGNABLE_ROLES: TenantRole[] = [
  'admin',
  'manager',
  'member'
]

/**
 * isAdminOrAbove()
 * Returns true if the role is Admin.
 */
export function isAdminOrAbove(role: string): boolean {
  return (ROLE_RANK[role] || 0) >= ROLE_RANK['admin']
}

/**
 * isManagerOrAbove()
 * Returns true if the role is Manager or above.
 */
export function isManagerOrAbove(role: string): boolean {
  return (ROLE_RANK[role] || 0) >= ROLE_RANK['manager']
}

/**
 * canAssignRole()
 * Logic to ensure an inviter or admin can only assign roles that are 
 * strictly below their own rank.
 */
export function canAssignRole(
  assignerRole: string,
  targetRole: string
): boolean {
  return (ROLE_RANK[assignerRole] || 0) > (ROLE_RANK[targetRole] || 0)
}

/**
 * outranks()
 * Returns true if roleA has a higher rank than roleB.
 */
export function outranks(
  roleA: string,
  roleB: string
): boolean {
  return (ROLE_RANK[roleA] || 0) > (ROLE_RANK[roleB] || 0)
}

/**
 * getAssignableRoles()
 * Returns a filtered list of roles the inviter is allowed to assign.
 */
export function getAssignableRoles(
  inviterRole: string
): TenantRole[] {
  return ASSIGNABLE_ROLES.filter(
    role => canAssignRole(inviterRole, role)
  )
}
