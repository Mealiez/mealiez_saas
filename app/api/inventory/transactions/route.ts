/*
 * SECURITY: Inventory API
 * tenant_id sourced from JWT only — never from body.
 * Feature flag: inventory_management must be enabled.
 * Transactions are immutable — no UPDATE or DELETE.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'
import { CreateTransactionSchema } from '@/lib/validations/inventory'

const FEATURE_KEY = 'inventory_management'

/**
 * GET: Transaction history
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
    const item_id = searchParams.get('item_id')
    const transaction_type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '30')
    const from = (page - 1) * limit
    const to = from + limit - 1

    const supabase = await createClient()
    let query = supabase
      .from('inventory_transactions')
      .select(`
        id, transaction_type, quantity,
        unit_cost, notes,
        stock_before, stock_after, created_at,
        item_id,
        inventory_items ( name, unit ),
        created_by,
        users ( full_name )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (item_id) query = query.eq('item_id', item_id)
    if (transaction_type) query = query.eq('transaction_type', transaction_type)

    const { data, error, count } = await query

    if (error) {
      console.error('[INVENTORY_TRANSACTIONS_GET]', error)
      return NextResponse.json({ error: 'Failed to fetch transaction history' }, { status: 500 })
    }

    return NextResponse.json({
      data,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil((count ?? 0) / limit)
      }
    })
  } catch (err) {
    console.error('[INVENTORY_TRANSACTIONS_GET_CRITICAL]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST: Add transaction
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isEnabled = await checkFeatureEnabled(currentUser.tenant_id, FEATURE_KEY)
    if (!isEnabled) return featureDisabledResponse()

    // Role check: manager+ only
    if (!['owner', 'admin', 'manager'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validated = CreateTransactionSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.format() }, { status: 400 })
    }

    const supabase = await createClient()

    // Step 5: Fetch current stock for the item
    const { data: stock, error: stockError } = await supabase
      .from('inventory_stock')
      .select('current_stock')
      .eq('item_id', validated.data.item_id)
      .single()

    if (stockError || !stock) {
      return NextResponse.json({ error: 'Item not found or no stock record' }, { status: 404 })
    }

    // Step 6: Validate stock will not go negative
    const projectedStock = Number(stock.current_stock) + validated.data.quantity
    if (projectedStock < 0) {
      return NextResponse.json({
        error: 'Insufficient stock.',
        current_stock: stock.current_stock,
        requested: Math.abs(validated.data.quantity),
        shortfall: Math.abs(projectedStock)
      }, { status: 422 })
    }

    // Step 7: Insert transaction
    const { data: tx, error: txError } = await supabase
      .from('inventory_transactions')
      .insert({
        tenant_id: currentUser.tenant_id,
        item_id: validated.data.item_id,
        transaction_type: validated.data.transaction_type,
        quantity: validated.data.quantity,
        unit_cost: validated.data.unit_cost ?? null,
        notes: validated.data.notes ?? null,
        stock_before: stock.current_stock,
        stock_after: projectedStock, // Trigger re-calculates but we provide intent
        created_by: currentUser.id
      })
      .select(`
        *,
        inventory_items ( name, unit ),
        users ( full_name )
      `)
      .single()

    if (txError) {
      console.error('[INVENTORY_TRANSACTIONS_POST]', txError)
      return NextResponse.json({ error: txError.message || 'Failed to record transaction' }, { status: 422 })
    }

    return NextResponse.json({
      transaction: tx,
      new_stock: projectedStock
    }, { status: 201 })
  } catch (err) {
    console.error('[INVENTORY_TRANSACTIONS_POST_CRITICAL]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
