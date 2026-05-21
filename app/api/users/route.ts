/*
 * SECURITY: User Management API
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth/session'
import { InviteUserSchema } from '@/lib/validations/users'
import { isAdminOrAbove, canAssignRole } from '@/lib/auth/roles'
import crypto from 'crypto'

/**
 * PRODUCTION-GRADE API ROUTE
 * Enforcing Node.js runtime for account creation and link generation.
 */
export const runtime = 'nodejs'

function generateTempPassword(): string {
  return crypto.randomUUID().replace(/-/g, '') + 'Aa1!'
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = createAdminClient()
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdminOrAbove(currentUser.role)) {
      return NextResponse.json(
        { error: 'Only admins can invite users' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const result = InviteUserSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { email, full_name, role, phone } = result.data

    if (!canAssignRole(currentUser.role, role)) {
      return NextResponse.json(
        { error: `You cannot assign the role: ${role}` },
        { status: 403 }
      )
    }

    // STEP 1: Check if user already exists (cross-tenant check)
    const { data: conflict, error: rpcError } = await supabaseAdmin
      .rpc('check_user_invitation_conflict', {
        p_email: email
      })

    if (rpcError) {
      console.error('[INVITE RPC ERROR]', {
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        code: rpcError.code
      })
      return NextResponse.json({ error: 'Setup check failed', message: rpcError.message }, { status: 500 })
    }

    if (conflict) {
      return NextResponse.json(
        { error: 'This email is already associated with another account.', code: 'EMAIL_CONFLICT' },
        { status: 409 }
      )
    }

    // STEP 2: Create Auth User
    const tempPassword = generateTempPassword()
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        tenant_id: currentUser.tenant_id
      }
    })

    if (authError) {
      console.error('[AUTH CREATE ERROR]', {
        message: authError.message,
        status: authError.status
      })
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const auth_id = authData.user.id

    // STEP 3: Insert into public.users
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id,
        tenant_id: currentUser.tenant_id,
        full_name,
        role,
        phone,
        is_active: true
      })
      .select()
      .single()

    if (insertError) {
      console.error('[DB INSERT ERROR]', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      })
      await supabaseAdmin.auth.admin.deleteUser(auth_id)
      return NextResponse.json({ error: 'Failed to create user profile', message: insertError.message }, { status: 500 })
    }

    // STEP 4: Set tenant_id in app_metadata
    const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
      auth_id,
      {
        app_metadata: {
          tenant_id: currentUser.tenant_id,
          role: role
        }
      }
    )

    if (metadataError) {
      console.error('[METADATA UPDATE ERROR]', metadataError)
    }

    // STEP 5: Generate recovery/reset link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${new URL(request.url).origin}/reset-password`
      }
    })

    const recoveryLink = linkError ? null : linkData.properties.action_link

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email,
        full_name,
        role,
        recovery_link: recoveryLink
      }
    }, { status: 201 })

  } catch (err) {
    console.error('[POST USER CRITICAL ERROR]', err)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
