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

export default function ManagerDashboard() {
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
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm font-black uppercase tracking-widest text-gray-400">Loading Analytics...</p>
      </div>
    );
  }

  if (!stats) return null;

  const pieData = [
    { name: 'Marked (With Request)', value: stats.attendance_breakdown.present_with_request, color: '#3b82f6' },
    { name: 'Present (No Request)', value: stats.attendance_breakdown.present_without_request, color: '#6366f1' },
    { name: 'Requested but Absent', value: stats.attendance_breakdown.requested_but_absent, color: '#ef4444' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Request Insights</h1>
          <p className="text-gray-500 font-medium">Real-time meal booking and attendance prediction</p>
        </div>
        <div className="flex gap-3">
           <Link href="/meal-requests/log">
             <Button variant="outline" className="rounded-xl font-bold">View Full Log</Button>
           </Link>
           <Link href="/meal-requests/reports">
             <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20">
               <Zap className="mr-2 w-4 h-4" /> Generate Report
             </Button>
           </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-3xl border-none shadow-sm bg-gray-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
               <TrendingUp size={14} /> Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">{stats.total_requests}</div>
            <p className="text-[10px] font-medium opacity-50 mt-1 uppercase tracking-tight">For Today's Meals</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-white border border-gray-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
               <CheckCircle2 size={14} className="text-green-500" /> Marked Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-gray-900">{stats.marked_requests}</div>
            <div className="w-full bg-gray-50 h-1.5 rounded-full mt-3 overflow-hidden">
               <div className="h-full bg-green-500" style={{ width: `${(stats.marked_requests / (stats.total_requests || 1)) * 100}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-white border border-gray-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
               <Users size={14} className="text-blue-500" /> Prediction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-gray-900">{stats.prediction_pct}%</div>
            <p className="text-[10px] font-bold text-blue-600 mt-1 uppercase tracking-tight">Based on total members</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest opacity-80 flex items-center gap-2">
               <PieChartIcon size={14} /> Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">
               {stats.total_requests > 0 ? Math.round((stats.marked_requests / stats.total_requests) * 100) : 0}%
            </div>
            <p className="text-[10px] font-medium opacity-70 mt-1 uppercase tracking-tight">Requests Honored</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Attendance vs Request Pie Chart */}
        <Card className="rounded-[2.5rem] border-none shadow-sm bg-white border border-gray-100 p-8">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-black uppercase tracking-tight text-gray-900">Attendance Breakdown</CardTitle>
            <CardDescription className="font-medium italic text-gray-400">Request vs. Actual Presence</CardDescription>
          </CardHeader>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Meal Type Breakdown */}
        <Card className="rounded-[2.5rem] border-none shadow-sm bg-white border border-gray-100 p-8">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-black uppercase tracking-tight text-gray-900">Meal Type Breakdown</CardTitle>
            <CardDescription className="font-medium italic text-gray-400">Total bookings for each slot</CardDescription>
          </CardHeader>
          <CardContent className="px-0 space-y-6 pt-6">
             {[
               { label: 'Breakfast', count: stats.meal_type_breakdown.breakfast, color: 'bg-amber-400' },
               { label: 'Lunch', count: stats.meal_type_breakdown.lunch, color: 'bg-blue-500' },
               { label: 'Dinner', count: stats.meal_type_breakdown.dinner, color: 'bg-indigo-600' }
             ].map((m) => (
               <div key={m.label} className="space-y-2">
                  <div className="flex justify-between items-end">
                     <span className="font-bold text-gray-900">{m.label}</span>
                     <span className="text-sm font-black text-gray-500">{m.count} Requests</span>
                  </div>
                  <div className="w-full bg-gray-50 h-3 rounded-full overflow-hidden">
                     <div className={cn("h-full transition-all duration-1000", m.color)} style={{ width: `${(m.count / (stats.total_requests || 1)) * 100}%` }} />
                  </div>
               </div>
             ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="space-y-4">
         <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Quick Actions</h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
               { label: 'Download Today Summary', href: '/meal-requests/reports', desc: 'Get a quick PDF for the kitchen staff.' },
               { label: 'Export Detailed CSV', href: '/meal-requests/reports', desc: 'Raw data for external analysis.' },
               { label: 'Review Pending Logs', href: '/meal-requests/log', desc: 'Check individual user requests.' }
            ].map((link) => (
               <Link key={link.label} href={link.href} className="group">
                  <div className="p-6 bg-white border border-gray-100 rounded-[2rem] hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all">
                     <h4 className="font-black text-gray-900 uppercase text-sm group-hover:text-blue-600 transition-colors flex items-center justify-between">
                        {link.label}
                        <ArrowRight size={16} />
                     </h4>
                     <p className="text-xs text-gray-400 font-medium mt-1">{link.desc}</p>
                  </div>
               </Link>
            ))}
         </div>
      </div>
    </div>
  );
}
