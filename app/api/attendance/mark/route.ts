import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { MarkAttendanceSchema } from '@/lib/validations/attendance';
import { verifyQRToken } from '@/lib/attendance/token';
import { checkFeatureEnabled } from '@/lib/features/gate';

/*
 * CRITICAL SECURITY: Mark attendance endpoint.
 * This endpoint is called by members scanning a QR.
 */

function getTokenError(reason: string): string {
  switch (reason) {
    case 'Token expired':
      return 'This QR code has expired. Ask your admin to refresh it.';
    case 'Invalid signature':
      return 'Invalid QR code. Please scan the correct code.';
    default:
      return 'Invalid QR code. Please try again.';
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isEnabled = await checkFeatureEnabled(currentUser.tenant_id, 'attendance_tracking');
    if (!isEnabled) {
      return NextResponse.json(
        { error: 'Attendance tracking is not enabled.', code: 'FEATURE_DISABLED' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = MarkAttendanceSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // STEP 4: Verify QR token
    const result = verifyQRToken(validated.data.session_token);

    if (!result.valid) {
      return NextResponse.json(
        { error: getTokenError(result.reason), code: result.reason },
        { status: 400 }
      );
    }

    // STEP 5: Cross-validate tenant
    if (result.payload.tenant_id !== currentUser.tenant_id) {
      return NextResponse.json(
        { error: 'This QR code belongs to a different organization.', code: 'TENANT_MISMATCH' },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    // STEP 6: Verify session is still active
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('id, is_active, label')
      .eq('id', result.payload.session_id)
      .eq('tenant_id', currentUser.tenant_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (!session.is_active) {
      return NextResponse.json(
        { error: 'This attendance session is closed.', code: 'SESSION_CLOSED' },
        { status: 409 }
      );
    }

    // STEP 7: Insert attendance record (idempotent)
    const { data: record, error: recordError } = await supabase
      .from('attendance_records')
      .insert({
        tenant_id: currentUser.tenant_id,
        session_id: result.payload.session_id,
        user_id: currentUser.id,
        method: 'qr'
      })
      .select()
      .single();

    if (recordError) {
      // Handle unique constraint violation (idempotency)
      if (recordError.code === '23505') {
        return NextResponse.json({
          success: true,
          already_marked: true,
          message: 'You have already marked attendance for this session.'
        }, { status: 200 });
      }
      throw recordError;
    }

    return NextResponse.json({
      success: true,
      already_marked: false,
      message: `Attendance marked for ${session.label}`,
      marked_at: record.marked_at,
      session: {
        label: session.label,
        meal_type: result.payload.meal_type
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('[MARK_ATTENDANCE_POST]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
