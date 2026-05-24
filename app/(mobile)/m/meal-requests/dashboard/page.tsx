"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  Loader2,
  ChevronLeft,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Stats {
  total_requests: number;
  marked_requests: number;
  total_users: number;
  prediction_pct: number;
  meal_type_breakdown: {
    breakfast: number;
    lunch: number;
    dinner: number;
  };
  attendance_breakdown: {
    present_with_request: number;
    present_without_request: number;
    requested_but_absent: number;
  };
}

export default function MobileManagerDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/meal-requests/stats');
        const data = await res.json();
        setStats(data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Syncing Analytics...</p>
      </div>
    );
  }

  if (!stats) return null;

  const pieData = [
    { name: 'With Request', value: stats.attendance_breakdown.present_with_request, color: '#3b82f6' },
    { name: 'No Request', value: stats.attendance_breakdown.present_without_request, color: '#6366f1' },
    { name: 'Absent', value: stats.attendance_breakdown.requested_but_absent, color: '#ef4444' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      <header className="bg-white px-6 py-4 flex items-center gap-4 sticky top-0 z-20 border-b border-gray-100">
        <button onClick={() => router.back()} className="p-1">
          <ChevronLeft className="w-6 h-6 text-gray-900" />
        </button>
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Request Insights</h1>
      </header>

      <div className="p-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="rounded-3xl border-none shadow-sm bg-gray-900 text-white p-5">
            <CardTitle className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Total Today</CardTitle>
            <div className="text-3xl font-black">{stats.total_requests}</div>
          </Card>
          <Card className="rounded-3xl border-none shadow-sm bg-blue-600 text-white p-5">
            <CardTitle className="text-[8px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Compliance</CardTitle>
            <div className="text-3xl font-black">
               {stats.total_requests > 0 ? Math.round((stats.marked_requests / stats.total_requests) * 100) : 0}%
            </div>
          </Card>
        </div>

        {/* Attendance Breakdown (Mobile Optimized Pie) */}
        <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-6">
          <CardHeader className="px-0 pt-0 pb-4 text-center">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-gray-900">Attendance Audit</CardTitle>
            <CardDescription className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mt-1">Presence vs Requests</CardDescription>
          </CardHeader>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Meal Type Breakdown */}
        <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-6">
          <CardHeader className="px-0 pt-0 pb-6 text-center">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-gray-900">Slot Distribution</CardTitle>
          </CardHeader>
          <div className="space-y-5">
             {[
               { label: 'Breakfast', count: stats.meal_type_breakdown.breakfast, color: 'bg-amber-400' },
               { label: 'Lunch', count: stats.meal_type_breakdown.lunch, color: 'bg-blue-500' },
               { label: 'Dinner', count: stats.meal_type_breakdown.dinner, color: 'bg-indigo-600' }
             ].map((m) => (
               <div key={m.label} className="space-y-1.5">
                  <div className="flex justify-between items-end">
                     <span className="text-xs font-black uppercase tracking-widest text-gray-400">{m.label}</span>
                     <span className="text-xs font-black text-gray-900 uppercase tracking-tighter">{m.count}</span>
                  </div>
                  <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden">
                     <div className={cn("h-full transition-all duration-1000", m.color)} style={{ width: `${(m.count / (stats.total_requests || 1)) * 100}%` }} />
                  </div>
               </div>
             ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
           <Link href="/m/reports" className="group">
              <div className="p-5 bg-white border border-gray-100 rounded-3xl active:scale-95 transition-all shadow-sm">
                 <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-3">
                    <Zap size={20} />
                 </div>
                 <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest leading-none">Reports</h4>
                 <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Export Data</p>
              </div>
           </Link>
           <Link href="/m/meal-requests" className="group">
              <div className="p-5 bg-white border border-gray-100 rounded-3xl active:scale-95 transition-all shadow-sm">
                 <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3">
                    <TrendingUp size={20} />
                 </div>
                 <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest leading-none">Logs</h4>
                 <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">View All</p>
              </div>
           </Link>
        </div>
      </div>
    </div>
  );
}
