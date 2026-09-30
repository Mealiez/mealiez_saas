import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/session';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'manager', 'owner'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { latitude, longitude, accuracy } = await req.json();

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Latitude and longitude required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify session belongs to tenant
    const { data: session, error: verifyError } = await supabase
      .from('attendance_sessions')
      .select('id, tenant_id')
      .eq('id', params.id)
      .eq('tenant_id', currentUser.tenant_id)
      .single();

    if (verifyError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('attendance_sessions')
      .update({
        admin_latitude: latitude,
        admin_longitude: longitude,
        admin_accuracy: accuracy || null,
        admin_location_updated_at: new Date().toISOString()
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('[LOCATION_SYNC_DB_ERROR]', updateError);
      return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[LOCATION_SYNC_ERROR]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
