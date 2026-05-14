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

export async function GET() {
  const superUser = await getSuperAdminUser()
  if (!superUser) {
    return NextResponse.json(
      { error: 'Unauthorized. Super admin access required.' },
      { status: 401 }
    )
  }

  try {
    const { data: tenants, error } = await supabaseAdmin
      .from('tenants')
      .select('id, name, slug, plan, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    const tenantIds = tenants.map(t => t.id)
    const { data: userCounts } = await supabaseAdmin
      .from('users')
      .select('tenant_id')
      .in('tenant_id', tenantIds)

    const memberCountMap: Record<string, number> = {}
    for (const u of userCounts ?? []) {
      memberCountMap[u.tenant_id] = (memberCountMap[u.tenant_id] ?? 0) + 1
    }

    return NextResponse.json({
      data: tenants.map(t => ({
        ...t,
        member_count: memberCountMap[t.id] ?? 0
      }))
    })
  } catch (error: any) {
    console.error('[SUPER ADMIN SUBSCRIPTIONS GET ERROR]', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const superUser = await getSuperAdminUser()
  if (!superUser) {
    return NextResponse.json(
      { error: 'Unauthorized. Super admin access required.' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { tenant_id, plan } = body

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
    }

    const allowedPlans = ['trial', 'starter', 'pro', 'enterprise']
    if (!allowedPlans.includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('tenants')
      .update({ plan })
      .eq('id', tenant_id)

    if (updateError) throw updateError

    // Seed any newly unlocked features
    await supabaseAdmin.rpc('seed_tenant_features', {
      p_tenant_id: tenant_id
    })

    console.log(
      `[SUPER ADMIN] ${superUser.email} changed tenant ${tenant_id} plan to ${plan}`
    )

    return NextResponse.json({
      success: true,
      tenant_id,
      new_plan: plan,
      message: `Plan updated to ${plan}`
    })
  } catch (error: any) {
    console.error('[SUPER ADMIN SUBSCRIPTIONS PATCH ERROR]', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    )
  }
}
