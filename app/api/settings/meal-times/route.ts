import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

/**
 * GET /api/settings/meal-times
 * Fetch the meal time configuration for the current tenant.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('meal_settings')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

/**
 * PATCH /api/settings/meal-times
 * Update the meal time configuration (Admin only).
 */
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Basic validation could be added here
  
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('meal_settings')
    .update({
      breakfast_start: body.breakfast_start,
      breakfast_end:   body.breakfast_end,
      lunch_start:     body.lunch_start,
      lunch_end:       body.lunch_end,
      dinner_start:    body.dinner_start,
      dinner_end:      body.dinner_end,
      timezone:        body.timezone,
    })
    .eq('tenant_id', user.tenant_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
