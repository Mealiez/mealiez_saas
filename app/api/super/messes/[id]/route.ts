/*
 * SECURITY: Super Admin API
 */

import { getSuperAdminUser } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse, NextRequest } from 'next/server'
import { UpdateTenantProfileSchema } from '@/lib/validations/settings'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const superUser = await getSuperAdminUser()
  if (!superUser) {
    return NextResponse.json(
      { error: 'Unauthorized. Super admin access required.' },
      { status: 401 }
    )
  }

  try {
    // Fetch tenant by id (no RLS — service role)
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', params.id)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Fetch tenant's users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role, is_active, created_at')
      .eq('tenant_id', params.id)
      .order('role', { ascending: false })

    if (usersError) throw usersError

    // Fetch feature flags
    const { data: features, error: featuresError } = await supabaseAdmin
      .from('tenant_features')
      .select('feature_key, is_enabled, updated_at')
      .eq('tenant_id', params.id)

    if (featuresError) throw featuresError

    return NextResponse.json({
      tenant,
      users,
      features,
      user_count: users?.length ?? 0,
      admin_count: users?.filter(u => u.role === 'admin').length ?? 0,
      member_count: users?.filter(u => u.role === 'member').length ?? 0
    })
  } catch (error: any) {
    console.error('[SUPER ADMIN MESS GET ERROR]', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const superUser = await getSuperAdminUser()
  if (!superUser) {
    return NextResponse.json(
      { error: 'Unauthorized. Super admin access required.' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const parsed = UpdateTenantProfileSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('tenants')
      .update({ ...parsed.data })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('[SUPER ADMIN MESS PATCH DB ERROR]', error)
      return NextResponse.json(
        { error: 'Failed to update tenant' },
        { status: 500 }
      )
    }

    console.log(
      `[SUPER ADMIN] ${superUser.email} updated tenant ${params.id}:`,
      parsed.data
    )

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('[SUPER ADMIN MESS PATCH ERROR]', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    )
  }
}
