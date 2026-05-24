import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const runtime = 'nodejs'

const VerifyEmailSchema = z.object({
  email: z.string().email(),
  token: z.string().min(6)
})

import { verifyCustomOtp } from '@/lib/email/otp'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = VerifyEmailSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid verification data' }, { status: 400 })
    }

    const { email, token } = result.data
    
    // 1. Verify custom OTP from our table
    const otpResult = await verifyCustomOtp(email, token, 'email_change')
    if (!otpResult.success) {
      return NextResponse.json({ error: otpResult.error }, { status: 400 })
    }

    // 2. Perform the actual email update in Supabase Auth
    const supabaseAdmin = createAdminClient()
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      otpResult.metadata.user_id,
      { email: email }
    )

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Email updated successfully' })
  } catch (err) {
    console.error('[EMAIL_VERIFY_CRASH]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
