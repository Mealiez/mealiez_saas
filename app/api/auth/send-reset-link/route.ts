/*
 * SECURITY: Password Reset Link API
 * Uses Resend to deliver Supabase-generated recovery links.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend } from '@/lib/email/resend'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  console.log('[AUTH]', 'Using Resend provider')
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
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase().trim(),
      options: {
        redirectTo: `${new URL(request.url).origin}/reset-password`
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
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password for your Mealiez account.</p>
          <p>Click the button below to set a new password:</p>
          <div style="margin: 30px 0;">
            <a href="${actionLink}" 
               style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
               Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            If you didn't request this, you can safely ignore this email. This link will expire shortly.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="font-size: 12px; color: #999;">© Mealiez Mess Management</p>
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
