import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'

export const dynamic = 'force-dynamic'

/*
 * Gas Cylinder API
 * Feature flag: 'inventory_management'
 * Roles: admin + manager (read/write)
 *        member (no access)
 * tenant_id: always from JWT
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

  const supabase = await createClient()

  // STEP 4: Call DB function
  const { data: analytics, error: analyticsError } = await supabase
    .rpc('get_gas_analytics', {
      p_tenant_id: currentUser.tenant_id
    })

  if (analyticsError) {
    return NextResponse.json({ error: analyticsError.message }, { status: 500 })
  }

  // STEP 5: Fetch cylinders currently INSTALLED
  const { data: installedCylinders, error: installedError } = await supabase
    .from('gas_cylinder_logs')
    .select(`
      id, cylinder_number, cylinder_size_kg,
      installed_date, vendors(name)
    `)
    .eq('status', 'INSTALLED')
    .eq('tenant_id', currentUser.tenant_id)

  // STEP 6: Fetch cylinders needing refill
  const { data: needsRefill, error: refillError } = await supabase
    .from('gas_cylinder_logs')
    .select('id, cylinder_number, empty_date, notes')
    .in('status', ['EMPTY', 'REFILL_REQUESTED'])
    .eq('tenant_id', currentUser.tenant_id)

  return NextResponse.json({
    analytics,
    currently_installed: installedCylinders ?? [],
    needs_refill: needsRefill ?? []
  })
}
