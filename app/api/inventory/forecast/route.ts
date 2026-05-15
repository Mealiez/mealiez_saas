import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'

/*
 * Shortage Forecasting API
 * Feature flag: inventory_management
 * Roles: admin + manager
 *
 * GET /api/inventory/forecast
 *   Returns shortage forecast for all active items.
 *   Powered by run_shortage_forecast() DB function.
 *   Query params:
 *     days: lookback window (default 30)
 */

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isEnabled = await checkFeatureEnabled(currentUser.tenant_id, 'inventory_management')
  if (!isEnabled) {
    return featureDisabledResponse()
  }

  if (!['admin', 'manager'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // STEP 4: Parse query params
  let days = parseInt(request.nextUrl.searchParams.get('days') ?? '30')
  // Clamp: 7 <= days <= 90
  days = Math.max(7, Math.min(90, days))

  const supabase = await createClient()

  // STEP 5: Call DB function
  const { data, error } = await supabase
    .rpc('run_shortage_forecast', {
      p_tenant_id: currentUser.tenant_id,
      p_days: days
    })

  if (error) {
    console.error('[FORECAST API ERROR]', error)
    return NextResponse.json({ error: 'Forecast calculation failed' }, { status: 500 })
  }

  // STEP 6: Group by alert level
  const forecast = data ?? []
  const grouped = {
    CRITICAL: forecast.filter((f: any) => f.alert_level === 'CRITICAL'),
    WARNING: forecast.filter((f: any) => f.alert_level === 'WARNING'),
    INFO: forecast.filter((f: any) => f.alert_level === 'INFO')
  }

  // STEP 7: Return 200
  return NextResponse.json({
    generated_at: new Date().toISOString(),
    lookback_days: days,
    summary: {
      total_items: forecast.length,
      critical_count: grouped.CRITICAL.length,
      warning_count: grouped.WARNING.length,
      info_count: grouped.INFO.length
    },
    forecast: forecast, // full sorted list
    by_level: grouped // pre-grouped for UI
  })
}
