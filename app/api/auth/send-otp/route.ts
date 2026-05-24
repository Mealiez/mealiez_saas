/*
 * SECURITY: Password Reset OTP Generation API
 * Generates and delivers a 6-digit OTP via Resend.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend } from '@/lib/email/resend'
import crypto from 'crypto'

export const runtime = 'nodejs'

function generateOTP(): string {
  // Generate a random 6-digit number
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = createAdminClient()
  const emailFrom = process.env.EMAIL_FROM || 'no-reply@notify.mealiez.in'

  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()

    // STEP 1: Verify user exists globally (auth.users)
    // We do this server-side to decide whether to actually send, 
    // but we return generic success to the client.
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers()
    const user = userData.users.find(u => u.email === cleanEmail)

    if (!user) {
      return NextResponse.json({ success: true, message: 'If an account exists, an OTP has been sent.' })
    }

    // STEP 2: Generate and Hash OTP
    const otp = generateOTP()
    const hash = hashOTP(otp)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // STEP 3: Delete previous OTPs and store new one
    // We do this in a transaction-like way by deleting then inserting
    await supabaseAdmin
      .from('password_reset_otps')
      .delete()
      .eq('email', cleanEmail)

    const { error: dbError } = await supabaseAdmin
      .from('password_reset_otps')
      .insert({
        email: cleanEmail,
        otp_hash: hash,
        expires_at: expiresAt.toISOString()
      })

    if (dbError) {
      console.error('[OTP DB ERROR]', dbError)
      return NextResponse.json({ success: true, message: 'If an account exists, an OTP has been sent.' })
    }

    // STEP 4: Send OTP via Resend
    const { error: resendError } = await resend.emails.send({
      from: `Mealiez <${emailFrom}>`,
      to: cleanEmail,
      subject: 'Mealiez Password Recovery',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
          <h2 style="color: #4f46e5;">Mealiez</h2>
          <h3>Password Recovery</h3>
          <p>Use the following code to reset your password:</p>
          <div style="background: #f3f4f6; padding: 20px; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 8px;">
            ${otp}
          </div>
          <p style="color: #666;">This code expires in 10 minutes.</p>
          <p style="font-size: 14px; color: #999; margin-top: 30px;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
      `
    })

    if (resendError) {
      console.error('[OTP RESEND ERROR]', resendError)
    }

    // Log for audit
    await supabaseAdmin.from('recovery_audit_log').insert({
      email: cleanEmail,
      event_type: 'otp_sent',
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent')
    })

    return NextResponse.json({ success: true, message: 'If an account exists, an OTP has been sent.' })

  } catch (err) {
    console.error('[CRITICAL OTP SEND ERROR]', err)
    return NextResponse.json({ success: true, message: 'If an account exists, an OTP has been sent.' })
  }
}
