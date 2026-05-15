import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'
import { z } from 'zod'

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

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const supabase = await createClient()
  let query = supabase
    .from('gas_cylinder_logs')
    .select(`
      id, cylinder_number, cylinder_size_kg, status,
      received_date, installed_date, empty_date,
      refill_date, purchase_price, notes, created_at,
      vendors(id, name, contact_phone)
    `)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data: cylinders, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: cylinders, count: cylinders?.length ?? 0 })
}

const CreateCylinderSchema = z.object({
  cylinder_number: z.string().min(1).max(50).trim(),
  cylinder_size_kg: z.number().positive().optional(),
  vendor_id: z.string().uuid().optional().nullable(),
  status: z.enum([
    'AVAILABLE', 'INSTALLED', 'EMPTY',
    'REFILL_REQUESTED', 'RETURNED'
  ]).default('AVAILABLE'),
  received_date: z.string().optional().nullable(),
  installed_date: z.string().optional().nullable(),
  empty_date: z.string().optional().nullable(),
  refill_date: z.string().optional().nullable(),
  purchase_price: z.number().nonnegative().optional().nullable(),
  notes: z.string().max(500).optional().nullable()
})

export async function POST(request: NextRequest) {
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

  const body = await request.json()
  const parsed = CreateCylinderSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('gas_cylinder_logs')
    .insert({
      ...parsed.data,
      tenant_id: currentUser.tenant_id,
      created_by: currentUser.id
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({
        error: 'Cylinder number already exists in your mess'
      }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
