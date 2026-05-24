import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'
import { z } from 'zod'

export const runtime = 'nodejs'

const EmailUpdateSchema = z.object({
  new_email: z.string().email()
})

import { sendOtpEmail } from '@/lib/email/otp'

export async function POST(request: NextRequest) {
  try {
    const sessionData = await getSession()
    if (!sessionData || !sessionData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const result = EmailUpdateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid email', details: result.error.flatten() }, { status: 400 })
    }

    const { new_email } = result.data

    // Send custom OTP via Resend
    await sendOtpEmail(new_email, 'email_change', {
      user_id: sessionData.user.id
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Verification code sent to your new email address.' 
    })
  } catch (err: any) {
    console.error('[EMAIL_UPDATE_CRASH]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
