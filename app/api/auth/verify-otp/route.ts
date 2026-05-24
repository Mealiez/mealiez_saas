/*
 * SECURITY: Password Reset OTP Verification API
 * Verifies the 6-digit OTP hash and updates the Supabase Auth password.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export const runtime = 'nodejs'

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = createAdminClient()

  try {
    const { email, otp, newPassword } = await request.json()

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()
    const otpHash = hashOTP(otp)

    // STEP 1: Fetch OTP record
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('password_reset_otps')
      .select('*')
      .eq('email', cleanEmail)
      .eq('used', false)
      .single()

    if (otpError || !otpRecord) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    }

    // STEP 2: Check attempts
    if (otpRecord.attempts >= 5) {
      return NextResponse.json({ error: 'Too many attempts. Please request a new OTP.' }, { status: 400 })
    }

    // STEP 3: Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 })
    }

    // STEP 4: Verify Hash
    if (otpRecord.otp_hash !== otpHash) {
      // Increment attempts
      await supabaseAdmin
        .from('password_reset_otps')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id)

      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    }

    // STEP 5: Find Auth User ID
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers()
    const user = userData.users.find(u => u.email === cleanEmail)

    if (!user) {
      // Should not happen if send-otp verified existence, but for safety:
      return NextResponse.json({ error: 'Recovery failed' }, { status: 500 })
    }

    // STEP 6: Update Password via Admin SDK
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('[PASSWORD UPDATE ERROR]', updateError)
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    // STEP 7: Mark OTP as used
    await supabaseAdmin
      .from('password_reset_otps')
      .update({ used: true })
      .eq('id', otpRecord.id)

    // Log success
    await supabaseAdmin.from('recovery_audit_log').insert({
      email: cleanEmail,
      event_type: 'otp_success',
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent')
    })

    return NextResponse.json({ success: true, message: 'Password has been reset successfully.' })

  } catch (err) {
    console.error('[CRITICAL OTP VERIFY ERROR]', err)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
