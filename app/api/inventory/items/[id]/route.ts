/*
 * SECURITY: Inventory API
 * tenant_id sourced from JWT only — never from body.
 * Feature flag: inventory_management must be enabled.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'
import { UpdateItemSchema } from '@/lib/validations/inventory'

const FEATURE_KEY = 'inventory_management'

type RouteParams = { params: { id: string } }

/**
 * PATCH: Update item
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

    // Role check: admin+ only
    if (!['admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validated = UpdateItemSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.format() }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('inventory_items')
      .update(validated.data)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('[INVENTORY_ITEM_PATCH]', error)
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[INVENTORY_ITEM_PATCH_CRITICAL]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE: Deactivate item (soft delete)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isEnabled = await checkFeatureEnabled(currentUser.tenant_id, FEATURE_KEY)
    if (!isEnabled) return featureDisabledResponse()

    // Role check: admin+ only
    if (!['admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('inventory_items')
      .update({ is_active: false })
      .eq('id', params.id)

    if (error) {
      console.error('[INVENTORY_ITEM_DELETE]', error)
      return NextResponse.json({ error: 'Failed to deactivate item' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Item deactivated' })
  } catch (err) {
    console.error('[INVENTORY_ITEM_DELETE_CRITICAL]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

