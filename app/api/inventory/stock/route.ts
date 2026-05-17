/*
 * SECURITY: Inventory API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'

/**
 * PRODUCTION-GRADE API ROUTE
 * Enforcing Node.js runtime for critical inventory monitoring.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FEATURE_KEY = 'inventory_management'

/**
 * GET: Stock overview
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isEnabled = await checkFeatureEnabled(currentUser.tenant_id, FEATURE_KEY)
    if (!isEnabled) return featureDisabledResponse()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'all' | 'low_stock' | 'out_of_stock' | 'ok'

    const supabase = await createClient()
    const { data, error } = await supabase
      .rpc('get_stock_overview', {
        p_tenant_id: currentUser.tenant_id
      })

    if (error) {
      console.error('[INVENTORY_STOCK_GET]', error)
      return NextResponse.json({ error: 'Failed to fetch stock overview' }, { status: 500 })
    }

    const allData = data as any[]
    let filteredData = allData

    if (status && status !== 'all') {
      filteredData = allData.filter(row => row.stock_status === status)
    }

    const summary = {
      total_items: allData.length,
      out_of_stock: allData.filter(r => r.stock_status === 'out_of_stock').length,
      low_stock: allData.filter(r => r.stock_status === 'low_stock').length,
      ok: allData.filter(r => r.stock_status === 'ok').length
    }

    return NextResponse.json({
      data: filteredData,
      summary
    })
  } catch (err) {
    console.error('[INVENTORY_STOCK_GET_CRITICAL]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
