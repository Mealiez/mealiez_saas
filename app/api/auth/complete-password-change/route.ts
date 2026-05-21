import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export async function POST() {
  const supabase = await createClient()
  
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('users')
      .update({ must_change_password: false })
      .eq('auth_id', user.auth_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[PASSWORD CHANGE API ERROR]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
