import { requireAuth } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ArrowRight, 
  BarChart3, 
  ClipboardList,
  ListTodo,
  Zap,
  QrCode
} from 'lucide-react';

/*
 * SERVER COMPONENT: Attendance Module Dashboard
 * Entry point for Manager+ users.
 */

export default async function AttendanceDashboard() {
  const user = await requireAuth();
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // 1. Fetch Today's Analytics
  const { data: stats } = await supabase
    .from('attendance_records')
    .select('meal_type')
    .eq('tenant_id', user.tenant_id)
    .gte('marked_at', `${today}T00:00:00`)
    .lte('marked_at', `${today}T23:59:59`);

  const counts = {
    total: stats?.length || 0,
    breakfast: stats?.filter(r => r.meal_type === 'breakfast').length || 0,
    lunch: stats?.filter(r => r.meal_type === 'lunch').length || 0,
    dinner: stats?.filter(r => r.meal_type === 'dinner').length || 0,
  };

  // 2. Fetch Active Sessions
  const { data: activeSessions } = await supabase
    .from('attendance_sessions')
    .select(`
      id, label, meal_type, started_at,
      branches ( name )
    `)
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)
    .order('started_at', { ascending: false });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Welcome & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase flex items-center gap-3">
             Attendance Dashboard
          </h1>
          <p className="text-gray-500 font-medium mt-1">Real-time check-in analytics and session management</p>
        </div>
        <div className="flex gap-2">
           <Link href="/attendance/sessions">
              <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20">
                <Zap className="mr-2 w-4 h-4" /> Start Quick Session
              </Button>
           </Link>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-3xl border-none shadow-sm bg-gray-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest opacity-60">Total Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">{counts.total}</div>
          </CardContent>
        </Card>
        
        {[
          { label: 'Breakfast', count: counts.breakfast, color: 'bg-amber-400' },
          { label: 'Lunch', count: counts.lunch, color: 'bg-blue-500' },
          { label: 'Dinner', count: counts.dinner, color: 'bg-indigo-600' }
        ].map((item) => (
          <Card key={item.label} className="rounded-3xl border-none shadow-sm bg-white border border-gray-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-400">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-gray-900">{item.count}</div>
              <div className="w-full bg-gray-50 h-1.5 rounded-full mt-3 overflow-hidden">
                 <div className={cn("h-full", item.color)} style={{ width: `${(item.count / (counts.total || 1)) * 100}%` }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Sessions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Active Live Sessions</h3>
           <Link href="/attendance/sessions" className="text-xs font-bold text-blue-600 hover:underline flex items-center">
             View All Sessions <ArrowRight className="ml-1 w-3 h-3" />
           </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeSessions?.map((session) => (
            <Card key={session.id} className="rounded-[2rem] border-2 border-indigo-50 shadow-sm overflow-hidden hover:border-indigo-200 transition-all">
               <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                     <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                           <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Live Now</p>
                        </div>
                        <h4 className="text-xl font-bold text-gray-900">{session.label}</h4>
                        <p className="text-xs text-gray-500 font-medium">
                           {/* @ts-ignore */}
                           {session.branches?.name || 'Global'} • Started {new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                     </div>
                     <Link href={`/attendance/${session.id}`}>
                        <Button className="rounded-2xl h-12 px-6 bg-gray-900 hover:bg-black font-black uppercase tracking-tight text-xs">
                           <QrCode className="mr-2 w-4 h-4" /> View QR
                        </Button>
                     </Link>
                  </div>
               </CardContent>
            </Card>
          ))}
          {activeSessions?.length === 0 && (
            <div className="col-span-full py-12 text-center bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
               <p className="text-gray-400 font-medium italic">No dynamic sessions are active. Use 'Quick Mode' to start one.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Links / Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Link href="/attendance/logs" className="group">
            <Card className="rounded-3xl p-6 border-2 border-gray-50 hover:border-blue-100 hover:bg-blue-50/20 transition-all">
               <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                  <ClipboardList size={24} />
               </div>
               <h4 className="font-bold text-gray-900">Attendance Logs</h4>
               <p className="text-xs text-gray-500 mt-1">Detailed history of all check-ins with filters.</p>
            </Card>
         </Link>

         <Link href="/reports" className="group">
            <Card className="rounded-3xl p-6 border-2 border-gray-50 hover:border-emerald-100 hover:bg-emerald-50/20 transition-all">
               <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 size={24} />
               </div>
               <h4 className="font-bold text-gray-900">Module Reports</h4>
               <p className="text-xs text-gray-500 mt-1">Export attendance data and generate insights.</p>
            </Card>
         </Link>
      </div>
    </div>
  );
}
