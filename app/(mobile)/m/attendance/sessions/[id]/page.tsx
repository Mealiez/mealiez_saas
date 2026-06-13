"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Loader2, 
  Users, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  QrCode, 
  XCircle,
  RefreshCcw,
  Search,
  Camera,
  ChevronDown,
  Timer,
  AlertTriangle,
  Trash2,
  X
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

interface SessionDetails {
  id: string;
  label: string;
  meal_type: string;
  started_at: string;
  is_active: boolean;
  scan_mode: 'session' | 'member';
  present_count: number;
  branches: { name: string } | null;
}

interface AttendanceRecord {
  id: string;
  marked_at: string;
  method: string;
  user_id: string;
  users: {
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export default function MobileSessionReportPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionDetails | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isConfirmingClose, setIsConfirmingClose] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeLeft, setTimeLeft] = useState('15:00');

  const fetchData = async () => {
    try {
      const resSession = await fetch(`/api/attendance/sessions/${sessionId}`);
      if (!resSession.ok) throw new Error('Session not found');
      const dataSession = await resSession.json();
      setSession(dataSession.session);

      const resRecords = await fetch(`/api/attendance/mark?sessionId=${sessionId}`);
      if (!resRecords.ok) throw new Error('Failed to fetch records');
      const dataRecords = await resRecords.json();
      setRecords(dataRecords.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    let seconds = 900;
    const timer = setInterval(() => {
      seconds--;
      if (seconds <= 0) seconds = 900;
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleModeChange = async (newMode: 'session' | 'member') => {
    if (!session) return;
    setIsUpdatingMode(true);
    try {
      const res = await fetch(`/api/attendance/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_mode: newMode })
      });
      if (res.ok) {
        setSession({ ...session, scan_mode: newMode });
        toast.success(`Mode changed to ${newMode === 'session' ? 'Terminal' : 'Scanner'}`);
      }
    } catch (err) {
      toast.error('Failed to update mode');
    } finally {
      setIsUpdatingMode(false);
    }
  };

  const handleCloseSession = async () => {
    setIsClosing(true);
    try {
      const res = await fetch(`/api/attendance/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false })
      });
      if (res.ok) {
        toast.success('Session closed');
        setIsConfirmingClose(false);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to close');
    } finally {
      setIsClosing(false);
    }
  };

  const filteredRecords = records.filter(r => 
    r.users?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading && !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Syncing...</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24 font-sans">
      
      {/* CAUTION OVERLAY */}
      {isConfirmingClose && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white rounded-t-[2.5rem] p-8 space-y-6 animate-in slide-in-from-bottom-10 duration-500 shadow-2xl">
              <div className="flex flex-col items-center text-center space-y-4">
                 <div className="h-16 w-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center animate-bounce">
                    <AlertTriangle size={32} />
                 </div>
                 <div className="space-y-1">
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Finalize Session?</h2>
                    <p className="text-xs font-bold text-gray-400 uppercase leading-relaxed px-4">
                       This will permanently close the check-in window. Members will no longer be able to scan.
                    </p>
                 </div>
              </div>

              <div className="space-y-3 pt-2">
                 <Button 
                   onClick={handleCloseSession}
                   disabled={isClosing}
                   className="w-full h-16 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-red-900/20"
                 >
                    {isClosing ? <Loader2 className="animate-spin mr-2" /> : <Trash2 className="mr-2 w-4 h-4" />}
                    Yes, End Session
                 </Button>
                 <Button 
                   onClick={() => setIsConfirmingClose(false)}
                   variant="ghost"
                   className="w-full h-14 rounded-2xl text-gray-400 font-black uppercase text-[10px] tracking-widest"
                 >
                    Cancel
                 </Button>
              </div>
           </div>
        </div>
      )}

      <header className="bg-white px-5 py-4 flex items-center justify-between sticky top-0 z-20 border-b border-gray-100">
        <div className="flex items-center gap-3">
           <button onClick={() => router.back()} className="p-1 text-gray-500">
             <ChevronLeft size={22} />
           </button>
           <h1 className="text-lg font-bold text-gray-900 tracking-tight">Session Hub</h1>
        </div>
        <button onClick={fetchData} className="p-2 text-blue-500">
           <RefreshCcw size={18} />
        </button>
      </header>

      <div className="p-5 space-y-5 animate-in fade-in duration-500">
        
        {/* ACTION & MODE SECTION */}
        <section className="space-y-3">
           <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Operations</span>
              <div className="relative inline-block">
                 <select 
                    value={session.scan_mode}
                    onChange={(e) => handleModeChange(e.target.value as any)}
                    disabled={isUpdatingMode || !session.is_active}
                    className="appearance-none bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 pr-8 rounded-full border border-blue-100 outline-none disabled:opacity-50 transition-all"
                 >
                    <option value="session">Fixed Terminal</option>
                    <option value="member">Manager Scan</option>
                 </select>
                 <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
              </div>
           </div>

           {session.is_active ? (
             <div className="space-y-3">
                {session.scan_mode === 'session' ? (
                  <Link href={`/m/attendance/sessions/${session.id}/qr`}>
                    <div className="p-5 bg-white border border-gray-100 rounded-2xl flex items-center justify-between active:bg-gray-50 transition-all shadow-sm">
                       <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                             <QrCode size={20} />
                          </div>
                          <div>
                             <h4 className="text-sm font-bold text-gray-900">View Session QR</h4>
                             <p className="text-[10px] text-gray-400 font-medium">Allow members to scan</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-2 bg-indigo-50 px-2 py-1 rounded-lg">
                          <Timer size={10} className="text-indigo-600" />
                          <span className="text-[10px] font-mono font-bold text-indigo-600">{timeLeft}</span>
                       </div>
                    </div>
                  </Link>
                ) : (
                  <Link href={`/m/attendance/scan?sessionId=${session.id}`}>
                    <div className="p-5 bg-white border border-gray-100 rounded-2xl flex items-center justify-between active:bg-gray-50 transition-all shadow-sm">
                       <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                             <Camera size={20} />
                          </div>
                          <div>
                             <h4 className="text-sm font-bold text-gray-900">Open Scanner</h4>
                             <p className="text-[10px] text-gray-400 font-medium">Scan member badges</p>
                          </div>
                       </div>
                       <ChevronDown size={16} className="-rotate-90 text-gray-300" />
                    </div>
                  </Link>
                )}
             </div>
           ) : (
             <div className="p-6 border-2 border-dashed border-gray-200 rounded-2xl bg-white/50 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Session Closed</p>
             </div>
           )}
        </section>

        {/* INFO CARD */}
        <Card className="rounded-2xl border-none bg-gray-900 text-white p-5 shadow-sm">
           <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <Badge className={cn(
                   "text-[9px] font-bold uppercase px-2 py-0.5 border-none",
                   session.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                 )}>
                   {session.is_active ? 'Active' : 'Closed'}
                 </Badge>
                 <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{session.meal_type}</span>
              </div>
              <div>
                 <h2 className="text-lg font-bold tracking-tight">{session.label}</h2>
                 <div className="flex gap-4 mt-2 text-[10px] text-gray-500 font-medium">
                    <div className="flex items-center gap-1.5"><MapPin size={12} /> {session.branches?.name || 'Global'}</div>
                    <div className="flex items-center gap-1.5"><Clock size={12} /> {new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                 </div>
              </div>
              {session.is_active && (
                 <button 
                   onClick={() => setIsConfirmingClose(true)}
                   className="w-full py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-widest transition-all border border-red-500/10"
                 >
                    End Session
                 </button>
              )}
           </div>
        </Card>

        {/* LOG SECTION */}
        <div className="space-y-4">
           <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Attendance Log</h3>
              <span className="text-xs font-bold text-blue-600">{records.length} Present</span>
           </div>

           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <Input 
                placeholder="Search name..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="rounded-xl border-gray-200 bg-white h-11 pl-10 text-sm focus:ring-0 focus:border-blue-300"
              />
           </div>

           <div className="space-y-2">
              {filteredRecords.map((record) => (
                <div key={record.id} className="p-3 bg-white border border-gray-100 rounded-xl flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center font-bold text-[10px] overflow-hidden">
                         {record.users?.avatar_url ? (
                           <img src={record.users.avatar_url} alt="" className="h-full w-full object-cover" />
                         ) : (
                           record.users?.full_name.charAt(0) || '?'
                         )}
                      </div>
                      <div>
                         <p className="text-xs font-bold text-gray-900 leading-none">{record.users?.full_name}</p>
                         <p className="text-[8px] text-gray-400 font-medium uppercase mt-1">
                            {record.method} • {new Date(record.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </p>
                      </div>
                   </div>
                   <CheckCircle2 size={14} className="text-green-500" />
                </div>
              ))}
              {filteredRecords.length === 0 && (
                <div className="py-10 text-center opacity-40">
                   <Users size={32} className="mx-auto text-gray-300 mb-2" />
                   <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting...</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
