"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function AttendanceStats() {
  const [stats, setStats] = useState({ total: 0, breakfast: 0, lunch: 0, dinner: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/attendance/stats');
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('[STATS_FETCH_ERROR]', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Auto-refresh stats every 10 seconds for real-time feel
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="rounded-3xl border-none shadow-sm bg-gray-900 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-black uppercase tracking-widest opacity-60">Total Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-black">{isLoading ? '...' : stats.total}</div>
        </CardContent>
      </Card>
      
      {[
        { label: 'Breakfast', count: stats.breakfast, color: 'bg-amber-400' },
        { label: 'Lunch', count: stats.lunch, color: 'bg-blue-500' },
        { label: 'Dinner', count: stats.dinner, color: 'bg-indigo-600' }
      ].map((item) => (
        <Card key={item.label} className="rounded-3xl border-none shadow-sm bg-white border border-gray-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-gray-400">{item.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-gray-900">{isLoading ? '...' : item.count}</div>
            <div className="w-full bg-gray-50 h-1.5 rounded-full mt-3 overflow-hidden">
               <div 
                 className={cn("h-full transition-all duration-500", item.color)} 
                 style={{ width: `${(item.count / (stats.total || 1)) * 100}%` }} 
               />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
