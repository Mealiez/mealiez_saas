import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'

/**
 * GET /api/meal-requests/stats
 * Analytics for Manager+ dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isEnabled = await checkFeatureEnabled(user.tenant_id, 'meal_management')
    if (!isEnabled) return featureDisabledResponse()

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    const supabase = await createClient()

    // 1. Total active users in tenant (for prediction calculation)
    const { count: totalUsers, error: countError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.tenant_id)
      .eq('is_active', true)

    if (countError) {
      console.error('[STATS_COUNT_ERROR]', countError)
    }

    // 2. Meal requests for today
    const { data: requests, error: requestsError } = await supabase
      .from('meal_requests')
      .select('id, user_id, meal_type, status')
      .eq('tenant_id', user.tenant_id)
      .eq('session_date', date)
      .eq('status', 'requested')

    if (requestsError) {
      console.error('[STATS_REQUESTS_ERROR]', requestsError)
      return NextResponse.json({ error: requestsError.message }, { status: 500 })
    }

    // 3. Attendance records for today (actual presence)
    // Refactored: join with attendance_sessions to get meal_type and filter by date
    const { data: attendance, error: attError } = await supabase
      .from('attendance_records')
      .select(`
        user_id,
        attendance_sessions!inner (
          meal_type,
          session_date
        )
      `)
      .eq('tenant_id', user.tenant_id)
      .eq('attendance_sessions.session_date', date)

    if (attError) {
      console.error('[STATS_ATTENDANCE_ERROR]', attError)
      return NextResponse.json({ error: attError.message }, { status: 500 })
    }

    // Correlate requests with attendance
    const requestedUserIds = new Set(requests?.map(r => r.user_id) || [])
    const markedRequests = attendance?.filter(a => requestedUserIds.has(a.user_id)).length || 0

    const stats = {
      total_requests: requests?.length || 0,
      marked_requests: markedRequests,
      total_users: totalUsers || 0,
      prediction_pct: totalUsers ? Math.round(((requests?.length || 0) / totalUsers) * 100) : 0,
      meal_type_breakdown: {
        breakfast: requests?.filter(r => r.meal_type === 'breakfast').length || 0,
        lunch: requests?.filter(r => r.meal_type === 'lunch').length || 0,
        dinner: requests?.filter(r => r.meal_type === 'dinner').length || 0
      },
      attendance_breakdown: {
        present_with_request: markedRequests,
        present_without_request: (attendance?.length || 0) - markedRequests,
        requested_but_absent: (requests?.length || 0) - markedRequests
      }
    }

    return NextResponse.json({ data: stats })

  } catch (err: any) {
    console.error('[STATS_GLOBAL_ERROR]', err)
    return NextResponse.json({ 
      error: err.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    }, { status: 500 })
  }
}
