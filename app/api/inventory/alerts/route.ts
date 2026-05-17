/*
 * SECURITY: Inventory API
 * tenant_id sourced from JWT only — never from body.
 * Feature flag: inventory_management must be enabled.
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'

export const dynamic = 'force-dynamic'

const FEATURE_KEY = 'inventory_management'

/**
 * GET: Active alerts
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isEnabled = await checkFeatureEnabled(currentUser.tenant_id, FEATURE_KEY)
    if (!isEnabled) return featureDisabledResponse()

    const supabase = await createClient()
    const { data, error, count } = await supabase
      .from('inventory_alerts')
      .select(`
        id, alert_type, current_stock,
        min_stock_level, created_at,
        item_id,
        inventory_items ( name, unit )
      `, { count: 'exact' })
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[INVENTORY_ALERTS_GET]', error)
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }

    return NextResponse.json({
      data,
      count
    })
  } catch (err) {
    console.error('[INVENTORY_ALERTS_GET_CRITICAL]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
