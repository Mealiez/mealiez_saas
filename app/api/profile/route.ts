import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { z } from 'zod'

export const runtime = 'nodejs'

const UpdateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  avatar_url: z.preprocess((val) => val === '' ? null : val, z.string().url().optional().nullable())
})

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const result = UpdateProfileSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid data', details: result.error.flatten() }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('users')
      .update(result.data)
      .eq('id', currentUser.id)
      .select()
      .single()

    if (error) {
      console.error('[PROFILE_UPDATE_ERROR]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[PROFILE_UPDATE_CRASH]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
