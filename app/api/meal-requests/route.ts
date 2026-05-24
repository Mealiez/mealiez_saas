import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'

/**
 * GET /api/meal-requests
 * Fetch meal requests for the current user (member) or all for the tenant (manager+).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isEnabled = await checkFeatureEnabled(user.tenant_id, 'meal_management')
    if (!isEnabled) return featureDisabledResponse()

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const userId = searchParams.get('user_id')

    const supabase = await createClient()
    
    // Build query - REMOVED 'email' as it doesn't exist in public.users
    let query = supabase
      .from('meal_requests')
      .select(`
        id,
        session_date,
        meal_type,
        status,
        requested_at,
        user_id,
        tenant_id,
        users:user_id (
          full_name,
          branch_id
        )
      `)
      .eq('tenant_id', user.tenant_id)

    if (user.role === 'member') {
      query = query.eq('user_id', user.id)
    } else if (userId) {
      query = query.eq('user_id', userId)
    }

    if (date) {
      query = query.eq('session_date', date)
    }

    const { data, error } = await query.order('session_date', { ascending: false })

    if (error) {
      console.error('[MEAL_REQUESTS_GET_SUPABASE_ERROR]', error)
      return NextResponse.json({ 
        error: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({ data })

  } catch (err: any) {
    console.error('[MEAL_REQUESTS_GET_CRASH]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * POST /api/meal-requests
 * One-click meal request or cancellation.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isEnabled = await checkFeatureEnabled(user.tenant_id, 'meal_management')
    if (!isEnabled) return featureDisabledResponse()

    let body: any
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { session_date, meal_type, action } = body

    if (!session_date || !meal_type || !['request', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 })
    }

    const supabase = await createClient()

    if (action === 'request') {
      const { data, error } = await supabase
        .from('meal_requests')
        .upsert({
          tenant_id: user.tenant_id,
          user_id: user.id,
          session_date,
          meal_type,
          status: 'requested'
        }, {
          onConflict: 'user_id, session_date, meal_type'
        })
        .select()
        .single()

      if (error) {
        console.error('[MEAL_REQUEST_POST_ERROR]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, data })
    } else {
      const { error } = await supabase
        .from('meal_requests')
        .delete()
        .eq('tenant_id', user.tenant_id)
        .eq('user_id', user.id)
        .eq('session_date', session_date)
        .eq('meal_type', meal_type)

      if (error) {
        console.error('[MEAL_REQUEST_CANCEL_ERROR]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }
  } catch (err: any) {
    console.error('[MEAL_REQUESTS_POST_CRASH]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
