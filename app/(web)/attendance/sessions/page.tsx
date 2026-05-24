import { requireAuth } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AttendanceTable from '../AttendanceTable';

/*
 * SERVER COMPONENT: Manage Attendance Sessions
 * Allows managers to create and manage dynamic meal sessions.
 */

export default async function ManageSessionsPage() {
  const user = await requireAuth();

  // ROLE-BASED AUTH: Only manager+ can manage manual sessions
  if (!['admin', 'manager'].includes(user.role)) {
    redirect('/attendance');
  }

  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];

  // Fetch today's sessions
  let query = supabase
    .from('attendance_sessions')
    .select(`
      id, session_date, meal_type, label,
      is_active, started_at, ended_at, scan_mode,
      branches (
        name
      )
    `)
    .eq('session_date', today);

  if (user.role !== 'admin' && user.branch_id) {
    query = query.eq('branch_id', user.branch_id);
  }

  const { data: sessions } = await query.order('started_at', { ascending: false });
  const canManage = ['admin', 'manager'].includes(user.role);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Manual Sessions</h1>
          <p className="text-gray-500 font-medium">Create and manage temporary meal sessions</p>
        </div>
      </div>

      <AttendanceTable 
        initialSessions={sessions?.map(s => ({
          ...s,
          // @ts-expect-error: Supabase join relation results in nested object mapping
          branch_name: s.branches?.name || 'Global'
        })) || []} 
        canManage={canManage} 
        currentUser={user}
      />

    </div>
  );
}
