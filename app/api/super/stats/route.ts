/*
 * SECURITY: Super Admin API
 */

import { getSuperAdminUser } from '@/lib/auth/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * PRODUCTION-GRADE API ROUTE
 * Enforcing Node.js runtime for high-privilege platform analytics.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  // Lazy-initialize the admin client inside the request handler.
  const supabaseAdmin = createAdminClient()
  
  const superUser = await getSuperAdminUser()
  if (!superUser) {
    return NextResponse.json(
      { error: 'Unauthorized. Super admin access required.' },
      { status: 401 }
    )
  }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [tenantsResult, usersResult, mealsResult, attendanceResult] = await Promise.all([
      // Tenant counts by plan
      supabaseAdmin
        .from('tenants')
        .select('id, plan, created_at'),

      // User counts by role
      supabaseAdmin
        .from('users')
        .select('id, role, tenant_id, is_active, created_at'),

      // Meal counts (from attendance_records as proxy)
      supabaseAdmin
        .from('attendance_records')
        .select('id, marked_at')
        .gte('marked_at', thirtyDaysAgo),

      // Active sessions today
      supabaseAdmin
        .from('attendance_sessions')
        .select('id, is_active')
        .eq('is_active', true)
    ])

    if (tenantsResult.error) throw tenantsResult.error
    if (usersResult.error) throw usersResult.error
    if (mealsResult.error) throw mealsResult.error
    if (attendanceResult.error) throw attendanceResult.error

    const tenants = tenantsResult.data ?? []
    const users = usersResult.data ?? []
    const meals = mealsResult.data ?? []

    return NextResponse.json({
      platform: {
        total_tenants: tenants.length,
        active_tenants: tenants.length, 
        total_users: users.length,
        active_users: users.filter(u => u.is_active).length,
        meals_this_month: meals.length,
        active_sessions: attendanceResult.data?.length ?? 0
      },
      by_plan: {
        trial: tenants.filter(t => t.plan === 'trial').length,
        starter: tenants.filter(t => t.plan === 'starter').length,
        pro: tenants.filter(t => t.plan === 'pro').length,
        enterprise: tenants.filter(t => t.plan === 'enterprise').length
      },
      by_role: {
        admins: users.filter(u => u.role === 'admin').length,
        managers: users.filter(u => u.role === 'manager').length,
        members: users.filter(u => u.role === 'member').length
      },
      growth: {
        new_tenants_30d: tenants.filter(t => new Date(t.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        new_users_30d: users.filter(u => new Date(u.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length
      }
    })
  } catch (error: any) {
    console.error('[SUPER ADMIN STATS ERROR]', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    )
  }
}
