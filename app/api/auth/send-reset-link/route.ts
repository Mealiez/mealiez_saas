/*
 * SECURITY: Password Reset Link API
 * Uses Resend to deliver Supabase-generated recovery links.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend } from '@/lib/email/resend'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabaseAdmin = createAdminClient()
  const emailFrom = process.env.EMAIL_FROM || 'no-reply@notify.mealiez.in'
  
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // STEP 1: Generate recovery link via Supabase Admin
    // This will work even if the user doesn't exist (returns error)
    // but we want to return a generic success regardless.
    const appUrl = process.env.APP_URL || 'http://localhost:3000'
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase().trim(),
      options: {
        redirectTo: `${appUrl}/reset-password`
      }
    })

    if (linkError) {
      // Log failure server-side only
      console.error('[RESET LINK ERROR]', { email, error: linkError.message })
      // Return generic success to prevent email enumeration
      return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent.' })
    }

    const actionLink = linkData.properties.action_link

    // STEP 2: Send Email via Resend
    const { error: resendError } = await resend.emails.send({
      from: `Mealiez <${emailFrom}>`,
      to: email,
      subject: 'Reset your Mealiez password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; text-align: center; background-color: #ffffff; padding: 40px 20px;">
          <h1 style="color: #f97316; margin: 0 0 30px 0; font-size: 32px; font-weight: 800; letter-spacing: -0.025em;">Mealiez</h1>
          <h2 style="color: #111827; margin-bottom: 15px;">Password Reset Request</h2>
          <p style="color: #4b5563; font-size: 16px;">We received a request to reset your password for your Mealiez account.</p>
          <p style="color: #4b5563; font-size: 16px;">Click the button below to set a new password:</p>
          <div style="margin: 40px 0;">
            <a href="${actionLink}" 
               style="background-color: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
               Reset Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If you didn't request this, you can safely ignore this email. This link will expire shortly.
          </p>
          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 40px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} Mealiez Mess Management</p>
        </div>
      `
    })

    if (resendError) {
      console.error('[RESEND ERROR]', { email, error: resendError })
      // Still return generic success to the client
    }

    // Log success for audit
    await supabaseAdmin.from('recovery_audit_log').insert({
      email: email.toLowerCase().trim(),
      event_type: 'link_sent',
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent')
    })

    return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent.' })

  } catch (err) {
    console.error('[CRITICAL RESET LINK ERROR]', err)
    return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent.' })
  }
}
