import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

/**
 * GET /api/attendance/schedules
 * Fetch automated session schedules for the tenant.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !['admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('attendance_schedules')
    .select(`
      *,
      branches ( name )
    `)
    .eq('tenant_id', user.tenant_id)
    .order('start_time', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

/**
 * POST /api/attendance/schedules
 * Create a new automated session schedule.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !['admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { meal_type, label, start_time, days_of_week, branch_id, scan_mode } = body

  if (!meal_type || !label || !start_time || !days_of_week || !scan_mode) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('attendance_schedules')
    .insert({
      tenant_id: user.tenant_id,
      meal_type,
      label,
      start_time,
      days_of_week,
      branch_id: branch_id || null,
      scan_mode,
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
