/*
 * SECURITY: Inventory API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'
import { CreateCategorySchema } from '@/lib/validations/inventory'

/**
 * PRODUCTION-GRADE API ROUTE
 * Enforcing Node.js runtime for inventory categorization and administrative tasks.
 */
export const runtime = 'nodejs'

const FEATURE_KEY = 'inventory_management'

/**
 * GET: List categories
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
    const { data, error } = await supabase
      .from('inventory_categories')
      .select('id, name, description, color, created_at')
      .order('name', { ascending: true })

    if (error) {
      console.error('[INVENTORY_CATEGORIES_GET]', error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[INVENTORY_CATEGORIES_GET_CRITICAL]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST: Create category
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
    const validated = CreateCategorySchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.format() }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('inventory_categories')
      .insert({
        tenant_id: currentUser.tenant_id,
        ...validated.data
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Category name already exists' }, { status: 409 })
      }
      console.error('[INVENTORY_CATEGORIES_POST]', error)
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[INVENTORY_CATEGORIES_POST_CRITICAL]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
