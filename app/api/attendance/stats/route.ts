import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch Today's Records with meal_type from session
    const { data: records, error } = await supabase
      .from('attendance_records')
      .select(`
        id,
        session:attendance_sessions (
          meal_type
        )
      `)
      .eq('tenant_id', user.tenant_id)
      .gte('marked_at', today.toISOString())
      .lt('marked_at', tomorrow.toISOString());

    if (error) throw error;

    const stats = {
      total: records?.length || 0,
      breakfast: records?.filter(r => (r.session as any)?.meal_type === 'breakfast').length || 0,
      lunch: records?.filter(r => (r.session as any)?.meal_type === 'lunch').length || 0,
      dinner: records?.filter(r => (r.session as any)?.meal_type === 'dinner').length || 0,
    };

    return NextResponse.json({ stats });
  } catch (err: any) {
    console.error('[ATTENDANCE_STATS_API_ERROR]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
