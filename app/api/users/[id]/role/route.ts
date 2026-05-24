import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth/session'
import { UpdateRoleSchema } from '@/lib/validations/users'
import { ROLE_RANK, canAssignRole, type UserRole } from '@/lib/auth/roles'

/**
 * PRODUCTION-GRADE API ROUTE
 * 
 * WHY RUNTIME NODEJS?
 * This route uses sensitive Supabase Admin operations and complex role hierarchy logic.
 * Enforcing the Node.js runtime ensures stable execution and full access to 'crypto'
 * and Node-native environment variables.
 */
export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Lazy-initialize the admin client inside the request handler.
  // This prevents build-time environment variable evaluation crashes.
  const supabaseAdmin = createAdminClient()

  try {
    // STEP 1: Get current user
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // STEP 2: requireAdmin
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // STEP 3: Validate body
    const body = await request.json()
    const result = UpdateRoleSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      )
    }

    // STEP 4: Fetch target user
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, auth_id, role, tenant_id, is_active')
      .eq('id', params.id)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // STEP 5: Verify same tenant
    if (targetUser.tenant_id !== currentUser.tenant_id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // STEP 6: Block lateral demotion — admins cannot modify other admins
    if (targetUser.role === 'admin' && targetUser.auth_id !== currentUser.auth_id) {
       return NextResponse.json(
        { error: 'Cannot modify another administrator' },
        { status: 403 }
      )
    }

    // STEP 7: Block self role-change
    if (targetUser.auth_id === currentUser.auth_id) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 403 }
      )
    }

    // STEP 7.5: Current user must strictly outrank the TARGET USER'S CURRENT ROLE
    if (
      ROLE_RANK[currentUser.role] 
      <= ROLE_RANK[targetUser.role as UserRole]
    ) {
      return NextResponse.json(
        {
          error: `You do not have authority over a ${targetUser.role}. Cannot modify.`
        },
        { status: 403 }
      )
    }

    // STEP 8: Current user must also strictly outrank THE NEW ROLE being assigned
    if (!canAssignRole(currentUser.role, result.data.role)) {
      return NextResponse.json(
        {
          error: `A ${currentUser.role} cannot assign the ${result.data.role} role`
        },
        { status: 403 }
      )
    }

    // STEP 9: UPDATE public.users
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ role: result.data.role })
      .eq('id', params.id)
      .eq('tenant_id', currentUser.tenant_id)

    if (updateError) {
      console.error('[ROLE UPDATE ERROR]', updateError)
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 })
    }

    // STEP 10: Sync app_metadata
    const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.auth_id,
      {
        app_metadata: {
          tenant_id: currentUser.tenant_id,
          role: result.data.role
        }
      }
    )

    if (metadataError) {
      console.error('[METADATA SYNC FAILED]', { auth_id: targetUser.auth_id, error: metadataError })
    }

    // STEP 11: Return 200
    return NextResponse.json({ success: true, role: result.data.role })

  } catch (err) {
    console.error('[PATCH ROLE CRITICAL ERROR]', err)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
