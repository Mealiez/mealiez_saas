/*
 * SECURITY: Tenant Onboarding Route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

/**
 * PRODUCTION-GRADE API ROUTE
 * Enforcing Node.js runtime for atomic onboarding and high-privilege operations.
 */
export const runtime = 'nodejs'

/**
 * rollbackOnboarding()
 * Helper for onboarding failures to prevent zombie accounts.
 */
async function rollbackOnboarding(
  auth_id: string, 
  reason: string
): Promise<void> {
  const supabaseAdmin = createAdminClient()
  console.error(`[ONBOARDING ROLLBACK] Reason: ${reason}`)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(auth_id)
  if (error) {
    console.error('[ROLLBACK FAILED] Auth user orphaned:', auth_id, error)
  }
}

import { sendOtpEmail } from '@/lib/email/otp'

const RegisterSchema = z.object({
  email:     z.string().email(),
  password:  z.string().min(8).max(72),
  full_name: z.string().min(2).max(100).trim(),
  org_name:  z.string().min(2).max(100).trim(),
  logo_url:   z.string().url().optional().nullable(),
  avatar_url: z.string().url().optional().nullable()
})

export async function POST(request: NextRequest) {
  const supabaseAdmin = createAdminClient()
  try {
    // STEP 1 — Parse and validate body
    const body = await request.json()
    const result = RegisterSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { email, password, full_name, org_name, logo_url, avatar_url } = result.data

    // STEP 2 — Check if email already exists in Auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const found = existingUsers.users.find(u => u.email === email)
    if (found) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    // STEP 3 — Send OTP via Resend
    await sendOtpEmail(email, 'registration', {
      password,
      full_name,
      org_name,
      logo_url,
      avatar_url
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Verification code sent to your email.' 
    }, { status: 200 })

  } catch (err: any) {
    console.error('[REGISTRATION_REQUEST_ERROR]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
