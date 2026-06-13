import { requireAuth } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AttendanceLogsContent from './AttendanceLogsContent';

export const dynamic = 'force-dynamic'

/*
 * SERVER COMPONENT: Attendance Logs
 * Fetches filtered records from the database.
 */

export default async function AttendanceLogsPage({
  searchParams
}: {
  searchParams: { date?: string; meal_type?: string; branch_id?: string }
}) {
  const user = await requireAuth();

  // ROLE-BASED AUTH: Only manager+ can view logs
  if (!['admin', 'manager'].includes(user.role)) {
    redirect('/attendance');
  }

  const supabase = await createClient();

  const filterDate = searchParams.date || new Date().toISOString().split('T')[0];
  const startOfDay = new Date(filterDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const filterMeal = searchParams.meal_type || 'all';
  const filterBranch = searchParams.branch_id || 'all';

  // 1. Fetch Branches for Filter
  const { data: branches } = await supabase
    .from('branches')
    .select('id, name')
    .eq('is_active', true);

  // 2. Build Logs Query
  let query = supabase
    .from('attendance_records')
    .select(`
      id, marked_at, method,
      session:attendance_sessions!inner (
        meal_type,
        branch_id,
        branch:branches ( name )
      ),
      user:users ( 
        full_name,
        designation:designations(name)
      )
    `)
    .gte('marked_at', startOfDay.toISOString())
    .lt('marked_at', endOfDay.toISOString());

  if (filterMeal !== 'all') {
    query = query.eq('attendance_sessions.meal_type', filterMeal);
  }

  if (filterBranch !== 'all') {
    if (filterBranch === 'global') {
      query = query.is('attendance_sessions.branch_id', null);
    } else {
      query = query.eq('attendance_sessions.branch_id', filterBranch);
    }
  }

  // Mandatory Tenant isolation
  query = query.eq('tenant_id', user.tenant_id);

  // If Manager, further isolate by their branch (unless it's a global record and they have access)
  // For simplicity, we stick to tenant isolation + filter.
  
  const { data: logs } = await query.order('marked_at', { ascending: false }).limit(200);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Attendance Logs</h1>
          <p className="text-gray-500 font-medium text-sm">Detailed record of all system check-ins</p>
        </div>
      </div>

      <AttendanceLogsContent 
        initialLogs={(logs as any) || []} 
        branches={branches || []} 
      />
    </div>
  );
}
