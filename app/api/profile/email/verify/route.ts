import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const runtime = 'nodejs'

const VerifyEmailSchema = z.object({
  email: z.string().email(),
  token: z.string().min(6)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = VerifyEmailSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid verification data' }, { status: 400 })
    }

    const { email, token } = result.data
    const supabase = await createClient()

    // Verify OTP for email change
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email_change'
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Email updated successfully' })
  } catch (err) {
    console.error('[EMAIL_VERIFY_CRASH]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
