import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { verifyCustomOtp } from '@/lib/email/otp'

export const runtime = 'nodejs'

const VerifyRegisterSchema = z.object({
  email: z.string().email(),
  otp:   z.string().min(6)
})

export async function POST(request: NextRequest) {
  const supabaseAdmin = createAdminClient()
  try {
    const body = await request.json()
    const result = VerifyRegisterSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid verification data' }, { status: 400 })
    }

    const { email, otp } = result.data

    // 1. Verify custom OTP
    const otpResult = await verifyCustomOtp(email, otp, 'registration')
    if (!otpResult.success) {
      return NextResponse.json({ error: otpResult.error }, { status: 400 })
    }

    const { password, full_name, org_name, logo_url, avatar_url } = otpResult.metadata

    // 2. Create Auth User
    const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const auth_id = userData.user.id

    // 3. Call onboarding function
    const { data: onboardingResult, error: dbError } = await supabaseAdmin.rpc('onboard_new_tenant', {
      p_auth_id:   auth_id,
      p_full_name: full_name,
      p_org_name:  org_name,
      p_plan:      'trial',
      p_logo_url:   logo_url,
      p_avatar_url: avatar_url
    })

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(auth_id)
      return NextResponse.json({ error: 'Database setup failed' }, { status: 500 })
    }

    // 4. Set Metadata
    await supabaseAdmin.auth.admin.updateUserById(auth_id, {
      app_metadata: {
        tenant_id: onboardingResult.tenant_id,
        role:      onboardingResult.role
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Account verified and created successfully!',
      tenant_id: onboardingResult.tenant_id
    }, { status: 201 })

  } catch (err) {
    console.error('[REGISTRATION_VERIFY_CRASH]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
