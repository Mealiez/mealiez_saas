/*
 * SECURITY: Branch Management API - Single Branch Operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth/session'

export const runtime = 'nodejs'

/**
 * PATCH /api/branches/[id]
 * Updates an existing branch.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update branches
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update branches' }, { status: 403 })
    }

    const body = await request.json()
    const { name, code, address, city, state, pincode, manager_name, manager_phone } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and Code are required' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Update the branch
    const { data: branch, error } = await supabaseAdmin
      .from('branches')
      .update({
        name,
        code,
        address,
        city,
        state,
        pincode,
        manager_name,
        manager_phone
      })
      .eq('id', params.id)
      .eq('tenant_id', user.tenant_id) // SECURITY: Ensure branch belongs to tenant
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Branch code already exists' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ data: branch })
  } catch (err: any) {
    console.error('[BRANCH PATCH ERROR]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * DELETE /api/branches/[id]
 * Deletes an existing branch.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete branches
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete branches' }, { status: 403 })
    }

    const supabaseAdmin = createAdminClient()

    // Delete the branch
    const { error } = await supabaseAdmin
      .from('branches')
      .delete()
      .eq('id', params.id)
      .eq('tenant_id', user.tenant_id) // SECURITY: Ensure branch belongs to tenant

    if (error) {
      // Check if there are foreign key constraints (e.g. users assigned to branch)
      if (error.code === '23503') {
        return NextResponse.json({ 
          error: 'Cannot delete branch because it has assigned members or records. Deactivate it instead.' 
        }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[BRANCH DELETE ERROR]', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
