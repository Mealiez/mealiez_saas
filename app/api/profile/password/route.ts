import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'
import { z } from 'zod'

export const runtime = 'nodejs'

const PasswordUpdateSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(72)
})

export async function POST(request: NextRequest) {
  try {
    const sessionData = await getSession()
    if (!sessionData || !sessionData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const result = PasswordUpdateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid data', details: result.error.flatten() }, { status: 400 })
    }

    const { current_password, new_password } = result.data
    const supabase = await createClient()

    // 1. Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: sessionData.user.email!,
      password: current_password
    })

    if (signInError) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 401 })
    }

    // 2. Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: new_password
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' })
  } catch (err) {
    console.error('[PASSWORD_UPDATE_CRASH]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
