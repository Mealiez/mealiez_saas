import { requireAuth } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { checkFeatureEnabled } from '@/lib/features/gate';

/*
 * SERVER COMPONENT: Attendance Control Center
 * Displays stats and operational status for both modes.
 */

export default async function AttendanceDashboard() {
  const user = await requireAuth();
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // 1. Fetch Today's Stats
  const { data: stats } = await supabase
    .from('attendance_records')
    .select('meal_type, id')
    .eq('tenant_id', user.tenant_id)
    .gte('marked_at', `${today}T00:00:00`)
    .lte('marked_at', `${today}T23:59:59`);

  const counts = {
    total: stats?.length || 0,
    breakfast: stats?.filter(r => r.meal_type === 'breakfast').length || 0,
    lunch: stats?.filter(r => r.meal_type === 'lunch').length || 0,
    dinner: stats?.filter(r => r.meal_type === 'dinner').length || 0,
  };

  // 2. Check Automated Status
  const { data: automatedConfig } = await supabase
    .from('attendance_fixed_configs')
    .select('*, branches(name)')
    .eq('tenant_id', user.tenant_id)
    .eq('is_enabled', true)
    .maybeSingle();

  // 3. Check Active Quick Session
  const { data: quickSession } = await supabase
    .from('attendance_sessions')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)
    .maybeSingle();

  const isAutomatedEnabled = await checkFeatureEnabled(user.tenant_id, 'attendance_automated_mode');
  const isQuickEnabled = await checkFeatureEnabled(user.tenant_id, 'attendance_quick_mode');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Attendance Dashboard</h1>
          <p className="text-gray-500 font-medium">Real-time mess operation overview</p>
        </div>
        <Link href="/attendance/setup">
          <Button variant="outline" className="rounded-xl font-bold border-2">
            ⚙️ Attendance Setup
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-3xl border-none shadow-sm bg-indigo-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest opacity-80">Today Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">{counts.total}</div>
            <p className="text-[10px] mt-1 opacity-70">Check-ins recorded</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-white border border-gray-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-400">Breakfast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-gray-900">{counts.breakfast}</div>
            <div className="w-full bg-gray-100 h-1 rounded-full mt-3 overflow-hidden">
               <div className="bg-amber-400 h-full" style={{ width: `${(counts.breakfast / (counts.total || 1)) * 100}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-white border border-gray-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-400">Lunch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-gray-900">{counts.lunch}</div>
            <div className="w-full bg-gray-100 h-1 rounded-full mt-3 overflow-hidden">
               <div className="bg-blue-500 h-full" style={{ width: `${(counts.lunch / (counts.total || 1)) * 100}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-white border border-gray-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-400">Dinner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-gray-900">{counts.dinner}</div>
            <div className="w-full bg-gray-100 h-1 rounded-full mt-3 overflow-hidden">
               <div className="bg-indigo-500 h-full" style={{ width: `${(counts.dinner / (counts.total || 1)) * 100}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Automated Mode Card */}
        <Card className="rounded-3xl border-2 overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b pb-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight">Automated Attendance</CardTitle>
                <CardDescription className="text-xs font-medium">Daily mess operations with permanent QR</CardDescription>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                automatedConfig ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {automatedConfig ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {automatedConfig ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-2xl text-2xl">🏢</div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Branch</p>
                    {/* @ts-ignore */}
                    <p className="font-bold text-gray-900">{automatedConfig.branches?.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase">Breakfast</p>
                    <p className="text-xs font-bold">{automatedConfig.breakfast_start.slice(0, 5)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase">Lunch</p>
                    <p className="text-xs font-bold">{automatedConfig.lunch_start.slice(0, 5)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase">Dinner</p>
                    <p className="text-xs font-bold">{automatedConfig.dinner_start.slice(0, 5)}</p>
                  </div>
                </div>
                <Button className="w-full rounded-xl bg-gray-900 font-bold" asChild>
                   <Link href="/attendance/setup">Manage Automated Setup</Link>
                </Button>
              </>
            ) : (
              <div className="py-6 text-center space-y-4">
                <p className="text-sm text-gray-500 max-w-[200px] mx-auto">No permanent QR configured for this branch.</p>
                <Link href="/attendance/setup">
                   <Button variant="secondary" className="rounded-xl font-bold">Configure Now</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Mode Card */}
        <Card className="rounded-3xl border-2 overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b pb-4">
             <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg font-black uppercase tracking-tight">Quick Attendance</CardTitle>
                <CardDescription className="text-xs font-medium">Temporary events & special meals</CardDescription>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                quickSession ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {quickSession ? 'Active Session' : 'Idle'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
             {quickSession ? (
               <>
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-amber-50 rounded-2xl text-2xl">🔥</div>
                   <div className="flex-1">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ongoing</p>
                     <p className="font-bold text-gray-900">{quickSession.label}</p>
                   </div>
                   <Link href={`/attendance/${quickSession.id}`}>
                      <Button size="sm" className="rounded-lg bg-blue-600 font-bold shadow-lg shadow-blue-500/20">View QR</Button>
                   </Link>
                 </div>
                 <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div>
                       <p className="text-[8px] font-black text-gray-400 uppercase">Started At</p>
                       <p className="text-xs font-bold">{new Date(quickSession.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <Link href="/attendance" className="text-[10px] font-black text-blue-600 uppercase hover:underline">View History</Link>
                 </div>
               </>
             ) : (
               <div className="py-6 text-center space-y-4">
                 <p className="text-sm text-gray-500 max-w-[200px] mx-auto">No temporary attendance sessions are currently running.</p>
                 <Link href="/attendance/setup">
                    <Button variant="secondary" className="rounded-xl font-bold">Create Quick Session</Button>
                 </Link>
               </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
