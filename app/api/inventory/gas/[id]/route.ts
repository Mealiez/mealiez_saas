import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'
import { z } from 'zod'

/**
 * PRODUCTION-GRADE API ROUTE
 * Enforcing Node.js runtime for critical gas inventory lifecycle tracking.
 */
export const runtime = 'nodejs'

/*
 * Gas Cylinder API
 */

const UpdateCylinderSchema = z.object({
  status: z.enum([
    'AVAILABLE', 'INSTALLED', 'EMPTY',
    'REFILL_REQUESTED', 'RETURNED'
  ]).optional(),
  installed_date: z.string().optional().nullable(),
  empty_date: z.string().optional().nullable(),
  refill_date: z.string().optional().nullable(),
  returned_date: z.string().optional().nullable(),
  purchase_price: z.number().nonnegative().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  vendor_id: z.string().uuid().optional().nullable()
})

const VALID_TRANSITIONS: Record<string, string[]> = {
  'AVAILABLE': ['INSTALLED', 'RETURNED'],
  'INSTALLED': ['EMPTY'],
  'EMPTY': ['REFILL_REQUESTED', 'RETURNED'],
  'REFILL_REQUESTED': ['AVAILABLE', 'RETURNED'],
  'RETURNED': []
}

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
  const parsed = UpdateCylinderSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch current status
  const { data: current, error: fetchError } = await supabase
    .from('gas_cylinder_logs')
    .select('status, tenant_id')
    .eq('id', params.id)
    .single()

  if (fetchError || !current) {
    return NextResponse.json({ error: 'Cylinder not found' }, { status: 404 })
  }

  // Tenant isolation check
  if (current.tenant_id !== currentUser.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updateData: any = { ...parsed.data }

  // Status transition validation
  if (parsed.data.status && parsed.data.status !== current.status) {
    const allowed = VALID_TRANSITIONS[current.status] ?? []
    if (!allowed.includes(parsed.data.status)) {
      return NextResponse.json({
        error: `Cannot transition from ${current.status} to ${parsed.data.status}`,
        code: 'INVALID_TRANSITION',
        valid_transitions: allowed
      }, { status: 409 })
    }

    // Auto-set dates based on status transition
    const today = new Date().toISOString().split('T')[0]
    if (parsed.data.status === 'INSTALLED' && !parsed.data.installed_date) {
      updateData.installed_date = today
    }
    if (parsed.data.status === 'EMPTY' && !parsed.data.empty_date) {
      updateData.empty_date = today
    }
    if (parsed.data.status === 'REFILL_REQUESTED' && !parsed.data.refill_date) {
      updateData.refill_date = today
    }
  }

  const { data, error: updateError } = await supabase
    .from('gas_cylinder_logs')
    .update({
      ...updateData,
      updated_by: currentUser.id
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
