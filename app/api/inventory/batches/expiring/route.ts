import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'

export const dynamic = 'force-dynamic'

/*
 * GET: batches expiring soon
 * Feature flag: inventory_management
 * Roles: admin + manager
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

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '7')

  const supabase = await createClient()

  // STEP 4: Fetch from expiring_batches_view
  // We join inventory_batches to get purchase_price for value calculation
  const { data, error } = await supabase
    .from('expiring_batches_view')
    .select(`
      *,
      inventory_batches(purchase_price)
    `)
    .eq('tenant_id', currentUser.tenant_id)
    .lte('days_until_expiry', days)
    .order('days_until_expiry', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Map data to flatten purchase_price
  const flattenedData = data.map((b: any) => ({
    ...b,
    purchase_price: b.inventory_batches?.purchase_price ?? 0
  }))

  // STEP 5: Group by expiry_status
  const grouped = {
    EXPIRED: flattenedData.filter(b => b.expiry_status === 'EXPIRED'),
    EXPIRES_TODAY: flattenedData.filter(b => b.expiry_status === 'EXPIRES_TODAY'),
    CRITICAL: flattenedData.filter(b => b.expiry_status === 'CRITICAL'),
    WARNING: flattenedData.filter(b => b.expiry_status === 'WARNING')
  }

  // STEP 6: Calculate expired_inventory_value
  const expiredValue = grouped.EXPIRED.reduce((sum, b) =>
    sum + (b.remaining_quantity * b.purchase_price), 0
  )

  return NextResponse.json({
    grouped,
    summary: {
      total_expiring: flattenedData.length,
      expired_count: grouped.EXPIRED.length,
      expires_today_count: grouped.EXPIRES_TODAY.length,
      critical_count: grouped.CRITICAL.length,
      warning_count: grouped.WARNING.length,
      expired_value: expiredValue
    }
  })
}
