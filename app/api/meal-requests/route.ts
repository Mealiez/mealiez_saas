import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'

/**
 * GET /api/meal-requests
 * Fetch meal requests for the current user (member) or all for the tenant (manager+).
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isEnabled = await checkFeatureEnabled(user.tenant_id, 'meal_management')
  if (!isEnabled) return featureDisabledResponse()

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const userId = searchParams.get('user_id')

  const supabase = await createClient()
  let query = supabase
    .from('meal_requests')
    .select(`
      *,
      users (
        full_name,
        email,
        branch_id,
        branches ( name )
      )
    `)
    .eq('tenant_id', user.tenant_id)
    .eq('status', 'requested') // Only fetch active requests for the UI indicators

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
    console.error('[MEAL_REQUESTS_GET_ERROR]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

/**
 * POST /api/meal-requests
 * One-click meal request or cancellation.
 */
export async function POST(request: NextRequest) {
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
    // We use a hard delete then insert or hard update to ensure status is 'requested'
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
    // For cancellation, we just delete the record to avoid unique constraint issues on next re-book
    // and to keep the GET query simple.
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
}
