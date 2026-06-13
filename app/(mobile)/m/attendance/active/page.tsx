"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  X, 
  Loader2, 
  Calendar, 
  MapPin, 
  Zap, 
  ChevronRight, 
  PlayCircle,
  Activity,
  CheckCircle2,
  Clock,
  QrCode
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ActiveSession {
  id: string;
  label: string;
  meal_type: string;
  started_at: string;
  branches: { name: string } | null;
}

export default function MobileAttendanceDashboard() {
  const router = useRouter();
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, breakfast: 0, lunch: 0, dinner: 0 });
  const [isCreating, setIsCreating] = useState(false);

  // Form State for new session
  const [newSession, setNewSession] = useState({
    label: '',
    meal_type: 'lunch',
    branch_id: ''
  });
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);

  const fetchData = async () => {
    try {
      // 1. Fetch Sessions
      const resSessions = await fetch('/api/attendance/sessions');
      const dataSessions = await resSessions.json();
      setActiveSessions(dataSessions.data?.filter((s: any) => s.is_active) || []);

      // 2. Fetch Stats
      const resStats = await fetch('/api/attendance/stats');
      const dataStats = await resStats.json();
      if (dataStats.stats) {
        setStats(dataStats.stats);
      }

      // 3. Fetch Branches
      const resBranches = await fetch('/api/branches');
      const dataBranches = await resBranches.json();
      setBranches(dataBranches.data || []);
      if (dataBranches.data?.length > 0) {
        setNewSession(prev => ({ ...prev, branch_id: dataBranches.data[0].id }));
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      // Just fetch stats and sessions periodically
      fetch('/api/attendance/stats').then(res => res.json()).then(data => {
        if (data.stats) setStats(data.stats);
      });
      fetch('/api/attendance/sessions').then(res => res.json()).then(data => {
        setActiveSessions(data.data?.filter((s: any) => s.is_active) || []);
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/attendance/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession)
      });

      if (!res.ok) throw new Error('Failed to create');
      
      toast.success('Session started!');
      setIsCreating(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to start session');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !isCreating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header with Quick Action */}
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Operations</h2>
           <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Attendance</h1>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 font-black uppercase text-[10px] tracking-widest px-5 h-11"
        >
          <Plus className="mr-1.5 w-4 h-4" /> Start Session
        </Button>
      </div>

      {/* ACTIVE SESSIONS CARD (DASHBOARD HIGHLIGHT) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
           <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
             <Activity size={14} className="text-green-500" /> 
             Live Now
           </h3>
           <span className="text-[10px] font-bold text-gray-400">{activeSessions.length} Active</span>
        </div>

        {activeSessions.length > 0 ? (
          <div className="space-y-4">
             {activeSessions.map((session) => (
               <Card key={session.id} className="rounded-[2rem] border-none shadow-xl shadow-blue-500/5 bg-white overflow-hidden group active:scale-[0.98] transition-all">
                  <Link href={`/m/attendance/sessions/${session.id}`}>
                    <CardContent className="p-6">
                       <div className="flex items-start justify-between">
                          <div className="space-y-2">
                             <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <p className="text-[8px] font-black text-green-600 uppercase tracking-widest">{session.meal_type}</p>
                             </div>
                             <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">{session.label}</h4>
                             <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                <div className="flex items-center gap-1">
                                   <MapPin size={12} /> {session.branches?.name || 'Global'}
                                </div>
                                <div className="flex items-center gap-1">
                                   <Clock size={12} /> {new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                             </div>
                          </div>
                          <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                             <ChevronRight size={20} />
                          </div>
                       </div>
                    </CardContent>
                  </Link>
               </Card>
             ))}
          </div>
        ) : (
          <Card className="rounded-[2rem] border-2 border-dashed border-gray-100 bg-gray-50/50 p-10 text-center">
             <div className="flex flex-col items-center gap-3 opacity-30">
                <Zap size={32} className="text-gray-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">No active sessions</p>
             </div>
          </Card>
        )}
      </section>

      {/* ANALYTICS ROW */}
      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 px-1">Today's Summary</h3>
        <div className="grid grid-cols-2 gap-4">
           <Card className="rounded-3xl border-none shadow-sm bg-gray-900 text-white p-5">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-50 mb-2">Total Scans</p>
              <div className="text-3xl font-black">{stats.total}</div>
           </Card>
           <div className="grid grid-rows-2 gap-4">
              <div className="bg-white rounded-2xl p-3 border border-gray-100 flex items-center justify-between">
                 <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Lunch</span>
                 <span className="text-sm font-black text-blue-600">{stats.lunch}</span>
              </div>
              <div className="bg-white rounded-2xl p-3 border border-gray-100 flex items-center justify-between">
                 <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Breakfast</span>
                 <span className="text-sm font-black text-amber-500">{stats.breakfast}</span>
              </div>
           </div>
        </div>
      </section>

      {/* CREATE SESSION OVERLAY */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white rounded-t-[3rem] p-8 space-y-8 animate-in slide-in-from-bottom-10 duration-500">
              <div className="flex items-center justify-between">
                 <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">New Live Session</h2>
                 <button onClick={() => setIsCreating(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                    <X size={20} />
                 </button>
              </div>

              <form onSubmit={handleCreateSession} className="space-y-6">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Session Label</Label>
                    <Input 
                      placeholder="e.g. Lunch at Main Mess"
                      value={newSession.label}
                      onChange={e => setNewSession({...newSession, label: e.target.value})}
                      className="rounded-2xl border-gray-100 bg-gray-50 font-bold h-14 px-5 focus:bg-white"
                      required
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Meal Type</Label>
                       <select 
                         value={newSession.meal_type}
                         onChange={e => setNewSession({...newSession, meal_type: e.target.value})}
                         className="w-full rounded-2xl border-gray-100 bg-gray-50 font-bold h-14 px-5 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                       >
                          <option value="breakfast">Breakfast</option>
                          <option value="lunch">Lunch</option>
                          <option value="dinner">Dinner</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Branch</Label>
                       <select 
                         value={newSession.branch_id}
                         onChange={e => setNewSession({...newSession, branch_id: e.target.value})}
                         className="w-full rounded-2xl border-gray-100 bg-gray-50 font-bold h-14 px-5 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                       >
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="pt-4">
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full h-16 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-500/20"
                    >
                       {isLoading ? <Loader2 className="animate-spin" size={24} /> : 'Go Live Now'}
                    </Button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
