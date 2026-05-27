/*
 * SECURITY: User Management API
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth/session'
import { InviteUserSchema } from '@/lib/validations/users'
import { isAdminOrAbove, canAssignRole } from '@/lib/auth/roles'
import crypto from 'crypto'
import { sendInviteEmail } from '@/lib/email/sendInvite'
import dns from 'dns/promises'

/**
 * PRODUCTION-GRADE API ROUTE
 * Enforcing Node.js runtime for account creation and link generation.
 */
export const runtime = 'nodejs'

function generateTempPassword(): string {
  return crypto.randomBytes(6).toString('base64url')
}

async function validateEmailDeliverability(email: string): Promise<boolean> {
  try {
    const domain = email.split('@')[1]
    const records = await dns.resolveMx(domain)
    return records && records.length > 0
  } catch (err) {
    return false
  }
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

    const { email, full_name, enrollment_no, role, phone, branch_id, designation_id, avatar_url } = result.data

    // STEP 0: Deliverability Check (Prevent Bounces)
    const isDeliverable = await validateEmailDeliverability(email)
    if (!isDeliverable) {
      return NextResponse.json(
        { error: `The domain for ${email} is invalid or has no mail servers. Please check for typos.` },
        { status: 400 }
      )
    }

    if (!canAssignRole(currentUser.role, role)) {
      return NextResponse.json(
        { error: `You cannot assign the role: ${role}` },
        { status: 403 }
      )
    }

    // STEP 1: Check if user already exists in auth
    const { data: conflict, error: rpcError } = await supabaseAdmin
      .rpc('check_user_invitation_conflict', {
        p_email: email
      })

    if (rpcError) {
      console.error('[INVITE RPC ERROR]', {
        message: rpcError.message,
        code: rpcError.code
      })
      return NextResponse.json({ error: 'Setup check failed' }, { status: 500 })
    }

    const tempPassword = generateTempPassword()
    let auth_id: string

    if (conflict) {
      // User exists in platform, we just fetch their ID to attach membership
      const { data: existingUser, error: fetchError } = await supabaseAdmin.auth.admin.listUsers()
      const found = existingUser.users.find(u => u.email === email)
      
      if (!found) {
        return NextResponse.json({ error: 'Conflict detected but user not found' }, { status: 500 })
      }
      auth_id = found.id
    } else {
      // STEP 2: Create Auth User (New to platform)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name,
          tenant_id: currentUser.tenant_id,
          invited: true
        }
      })

      if (authError) {
        console.error('[AUTH CREATE ERROR]', authError)
        return NextResponse.json({ error: authError.message }, { status: 500 })
      }
      auth_id = authData.user.id
    }

    // STEP 3: Insert into public.users (Profile/Membership)
    // We use upsert to handle case where user exists but needs new tenant link
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .upsert({
        auth_id,
        tenant_id: currentUser.tenant_id,
        full_name,
        enrollment_no,
        role,
        phone,
        branch_id,
        designation_id,
        is_active: true,
        must_change_password: true, // Forced change on login
        avatar_url
      }, {
        onConflict: 'auth_id' // Assuming 1 user = 1 tenant based on architecture note
      })
      .select()
      .single()

    if (insertError) {
      console.error('[DB UPSERT ERROR]', insertError)
      // Only delete if we just created it
      if (!conflict) await supabaseAdmin.auth.admin.deleteUser(auth_id)
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
    }

    // STEP 4: Set tenant_id and branch_id in app_metadata
    const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
      auth_id,
      {
        app_metadata: {
          tenant_id: currentUser.tenant_id,
          role: role,
          branch_id: branch_id
        }
      }
    )

    if (metadataError) {
      console.error('[METADATA UPDATE ERROR]', metadataError)
    }

    // STEP 5: Fetch Organization Name for Email
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name')
      .eq('id', currentUser.tenant_id)
      .single()

    // STEP 6: Send Onboarding Email via Resend
    const appUrl = process.env.APP_URL || 'http://localhost:3000'
    const loginUrl = `${appUrl}/login`
    const emailResult = await sendInviteEmail(
      email,
      tenant?.name || 'Mealiez',
      tempPassword,
      loginUrl
    )

    return NextResponse.json({
      success: true,
      email_sent: emailResult.success,
      user: {
        id: newUser.id,
        email,
        full_name,
        role,
        branch_id: newUser.branch_id
      }
    }, { status: 201 })

  } catch (err) {
    console.error('[POST USER CRITICAL ERROR]', err)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
