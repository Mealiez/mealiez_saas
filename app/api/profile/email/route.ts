import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'
import { z } from 'zod'

export const runtime = 'nodejs'

const EmailUpdateSchema = z.object({
  new_email: z.string().email()
})

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
    const supabase = await createClient()

    // Trigger email change. 
    // NOTE: This will send a confirmation to the NEW email address.
    const { error } = await supabase.auth.updateUser({ email: new_email })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Confirmation code sent to your new email address.' 
    })
  } catch (err) {
    console.error('[EMAIL_UPDATE_CRASH]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
