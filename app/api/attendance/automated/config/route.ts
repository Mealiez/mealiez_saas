import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkFeatureEnabled, featureDisabledResponse } from '@/lib/features/gate';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

/**
 * GET /api/attendance/automated/config
 * Lists or fetches config for a branch.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branch_id');

    const supabase = createAdminClient();
    let query = supabase
      .from('attendance_fixed_configs')
      .select('*, branches(name)')
      .eq('tenant_id', user.tenant_id);

    if (branchId) query = query.eq('branch_id', branchId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('[AUTOMATED_CONFIG_GET]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/attendance/automated/config
 * Upserts config for a branch.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isEnabled = await checkFeatureEnabled(user.tenant_id, 'attendance_automated_mode');
    if (!isEnabled) return featureDisabledResponse();

    const body = await req.json();
    const { 
      branch_id, 
      is_enabled, 
      breakfast_start, breakfast_end,
      lunch_start, lunch_end,
      dinner_start, dinner_end
    } = body;

    if (!branch_id) {
      return NextResponse.json({ error: 'Branch ID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if config exists to preserve token, or generate new one
    const { data: existing } = await supabase
      .from('attendance_fixed_configs')
      .select('static_qr_token')
      .eq('branch_id', branch_id)
      .maybeSingle();

    const token = existing?.static_qr_token || crypto.randomBytes(16).toString('hex');

    const { data: config, error } = await supabase
      .from('attendance_fixed_configs')
      .upsert({
        tenant_id: user.tenant_id,
        branch_id,
        is_enabled: is_enabled ?? true,
        static_qr_token: token,
        breakfast_start, breakfast_end,
        lunch_start, lunch_end,
        dinner_start, dinner_end,
        created_by: user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tenant_id, branch_id'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data: config });
  } catch (err: any) {
    console.error('[AUTOMATED_CONFIG_POST]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
