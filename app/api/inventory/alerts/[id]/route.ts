/*
 * SECURITY: Inventory API
 * tenant_id sourced from JWT only — never from body.
 * Feature flag: inventory_management must be enabled.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'
import { DismissAlertSchema } from '@/lib/validations/inventory'

const FEATURE_KEY = 'inventory_management'

type RouteParams = { params: { id: string } }

/**
 * PATCH: Dismiss alert
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isEnabled = await checkFeatureEnabled(currentUser.tenant_id, FEATURE_KEY)
    if (!isEnabled) return featureDisabledResponse()

    // Role check: manager+ only
    if (!['admin', 'manager'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validated = DismissAlertSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.format() }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('inventory_alerts')
      .update({
        is_dismissed: true,
        dismissed_by: currentUser.id,
        dismissed_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (error) {
      console.error('[INVENTORY_ALERT_PATCH]', error)
      return NextResponse.json({ error: 'Failed to dismiss alert' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[INVENTORY_ALERT_PATCH_CRITICAL]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

