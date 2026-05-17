import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'
import { z } from 'zod'

/**
 * PRODUCTION-GRADE API ROUTE
 * Enforcing Node.js runtime for sensitive inventory batch status changes.
 */
export const runtime = 'nodejs'

/*
 * Batch Management API
 */

const UpdateBatchSchema = z.object({
  batch_status: z.enum([
    'ACTIVE', 'DEPLETED', 'EXPIRED', 'RECALLED'
  ]).optional(),
  expiry_date: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable()
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  if (!z.string().uuid().safeParse(params.id).success) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const body = await request.json()
  const parsed = UpdateBatchSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
  }

  const supabase = await createClient()

  // STEP 6: Fetch existing batch (verify tenant ownership)
  const { data: currentBatch, error: fetchError } = await supabase
    .from('inventory_batches')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', currentUser.tenant_id)
    .single()

  if (fetchError || !currentBatch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
  }

  const updateData: any = { ...parsed.data }

  // STEP 7: If batch_status changes to 'EXPIRED' or 'RECALLED'
  if (
    parsed.data.batch_status &&
    parsed.data.batch_status !== currentBatch.batch_status &&
    ['EXPIRED', 'RECALLED'].includes(parsed.data.batch_status)
  ) {
    const remaining = currentBatch.remaining_quantity
    if (remaining > 0) {
      // Fetch current stock for transaction
      const { data: stockData } = await supabase
        .from('inventory_stock')
        .select('current_stock')
        .eq('item_id', currentBatch.inventory_item_id)
        .single()

      await supabase.from('inventory_transactions').insert({
        tenant_id: currentUser.tenant_id,
        item_id: currentBatch.inventory_item_id,
        transaction_type: 'wastage',
        quantity: -remaining,
        stock_before: stockData?.current_stock ?? 0,
        notes: `Batch ${currentBatch.batch_number} marked ${parsed.data.batch_status}`,
        created_by: currentUser.id
      })

      // Also update batch remaining_quantity to 0
      updateData.remaining_quantity = 0
    }
  }

  const { data, error: updateError } = await supabase
    .from('inventory_batches')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id)
    .eq('tenant_id', currentUser.tenant_id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
