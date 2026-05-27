import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

/**
 * PATCH /api/settings/designations/[id]
 * Update a designation (Admin only).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('designations')
    .update({
      name: body.name.trim(),
    })
    .eq('id', params.id)
    .eq('tenant_id', user.tenant_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}

/**
 * DELETE /api/settings/designations/[id]
 * Delete a designation (Admin only).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('designations')
    .delete()
    .eq('id', params.id)
    .eq('tenant_id', user.tenant_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
