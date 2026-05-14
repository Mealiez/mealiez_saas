/*
 * SECURITY: Super Admin API
 */

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/auth/session'
import { NextResponse, NextRequest } from 'next/server'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  const superUser = await getSuperAdminUser()
  if (!superUser) {
    return NextResponse.json(
      { error: 'Unauthorized. Super admin access required.' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const plan = searchParams.get('plan')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const search = searchParams.get('search')

  const offset = (page - 1) * limit

  try {
    let query = supabaseAdmin
      .from('tenants')
      .select(`
        id, name, slug, plan,
        address, city, state,
        contact_email, contact_phone,
        timezone, created_at, updated_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (plan && plan !== 'all') {
      query = query.eq('plan', plan)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: tenants, count, error: tenantsError } = await query.range(offset, offset + limit - 1)

    if (tenantsError) throw tenantsError

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page, limit, total: count || 0, totalPages: 0 }
      })
    }

    // Batch: fetch user counts per tenant
    const tenantIds = tenants.map(t => t.id)
    const { data: userCounts, error: usersError } = await supabaseAdmin
      .from('users')
      .select('tenant_id')
      .in('tenant_id', tenantIds)

    if (usersError) throw usersError

    const memberCountMap: Record<string, number> = {}
    for (const u of userCounts ?? []) {
      memberCountMap[u.tenant_id] = (memberCountMap[u.tenant_id] ?? 0) + 1
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      data: tenants.map(t => ({
        ...t,
        member_count: memberCountMap[t.id] ?? 0
      })),
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    })
  } catch (error: any) {
    console.error('[SUPER ADMIN MESSES ERROR]', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    )
  }
}
