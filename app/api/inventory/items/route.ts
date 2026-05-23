/*
 * SECURITY: Inventory API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'
import { CreateItemSchema } from '@/lib/validations/inventory'

/**
 * PRODUCTION-GRADE API ROUTE
 * Enforcing Node.js runtime for critical inventory ledger operations.
 */
export const runtime = 'nodejs'

const FEATURE_KEY = 'inventory_management'

/**
 * GET: List items
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ROLE-BASED AUTH: Only manager+ can view inventory items/stock
    if (!['admin', 'manager'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isEnabled = await checkFeatureEnabled(currentUser.tenant_id, FEATURE_KEY)
    if (!isEnabled) return featureDisabledResponse()

    const { searchParams } = new URL(request.url)
    const category_id = searchParams.get('category_id')
    const is_active = searchParams.get('is_active') ?? 'true'

    const supabase = await createClient()
    let query = supabase
      .from('inventory_items')
      .select(`
        id, name, description, unit,
        min_stock_level, is_active, created_at,
        category_id,
        inventory_categories (
          id, name, color
        ),
        inventory_stock (
          current_stock, last_updated_at
        )
      `)
      .order('name', { ascending: true })

    if (category_id) {
      query = query.eq('category_id', category_id)
    }

    if (is_active !== 'all') {
      query = query.eq('is_active', is_active === 'true')
    }

    const { data, error } = await query

    if (error) {
      console.error('[INVENTORY_ITEMS_GET]', error)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[INVENTORY_ITEMS_GET_CRITICAL]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST: Create item
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isEnabled = await checkFeatureEnabled(currentUser.tenant_id, FEATURE_KEY)
    if (!isEnabled) return featureDisabledResponse()

    // Role check: admin+ only
    if (!['admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const validated = CreateItemSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.format() }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Step 5: Insert item
    const { data: item, error: insertError } = await supabase
      .from('inventory_items')
      .insert({
        tenant_id: currentUser.tenant_id,
        ...validated.data
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Item name already exists' }, { status: 409 })
      }
      console.error('[INVENTORY_ITEMS_POST_INSERT]', insertError)
      return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
    }

    // Step 6: Initialize stock row
    const { error: rpcError } = await supabase.rpc('initialize_item_stock', {
      p_item_id: item.id,
      p_tenant_id: currentUser.tenant_id
    })

    if (rpcError) {
      console.error('[INVENTORY_ITEMS_POST_RPC]', rpcError)
    }

    return NextResponse.json(item, { status: 201 })
  } catch (err) {
    console.error('[INVENTORY_ITEMS_POST_CRITICAL]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
