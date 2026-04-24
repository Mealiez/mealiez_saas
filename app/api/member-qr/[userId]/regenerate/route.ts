import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { generateMemberQRToken } from '@/lib/attendance/token'
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Manager+ only
  if (!['owner', 'admin', 'manager'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isEnabled = await checkFeatureEnabled(currentUser.tenant_id, 'attendance_tracking')
  if (!isEnabled) {
    return featureDisabledResponse()
  }

  const targetUserId = params.userId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!targetUserId || !uuidRegex.test(targetUserId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
  }

  const supabase = await createClient()
  
  // Verify target user exists in same tenant and is active
  const { data: targetUser, error: targetError } = await supabase
    .from('users')
    .select('id, full_name, is_active, tenant_id')
    .eq('id', targetUserId)
    .eq('tenant_id', currentUser.tenant_id)
    .maybeSingle()

  if (targetError || !targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (!targetUser.is_active) {
    return NextResponse.json({ error: 'Cannot regenerate QR for inactive user' }, { status: 409 })
  }

  // Count existing QR records for version bump
  const { count } = await supabaseAdmin
    .from('member_qr_codes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', targetUserId)
  
  const newVersion = (count ?? 0) + 1

  // Generate new token
  const token = generateMemberQRToken(
    targetUserId,
    currentUser.tenant_id,
    newVersion
  )

  // Call DB function (atomically revokes old)
  const { error: rpcError } = await supabaseAdmin.rpc('generate_member_qr', {
    p_user_id: targetUserId,
    p_tenant_id: currentUser.tenant_id,
    p_issued_by: currentUser.id,
    p_token: token
  })

  if (rpcError) {
    console.error('[MEMBER QR REGENERATE ERROR] RPC failed', rpcError)
    return NextResponse.json({ error: 'Failed to regenerate QR code' }, { status: 500 })
  }

  console.log(`[QR REGENERATED] user: ${targetUserId} by ${currentUser.id}`)

  return NextResponse.json({
    success: true,
    message: 'QR code regenerated. Previous code is now invalid.',
    token: token,
    version: newVersion,
    regenerated_by: currentUser.full_name
  }, { status: 200 })
}
