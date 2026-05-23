import { requireAuth } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import AttendanceTable from '../AttendanceTable';

/*
 * SERVER COMPONENT: Attendance Session Records
 * Displays historical session data.
 */

export default async function AttendanceRecordsPage() {
  const user = await requireAuth();
  const supabase = await createClient();

  // Fetch today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Fetch branches for filter (Admin only)
  const { data: branches } = await supabase
    .from('branches')
    .select('id, name')
    .eq('is_active', true);

  let query = supabase
    .from('attendance_sessions')
    .select(`
      id, session_date, meal_type, label,
      is_active, started_at, ended_at, scan_mode,
      branches (
        name
      )
    `);

  // BRANCH FILTERING LOGIC
  if (user.role !== 'admin' && user.branch_id) {
    query = query.eq('branch_id', user.branch_id);
  }

  const { data: sessions } = await query.order('session_date', { ascending: false }).limit(50);

  const canManage = ['admin', 'manager'].includes(user.role);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Attendance Records</h1>
          <p className="text-gray-500 font-medium">Historical mess check-in data</p>
        </div>
      </div>

      <AttendanceTable 
        initialSessions={sessions?.map(s => ({
          ...s,
          // @ts-ignore
          branch_name: s.branches?.name || 'Main'
        })) || []} 
        canManage={canManage} 
        currentUser={user}
      />
    </div>
  );
}
