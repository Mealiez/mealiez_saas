"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Filter, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MealRequestLog {
  id: string;
  session_date: string;
  meal_type: string;
  status: string;
  requested_at: string;
  users: {
    full_name: string;
    branch_id: string | null;
    designation: { name: string } | null;
  };
}

export default function DetailedLog() {
  const [logs, setLogs] = useState<MealRequestLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    async function fetchLogs() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/meal-requests?date=${filterDate}`);
        const data = await res.json();
        setLogs(data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLogs();
  }, [filterDate]);

  const filteredLogs = logs.filter(log => 
    log.users.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase text-center md:text-left">Detailed Request Log</h1>
        <p className="text-gray-500 font-medium text-center md:text-left mt-1">Audit trail of all meal bookings</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="space-y-1.5 flex-1 w-full">
          <Label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1.5">
            <Search size={12} /> Search User
          </Label>
          <Input 
            placeholder="Name..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border-gray-200"
          />
        </div>

        <div className="space-y-1.5 flex-1 w-full">
          <Label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1.5">
            <CalendarIcon size={12} /> Select Date
          </Label>
          <Input 
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="rounded-xl border-gray-200"
          />
        </div>

        <div className="space-y-1.5 flex-1 w-full">
          <Label className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1.5">
            <Filter size={12} /> Status
          </Label>
          <select className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-gray-50/50">
             <option>All Requests</option>
             <option>Confirmed</option>
             <option>Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Card className="rounded-[2.5rem] border-none shadow-sm bg-white border border-gray-100 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="px-8 py-5">Member</th>
                  <th className="px-8 py-5">Designation</th>
                  <th className="px-8 py-5">Meal Slot</th>
                  <th className="px-8 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-right">Booked At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center">
                      <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" size={24} />
                      <span className="font-black uppercase tracking-widest text-[10px] text-gray-400">Syncing database...</span>
                    </td>
                  </tr>
                ) : filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold">
                           {log.users.full_name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 leading-tight">{log.users.full_name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">
                         {log.users.designation?.name || '-'}
                       </span>
                    </td>
                    <td className="px-8 py-5">
                       <Badge variant="outline" className="capitalize border-blue-50 text-blue-700 bg-blue-50/30 font-bold px-3">
                          {log.meal_type}
                       </Badge>
                    </td>
                    <td className="px-8 py-5 text-center">
                       <span className={cn(
                         "text-[10px] font-black uppercase tracking-widest",
                         log.status === 'requested' ? "text-green-600" : "text-red-600"
                       )}>
                         {log.status}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-right font-mono text-gray-400 text-xs">
                       {new Date(log.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
                {!isLoading && filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-gray-400 italic">
                       No records match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
