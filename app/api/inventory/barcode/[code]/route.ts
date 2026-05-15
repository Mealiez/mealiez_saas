import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth/session'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'

/*
 * Barcode Lookup API
 * Feature flag: inventory_management
 * Roles: admin + manager
 *
 * Step 1: local product_catalog lookup (instant)
 * Step 2: Open Food Facts (external, if not found)
 * Step 3: Cache result in product_catalog via service role
 *
 * IMPORTANT:
 * External API calls are made server-side ONLY.
 * No API keys exposed to client.
 * product_catalog INSERT uses service_role client.
 * Barcode data is cached forever (immutable product data).
 */

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

interface BarcodeProduct {
  product_name: string
  brand: string | null
  category: string | null
  package_size: number | null
  unit: string | null
  image_url: string | null
  default_shelf_life_days: number | null
  source: string
}

async function lookupOpenFoodFacts(
  barcode: string
): Promise<BarcodeProduct | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      {
        headers: { 'User-Agent': 'Mealiez/1.0' },
        signal: AbortSignal.timeout(5000)
        // 5 second timeout
      }
    )

    if (!res.ok) return null

    const data = await res.json()

    if (data.status !== 1 || !data.product) return null

    const p = data.product

    // Extract quantity: "5 kg" → { size: 5, unit: 'kg' }
    let packageSize: number | null = null
    let unit: string | null = null
    if (p.quantity) {
      const match = p.quantity.match(/^(\d+\.?\d*)\s*([a-zA-Z]+)/)
      if (match) {
        packageSize = parseFloat(match[1])
        unit = match[2].toLowerCase()
      }
    }

    return {
      product_name: p.product_name ?? p.generic_name ?? 'Unknown',
      brand: p.brands?.split(',')[0]?.trim() ?? null,
      category: p.food_groups_tags?.[0]?.replace('en:', '') ?? null,
      package_size: packageSize,
      unit,
      image_url: p.image_small_url ?? p.image_url ?? null,
      default_shelf_life_days: null,
      // Open Food Facts doesn't provide shelf life
      source: 'open_food_facts'
    }
  } catch (error) {
    console.error('[BARCODE LOOKUP ERROR]', error)
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
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

  const barcode = params.code.trim()
  if (barcode.length < 4 || barcode.length > 30) {
    return NextResponse.json({ error: 'Invalid barcode length' }, { status: 400 })
  }

  const supabase = await createClient()

  // STEP 5: Check local product_catalog
  const { data: cached } = await supabase
    .from('product_catalog')
    .select('*')
    .eq('barcode', barcode)
    .single()

  if (cached) {
    return NextResponse.json({
      found: true,
      source: 'local_cache',
      product: cached
    })
  }

  // STEP 6: Query Open Food Facts
  const external = await lookupOpenFoodFacts(barcode)

  if (!external) {
    return NextResponse.json({
      found: false,
      source: 'not_found',
      product: null,
      message: 'Product not found. Enter details manually.'
    })
  }

  // STEP 7: Cache result in product_catalog
  const { error: insertError } = await supabaseAdmin
    .from('product_catalog')
    .insert({
      barcode,
      ...external,
      verified: false
    })

  // On conflict: already cached by concurrent request
  // (Constraint violation check isn't strictly necessary due to logic above,
  // but supabaseAdmin will return an error if it fails)

  return NextResponse.json({
    found: true,
    source: external.source,
    product: { barcode, ...external }
  })
}
