"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Utensils, 
  Loader2, 
  ChevronLeft,
  Calendar,
  Clock,
  Filter,
  CheckCircle2,
  XCircle,
  Timer
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

export default function MobileAttendanceHistory() {
  const router = useRouter();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/attendance/mark`); // Assuming this endpoint or similar exists for self history
        // Actually I created /api/users/[id]/attendance earlier. I should use that or a generic self endpoint.
        // Let's use the one that works for the current user.
        const resUser = await fetch('/api/auth/session');
        const session = await resUser.json();
        if (session.user) {
          const resLogs = await fetch(`/api/users/${session.user.id}/attendance`);
          const data = await resLogs.json();
          setLogs(data.data || []);
        }
      } catch (err) {
        toast.error('Failed to load history');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      <header className="bg-white px-6 py-4 flex items-center gap-4 sticky top-0 z-20 border-b border-gray-100">
        <button onClick={() => router.back()} className="p-1">
          <ChevronLeft className="w-6 h-6 text-gray-900" />
        </button>
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Attendance Log</h1>
      </header>

      <div className="p-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
           <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Consumption Audit</h2>
           <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">Verified Records</span>
        </div>

        {isLoading ? (
          <div className="p-20 flex flex-col items-center gap-3">
             <Loader2 className="animate-spin text-blue-600" size={32} />
             <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Syncing History</p>
          </div>
        ) : logs.length > 0 ? (
          <div className="space-y-4">
             {logs.map((log) => (
               <Card key={log.id} className="rounded-3xl border-gray-100 shadow-sm overflow-hidden">
                  <CardContent className="p-5 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                          log.method === 'qr' ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
                        )}>
                           <Utensils size={20} />
                        </div>
                        <div>
                           <p className="text-sm font-black text-gray-900 leading-none">{log.session_id.label}</p>
                           <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{log.session_id.meal_type}</span>
                              <div className="w-1 h-1 rounded-full bg-gray-200" />
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                                {new Date(log.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                           </div>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-gray-900 uppercase tracking-tighter mb-1">
                           {new Date(log.marked_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                        </p>
                        <Badge variant="outline" className={cn(
                          "rounded-full text-[8px] font-black uppercase tracking-widest px-2 py-0",
                          log.method === 'qr' ? "border-indigo-100 text-indigo-700 bg-indigo-50" : "border-amber-100 text-amber-700 bg-amber-50"
                        )}>
                          {log.method}
                        </Badge>
                     </div>
                  </CardContent>
               </Card>
             ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-gray-100 shadow-sm">
             <div className="flex flex-col items-center gap-4 opacity-40">
                <CheckCircle2 size={48} className="text-gray-300" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">No consumption history</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
