import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { isAdminOrAbove } from '@/lib/auth/roles'

/**
 * Fetch attendance logs for a specific user
 */
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    // Security: Only admins can view others' logs, or users can view their own (though this is an admin-scoped page)
    if (!isAdminOrAbove(currentUser.role) && currentUser.id !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createClient()

    // Find the user first to handle system ID vs Auth ID if needed
    // But usually params.id is the public.users.id
    const { data: userLogs, error } = await supabase
      .from('attendance_records')
      .select(`
        id,
        marked_at,
        method,
        session_id (
          label,
          meal_type,
          session_date
        )
      `)
      .eq('user_id', params.id)
      .order('marked_at', { ascending: false })

    if (error) {
      console.error('[USER_ATTENDANCE_GET_ERROR]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: userLogs })
  } catch (err) {
    console.error('[USER_ATTENDANCE_CRASH]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
