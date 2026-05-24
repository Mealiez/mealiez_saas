/*
 * SECURITY: Branch Management API
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth/session'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'

export const runtime = 'nodejs'

/**
 * GET /api/branches
 * Lists all active branches for the tenant.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin
      .from('branches')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('[BRANCHES GET ERROR]', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * POST /api/branches
 * Creates a new branch. Enforces plan limits.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Check feature flag
    const isFeatureEnabled = await checkFeatureEnabled(user.tenant_id, 'branch_management')
    if (!isFeatureEnabled) {
      return featureDisabledResponse()
    }

    // 2. Check Role (Admin only)
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create branches' }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, address, city, state, pincode, manager_name, manager_phone } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and Code are required' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // 3. Plan Limit Validation
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('plan')
      .eq('id', user.tenant_id)
      .single()

    const { count } = await supabaseAdmin
      .from('branches')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.tenant_id)

    const branchLimit = tenant?.plan === 'enterprise' ? 999 : (tenant?.plan === 'pro' ? 5 : 1)
    
    if ((count || 0) >= branchLimit) {
      return NextResponse.json({ 
        error: `Plan limit reached. Your ${tenant?.plan} plan allows only ${branchLimit} branch(es).`,
        code: 'LIMIT_REACHED'
      }, { status: 403 })
    }

    // 4. Insert
    const { data: branch, error } = await supabaseAdmin
      .from('branches')
      .insert({
        tenant_id: user.tenant_id,
        name,
        code,
        address,
        city,
        state,
        pincode,
        manager_name,
        manager_phone
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Branch code already exists' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ data: branch }, { status: 201 })
  } catch (err: any) {
    console.error('[BRANCHES POST ERROR]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
