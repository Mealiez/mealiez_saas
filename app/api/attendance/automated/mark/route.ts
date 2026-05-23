import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { checkFeatureEnabled } from '@/lib/features/gate';
import { MarkAttendanceSchema } from '@/lib/validations/attendance';

export const runtime = 'nodejs';

/**
 * UTILITY: Determine meal type from current time and config windows.
 * Returns null if current time is outside any meal window.
 */
function getActiveMeal(config: any, currentTime: string): 'breakfast' | 'lunch' | 'dinner' | null {
  const isBetween = (start: string, end: string, target: string) => {
    return target >= start && target <= end;
  };

  if (isBetween(config.breakfast_start, config.breakfast_end, currentTime)) return 'breakfast';
  if (isBetween(config.lunch_start, config.lunch_end, currentTime)) return 'lunch';
  if (isBetween(config.dinner_start, config.dinner_end, currentTime)) return 'dinner';

  return null;
}

export async function POST(req: NextRequest) {
  try {
    // STEP 1: Authenticate user (Identity only)
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // STEP 2: Feature Gate Check
    const isEnabled = await checkFeatureEnabled(currentUser.tenant_id, 'attendance_automated_mode');
    if (!isEnabled) {
      return NextResponse.json(
        { error: 'Automated attendance is not enabled for your organization.', code: 'FEATURE_DISABLED' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = MarkAttendanceSchema.safeParse(body);
    if (!validated.success || validated.data.type !== 'automated') {
      return NextResponse.json({ error: 'Invalid automated request' }, { status: 400 });
    }

    const supabase = await createClient();

    // STEP 3: Resolve QR Token & Config
    const { data: config, error: configError } = await supabase
      .from('attendance_fixed_configs')
      .select('*')
      .eq('static_qr_token', validated.data.session_token)
      .eq('tenant_id', currentUser.tenant_id)
      .eq('is_enabled', true)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Invalid or disabled QR code' }, { status: 404 });
    }

    // STEP 4: Validate Branch
    // User must be assigned to the branch where the QR is sticking.
    if (config.branch_id !== (currentUser.branch_id || null)) {
      return NextResponse.json({ 
        error: 'Attendance not allowed for this branch. Please scan at your assigned location.',
        code: 'BRANCH_MISMATCH' 
      }, { status: 403 });
    }

    // STEP 5: Determine active meal based on current time
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const activeMeal = getActiveMeal(config, currentTime);

    if (!activeMeal) {
      return NextResponse.json({ 
        error: 'No active meal session at this time. Please check meal windows.',
        code: 'WINDOW_CLOSED' 
      }, { status: 409 });
    }

    // STEP 6: Mark Attendance (Idempotency handled by UNIQUE index in DB)
    const { data: record, error: insertError } = await supabase
      .from('attendance_records')
      .insert({
        tenant_id: currentUser.tenant_id,
        user_id: currentUser.id,
        branch_id: config.branch_id,
        meal_type: activeMeal,
        attendance_source: 'automated',
        method: 'qr'
      })
      .select()
      .single();

    if (insertError) {
      // Check for duplicate meal today
      if (insertError.code === '23505') {
        return NextResponse.json({
          error: `You have already marked attendance for ${activeMeal} today.`,
          code: 'ALREADY_MARKED'
        }, { status: 409 });
      }
      throw insertError;
    }

    // STEP 7: Resolve Branch Name for UI
    const { data: branch } = await supabase
      .from('branches')
      .select('name')
      .eq('id', config.branch_id)
      .single();

    return NextResponse.json({
      success: true,
      message: `Attendance marked for ${activeMeal}`,
      record: {
        id: record.id,
        marked_at: record.marked_at,
        meal_type: activeMeal,
        source: 'automated',
        branch_name: branch?.name || 'Assigned Branch'
      }
    }, { status: 201 });

  } catch (err: any) {
    console.error('[AUTOMATED_MARK_POST_ERROR]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
