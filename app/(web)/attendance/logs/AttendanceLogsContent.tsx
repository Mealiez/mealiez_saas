"use client";

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface LogEntry {
  id: string;
  marked_at: string;
  meal_type: string;
  method: string;
  user: {
    full_name: string;
    designation: { name: string } | null;
  };
  branch: {
    name: string;
  } | null;
}

interface AttendanceLogsContentProps {
  initialLogs: LogEntry[];
  branches: { id: string; name: string }[];
}

export default function AttendanceLogsContent({ initialLogs, branches }: AttendanceLogsContentProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [filters, setFormFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    meal_type: 'all',
    branch_id: 'all'
  });

  const applyFilters = async () => {
    // In a real app, we'd fetch from API here.
    const query = new URLSearchParams(filters).toString();
    window.location.search = query;
  };

  return (
    <div className="space-y-6">
      {/* Filters Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-6 items-end">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label className="text-[10px] font-black uppercase text-gray-400">Date</Label>
          <Input 
            type="date" 
            value={filters.date} 
            onChange={e => setFormFilters({...filters, date: e.target.value})}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-1.5 flex-1 min-w-[150px]">
          <Label className="text-[10px] font-black uppercase text-gray-400">Meal Type</Label>
          <select 
            value={filters.meal_type} 
            onChange={e => setFormFilters({...filters, meal_type: e.target.value})}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Meals</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>
        </div>

        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label className="text-[10px] font-black uppercase text-gray-400">Branch</Label>
          <select 
            value={filters.branch_id} 
            onChange={e => setFormFilters({...filters, branch_id: e.target.value})}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Branches</option>
            <option value="global">Global (Unassigned)</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <Button onClick={applyFilters} className="rounded-xl h-10 px-8 bg-gray-900 font-bold">
          Apply Filters
        </Button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
              <tr>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Meal</th>
                <th className="px-6 py-4">Branch</th>
                <th className="px-6 py-4">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-gray-500 text-xs">
                    {new Date(log.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{log.user.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">
                      {log.user.designation?.name || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="capitalize border-blue-100 text-blue-700 bg-blue-50/30">
                      {(log as any).session?.meal_type || '-'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-gray-600">
                      {(log as any).session?.branch?.name || 'Global'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-tighter",
                      log.method === 'qr' ? "text-indigo-600" : "text-amber-600"
                    )}>
                      {log.method}
                    </span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic font-medium">
                    No check-in records found for selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
