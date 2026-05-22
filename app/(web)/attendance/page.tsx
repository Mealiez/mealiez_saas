import { requireAuth } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import AttendanceTable from './AttendanceTable';

/*
 * SERVER COMPONENT: Attendance Dashboard
 * Fetches today's sessions and checks user roles.
 */

export default async function AttendancePage() {
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
    `)
    .eq('session_date', today);

  // BRANCH FILTERING LOGIC
  // Admin: Sees all, can filter
  // Manager/Member: Forced to own branch
  if (user.role !== 'admin' && user.branch_id) {
    query = query.eq('branch_id', user.branch_id);
  }

  const { data: sessions } = await query.order('started_at', { ascending: false });

  const canManage = ['admin', 'manager'].includes(user.role);

  const formattedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Attendance Tracking</h1>
            <p className="text-gray-500 font-medium">{formattedDate}</p>
          </div>
          
          {user.role === 'admin' && branches && branches.length > 0 && (
             <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Branch:</span>
               <select className="bg-white border border-gray-200 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                 <option value="all">All Locations</option>
                 {branches.map(b => (
                   <option key={b.id} value={b.id}>{b.name}</option>
                 ))}
               </select>
             </div>
          )}
        </div>

        <AttendanceTable 
          initialSessions={sessions?.map(s => ({
            ...s,
            // @ts-ignore
            branch_name: s.branches?.name || 'Main'
          })) || []} 
          canManage={canManage} 
        />
      </div>
    </div>
  );
}
