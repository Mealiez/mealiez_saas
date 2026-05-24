"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Utensils, Calendar as CalendarIcon, Clock, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AttendanceLog {
  id: string;
  marked_at: string;
  method: string;
  session_id: {
    label: string;
    meal_type: string;
    session_date: string;
  };
}

interface UserAttendanceLogsProps {
  userId: string;
  authId: string;
}

export default function UserAttendanceLogs({ userId, authId }: UserAttendanceLogsProps) {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/users/${userId}/attendance`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch attendance logs', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [userId]);

  const filteredLogs = logs.filter(log => 
    log.session_id.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.session_id.meal_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.session_id.session_date.includes(searchTerm)
  );

  return (
    <Card className="shadow-sm border-gray-100 overflow-hidden">
      <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="text-blue-600" size={18} />
              Attendance History
            </CardTitle>
            <CardDescription className="text-xs uppercase tracking-widest font-black text-gray-400 mt-1">
              Audit trail for this member's meal consumption
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <Input 
              placeholder="Search logs..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 rounded-xl border-gray-200 text-xs font-bold bg-white"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/30">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Meal Session</th>
                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date & Time</th>
                <th className="px-6 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                    <td className="px-6 py-4 text-center"><div className="h-4 bg-gray-100 rounded w-16 mx-auto" /></td>
                  </tr>
                ))
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <Utensils size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 leading-none">{log.session_id.label}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                            {log.session_id.meal_type}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-gray-700 font-bold text-xs">
                           <CalendarIcon size={12} className="text-gray-400" />
                           {new Date(log.marked_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500 font-medium text-[10px]">
                           <Clock size={12} className="text-gray-400" />
                           {new Date(log.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline" className={`rounded-full px-3 text-[10px] font-black uppercase tracking-widest ${
                        log.method === 'qr' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {log.method}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <Filter size={32} className="text-gray-400" />
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">No logs found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100">
        <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
           <span>Total consumption records: {filteredLogs.length}</span>
           <div className="flex gap-2">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> QR SCAN</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> MANUAL</span>
           </div>
        </div>
      </div>
    </Card>
  );
}
