/*
 * SECURITY: Admin Scan (Mode B Attendance)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth/session'
import { verifyMemberQRToken } from '@/lib/attendance/token'
import { checkFeatureEnabled } from '@/lib/features/gate'
import crypto from 'node:crypto'

/**
 * PRODUCTION-GRADE API ROUTE
 * Enforcing Node.js runtime for stable crypto and admin operations.
 */
export const runtime = 'nodejs'

async function writeAuditLog(params: {
  tenant_id: string
  scan_mode: 'member'
  scanned_by: string | null
  target_user_id: string | null
  session_id: string | null
  outcome: string
  ip_address: string | null
  user_agent: string | null
}): Promise<void> {
  const supabaseAdmin = createAdminClient()
  try {
    await supabaseAdmin
      .from('qr_scan_audit_log')
      .insert({
        ...params,
        scanned_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('[AUDIT LOG ERROR] Failed to write QR scan audit log', error)
  }
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = createAdminClient()
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Role check: Only manager+ can use admin scanner
  if (!['admin', 'manager'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isEnabled = await checkFeatureEnabled(currentUser.tenant_id, 'attendance_tracking')
  if (!isEnabled) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 403 })
  }

  const ip = request.headers.get('x-forwarded-for')
    ?? request.headers.get('x-real-ip')
    ?? null
  const ua = request.headers.get('user-agent') ?? null

  const baseAudit = {
    tenant_id: currentUser.tenant_id,
    scan_mode: 'member' as const,
    scanned_by: currentUser.id,
    ip_address: ip,
    user_agent: ua
  }

  let body: any
  try {
    body = await request.json()
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { member_token, session_id } = body

  if (!member_token || !session_id || typeof session_id !== 'string') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const qrResult = verifyMemberQRToken(member_token)
  
  if (!qrResult.valid) {
    await writeAuditLog({
      ...baseAudit,
      outcome: 'invalid_signature',
      target_user_id: null,
      session_id: session_id
    })
    return NextResponse.json({
      error: 'Invalid QR code',
      code: 'INVALID_SIGNATURE'
    }, { status: 400 })
  }
  
  const { user_id, tenant_id } = qrResult.payload

  if (tenant_id !== currentUser.tenant_id) {
    await writeAuditLog({
      ...baseAudit,
      outcome: 'tenant_mismatch',
      target_user_id: user_id,
      session_id: session_id
    })
    return NextResponse.json({
      error: 'QR code belongs to different organization',
      code: 'TENANT_MISMATCH'
    }, { status: 403 })
  }

  const { data: storedQR } = await supabaseAdmin
    .from('member_qr_codes')
    .select('token, is_revoked')
    .eq('user_id', user_id)
    .eq('tenant_id', tenant_id)
    .eq('is_revoked', false)
    .maybeSingle()
  
  if (!storedQR || storedQR.is_revoked) {
    await writeAuditLog({
      ...baseAudit,
      outcome: 'revoked',
      target_user_id: user_id,
      session_id: session_id
    })
    return NextResponse.json({
      error: 'This QR code has been revoked',
      code: 'QR_REVOKED'
    }, { status: 400 })
  }

  const tokBuf = Buffer.from(member_token)
  const dbBuf = Buffer.from(storedQR.token)
  if (
    tokBuf.length !== dbBuf.length ||
    !crypto.timingSafeEqual(tokBuf, dbBuf)
  ) {
    await writeAuditLog({
      ...baseAudit,
      outcome: 'revoked',
      target_user_id: user_id,
      session_id: session_id
    })
    return NextResponse.json({
      error: 'QR code is outdated. Ask member to refresh.',
      code: 'QR_VERSION_MISMATCH'
    }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: member } = await supabase
    .from('users')
    .select(`
      id,
      full_name,
      phone,
      role,
      is_active,
      created_at,
      branches (
        name
      )
    `)
    .eq('id', user_id)
    .eq('tenant_id', currentUser.tenant_id)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // @ts-ignore - Supabase join result
  const branchName = member.branches?.name || 'Main Branch'

  if (!member.is_active) {
    await writeAuditLog({
      ...baseAudit,
      outcome: 'user_inactive',
      target_user_id: user_id,
      session_id: session_id
    })
    return NextResponse.json({
      error: 'Member account is inactive',
      code: 'USER_INACTIVE',
      member: {
        full_name: member.full_name,
        role: member.role,
        is_active: false
      }
    }, { status: 403 })
  }

  const { data: session } = await supabase
    .from('attendance_sessions')
    .select('id, is_active, scan_mode, label, session_date, meal_type, ended_at')
    .eq('id', session_id)
    .eq('tenant_id', currentUser.tenant_id)
    .maybeSingle()

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (session.scan_mode !== 'member') {
    return NextResponse.json({
      error: 'This session uses member-scan mode, not admin-scan',
      code: 'WRONG_SCAN_MODE'
    }, { status: 409 })
  }

  if (!session.is_active || session.ended_at) {
    await writeAuditLog({
      ...baseAudit,
      outcome: 'session_closed',
      target_user_id: user_id,
      session_id: session_id
    })
    return NextResponse.json({
      error: 'Session is closed',
      code: 'SESSION_CLOSED',
      member: { full_name: member.full_name }
    }, { status: 409 })
  }

  const { data: existing } = await supabaseAdmin
    .from('attendance_records')
    .select('id, marked_at')
    .eq('session_id', session_id)
    .eq('user_id', user_id)
    .maybeSingle()

  if (existing) {
    await writeAuditLog({
      ...baseAudit,
      outcome: 'already_marked',
      target_user_id: user_id,
      session_id: session_id
    })
    return NextResponse.json({
      success: true,
      already_marked: true,
      marked_at: existing.marked_at,
      member: {
        full_name: member.full_name,
        role: member.role,
        phone: member.phone,
        branch_name: branchName
      },
      session: {
        label: session.label,
        meal_type: session.meal_type,
        date: session.session_date
      }
    }, { status: 200 })
  }

  const markedAt = new Date().toISOString()
  const { error: insertError } = await supabaseAdmin
    .from('attendance_records')
    .insert({
      tenant_id: currentUser.tenant_id,
      session_id: session_id,
      user_id: user_id,
      method: 'qr_member',
      marked_at: markedAt
    })

  if (insertError) {
    if (insertError.code === '23505') {
       return NextResponse.json({
        success: true,
        already_marked: true,
        marked_at: markedAt,
        member: {
          full_name: member.full_name,
          role: member.role,
          phone: member.phone,
          branch_name: branchName
        },
        session: {
          label: session.label,
          meal_type: session.meal_type,
          date: session.session_date
        }
      }, { status: 200 })
    }
    return NextResponse.json({ error: 'Failed to record attendance' }, { status: 500 })
  }

  await writeAuditLog({
    ...baseAudit,
    outcome: 'success',
    target_user_id: user_id,
    session_id: session_id
  })

  return NextResponse.json({
    success: true,
    already_marked: false,
    marked_at: markedAt,
    member: {
      id: member.id,
      full_name: member.full_name,
      role: member.role,
      phone: member.phone,
      branch_name: branchName,
      is_active: member.is_active,
      member_since: member.created_at
    },
    session: {
      label: session.label,
      meal_type: session.meal_type,
      date: session.session_date
    }
  }, { status: 201 })
}
