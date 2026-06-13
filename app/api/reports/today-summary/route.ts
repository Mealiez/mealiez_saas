import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !['admin', 'manager'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // 1. Get Attendance Stats
    const { data: records, error: attendanceError } = await supabase
      .from('attendance_records')
      .select(`
        id,
        marked_at,
        session:attendance_sessions (
          meal_type
        )
      `)
      .eq('tenant_id', user.tenant_id)
      .gte('marked_at', `${today}T00:00:00Z`)
      .lt('marked_at', `${today}T23:59:59Z`);

    if (attendanceError) throw attendanceError;

    // 2. Get Meal Request Stats
    const { data: requests, error: requestsError } = await supabase
      .from('meal_requests')
      .select('id, meal_type, status')
      .eq('tenant_id', user.tenant_id)
      .eq('request_date', today);

    if (requestsError) throw requestsError;

    const summary = {
      date: today,
      attendance: {
        total: records?.length || 0,
        breakfast: records?.filter(r => (r.session as any)?.meal_type === 'breakfast').length || 0,
        lunch: records?.filter(r => (r.session as any)?.meal_type === 'lunch').length || 0,
        dinner: records?.filter(r => (r.session as any)?.meal_type === 'dinner').length || 0,
      },
      requests: {
        total: requests?.length || 0,
        breakfast: requests?.filter(r => r.meal_type === 'breakfast' && r.status === 'requested').length || 0,
        lunch: requests?.filter(r => r.meal_type === 'lunch' && r.status === 'requested').length || 0,
        dinner: requests?.filter(r => r.meal_type === 'dinner' && r.status === 'requested').length || 0,
      }
    };

    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error('[TODAY_SUMMARY_API_ERROR]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
