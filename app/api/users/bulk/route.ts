/*
 * SECURITY: Bulk User Management API
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth/session'
import { InviteUserSchema } from '@/lib/validations/users'
import { isAdminOrAbove, canAssignRole } from '@/lib/auth/roles'
import crypto from 'crypto'
import { sendInviteEmail } from '@/lib/email/sendInvite'
import { sendInviteSms } from '@/lib/sms/sendInvite'
import { normalizePhone, getPhoneAuthEmail } from '@/lib/utils/phone'

export const runtime = 'nodejs'

function generateTempPassword(): string {
  return crypto.randomBytes(6).toString('base64url')
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

    const { users } = await request.json()
    if (!Array.isArray(users)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
    }

    // 1. Fetch Lookups for Names -> IDs mapping
    const [{ data: branches }, { data: designations }, { data: tenant }] = await Promise.all([
      supabaseAdmin.from('branches').select('id, name').eq('tenant_id', currentUser.tenant_id),
      supabaseAdmin.from('designations').select('id, name').eq('tenant_id', currentUser.tenant_id),
      supabaseAdmin.from('tenants').select('name').eq('id', currentUser.tenant_id).single()
    ])

    const branchMap = new Map(branches?.map(b => [b.name.toLowerCase().trim(), b.id]))
    const designationMap = new Map(designations?.map(d => [d.name.toLowerCase().trim(), d.id]))

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000'
    const loginUrl = `${appUrl}/login`

    // 2. Process each user
    for (const [index, userData] of users.entries()) {
      try {
        // Data Normalization (resilience against CSV formatting)
        const normalizedPhone = normalizePhone(userData.phone)
        const normalizedData = {
          ...userData,
          role: userData.role?.toLowerCase().trim(),
          invite_method: userData.invite_method?.toLowerCase().trim() || 'email',
          email: userData.email?.trim() || null,
          phone: normalizedPhone,
          enrollment_no: userData.enrollment_no?.trim() || null,
        }

        // Mapping names to IDs
        const branch_id = normalizedData.branch_name ? branchMap.get(normalizedData.branch_name.toLowerCase().trim()) : null
        const designation_id = normalizedData.designation_name ? designationMap.get(normalizedData.designation_name.toLowerCase().trim()) : null

        // Validate with schema
        const validated = InviteUserSchema.safeParse({
          ...normalizedData,
          branch_id,
          designation_id
        })

        if (!validated.success) {
          results.failed++
          const fieldErrors = validated.error.flatten().fieldErrors
          const firstError = Object.values(fieldErrors).flat()[0] || 'Validation failed'
          results.errors.push({
            row: index + 1,
            name: normalizedData.full_name || 'Unknown',
            error: firstError,
            details: fieldErrors
          })
          continue
        }

        const data = validated.data

        if (!canAssignRole(currentUser.role, data.role)) {
            results.failed++
            results.errors.push({
              row: index + 1,
              name: data.full_name,
              error: `Forbidden role: ${data.role}`
            })
            continue
        }

        const authEmail = data.invite_method === 'email' 
          ? data.email! 
          : getPhoneAuthEmail(data.phone!)

        // Check Conflict
        const { data: conflict } = await supabaseAdmin.rpc('check_user_invitation_conflict', { p_email: authEmail })

        const tempPassword = generateTempPassword()
        let auth_id: string

        if (conflict) {
          const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
          const found = existingUser.users.find(u => u.email === authEmail)
          if (!found) {
            results.failed++
            results.errors.push({ row: index + 1, name: data.full_name, error: 'Conflict detected but user not found' })
            continue
          }
          auth_id = found.id
        } else {
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: authEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: data.full_name,
              tenant_id: currentUser.tenant_id,
              invited: true,
              real_phone: data.invite_method === 'phone' ? data.phone : undefined
            }
          })

          if (authError) {
            results.failed++
            results.errors.push({ row: index + 1, name: data.full_name, error: authError.message })
            continue
          }
          auth_id = authData.user.id
        }

        // Upsert User Profile
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .upsert({
            auth_id,
            tenant_id: currentUser.tenant_id,
            full_name: data.full_name,
            enrollment_no: data.enrollment_no,
            role: data.role,
            phone: data.phone,
            branch_id: data.branch_id,
            designation_id: data.designation_id,
            is_active: true,
            must_change_password: true,
            avatar_url: data.avatar_url,
            invite_method: data.invite_method,
            invited_temp_password: data.invite_method === 'phone' ? tempPassword : null
          }, { onConflict: 'auth_id' })

        if (insertError) {
          results.failed++
          results.errors.push({ row: index + 1, name: data.full_name, error: 'Failed to create profile' })
          continue
        }

        // Update Metadata
        await supabaseAdmin.auth.admin.updateUserById(auth_id, {
          app_metadata: {
            tenant_id: currentUser.tenant_id,
            role: data.role,
            branch_id: data.branch_id
          }
        })

        // Send Invite
        if (data.invite_method === 'email') {
          await sendInviteEmail(data.email!, tenant?.name || 'Mealiez', tempPassword, loginUrl)
        } else {
          await sendInviteSms(data.phone!, tenant?.name || 'Mealiez', tempPassword, loginUrl)
        }

        results.success++

      } catch (err: any) {
        results.failed++
        results.errors.push({
          row: index + 1,
          name: userData.full_name || 'Unknown',
          error: err.message || 'Unexpected error'
        })
      }
    }

    return NextResponse.json(results)

  } catch (err) {
    console.error('[BULK INVITE CRITICAL ERROR]', err)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
