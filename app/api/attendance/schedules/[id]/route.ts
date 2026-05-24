import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user || !['admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  const supabase = await createClient()
  const { error } = await supabase
    .from('attendance_schedules')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user || !['admin', 'manager'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { id } = params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('attendance_schedules')
    .update(body)
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
