/*
 * SECURITY: Inventory API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'
import { UpdateCategorySchema } from '@/lib/validations/inventory'

/**
 * PRODUCTION-GRADE API ROUTE
 * Enforcing Node.js runtime for critical inventory categorization and management.
 */
export const runtime = 'nodejs'

const FEATURE_KEY = 'inventory_management'

type RouteParams = { params: { id: string } }

/**
 * PATCH: Update category
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
    const validated = UpdateCategorySchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.format() }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('inventory_categories')
      .update(validated.data)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('[INVENTORY_CATEGORY_PATCH]', error)
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[INVENTORY_CATEGORY_PATCH_CRITICAL]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE: Remove category
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

    // Check if items reference this category
    const { count, error: countError } = await supabase
      .from('inventory_items')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', params.id)

    if (countError) {
      console.error('[INVENTORY_CATEGORY_DELETE_CHECK]', countError)
      return NextResponse.json({ error: 'Failed to verify category usage' }, { status: 500 })
    }

    if (count && count > 0) {
      return NextResponse.json({
        error: 'Cannot delete category with items.',
        hint: 'Reassign items first.'
      }, { status: 409 })
    }

    const { error: deleteError } = await supabase
      .from('inventory_categories')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('[INVENTORY_CATEGORY_DELETE]', deleteError)
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[INVENTORY_CATEGORY_DELETE_CRITICAL]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
