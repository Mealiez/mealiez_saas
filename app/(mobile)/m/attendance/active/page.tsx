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
  QrCode,
  FileBarChart
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
    branch_id: '',
    session_date: new Date().toISOString().split('T')[0],
    scan_mode: 'session' as 'session' | 'member'
  });
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);

  const fetchData = async () => {
    try {
      const resUser = await fetch('/api/auth/session');
      const session = await resUser.json();
      
      if (!session.user || session.user.role !== 'manager') {
         router.replace('/m/home');
         return;
      }

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
        setNewSession(prev => ({ 
          ...prev, 
          branch_id: dataBranches.data[0].id,
          label: `Live ${prev.meal_type.toUpperCase()} - ${dataBranches.data[0].name}`
        }));
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

  const updateLabel = (meal: string, branchId: string) => {
    const branchName = branches.find(b => b.id === branchId)?.name || 'Branch';
    setNewSession(prev => ({
      ...prev,
      meal_type: meal,
      branch_id: branchId,
      label: `Live ${meal.toUpperCase()} - ${branchName}`
    }));
  };

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
        
        <Link href="/m/reports">
           <Button variant="outline" className="w-full h-14 rounded-2xl border-gray-200 text-gray-500 font-black uppercase text-[10px] tracking-[0.2em] group hover:bg-gray-900 hover:text-white transition-all">
              <FileBarChart className="mr-2 w-4 h-4 group-hover:animate-bounce" />
              View Module Reports
           </Button>
        </Link>
      </section>

      {/* CREATE SESSION OVERLAY */}
      {isCreating && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white rounded-t-[3rem] p-8 space-y-8 animate-in slide-in-from-bottom-10 duration-500 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">New Live Session</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Setup a live scan point</p>
                 </div>
                 <button onClick={() => setIsCreating(false)} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-gray-900 transition-colors">
                    <X size={24} />
                 </button>
              </div>

              <form onSubmit={handleCreateSession} className="space-y-8 pb-24">
                 <div className="space-y-3">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Session Label</Label>
                    <Input 
                      placeholder="e.g. Lunch at Main Mess"
                      value={newSession.label}
                      onChange={e => setNewSession({...newSession, label: e.target.value})}
                      className="rounded-2xl border-gray-100 bg-gray-50 font-black uppercase text-xs h-16 px-6 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
                      required
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                       <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Meal Type</Label>
                       <div className="relative group">
                          <select 
                            value={newSession.meal_type}
                            onChange={e => updateLabel(e.target.value, newSession.branch_id)}
                            className="w-full rounded-2xl border-gray-100 bg-gray-50 font-black uppercase text-[10px] h-16 px-6 outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none cursor-pointer"
                          >
                             <option value="breakfast">Breakfast</option>
                             <option value="lunch">Lunch</option>
                             <option value="dinner">Dinner</option>
                          </select>
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                             <ChevronRight size={16} className="rotate-90" />
                          </div>
                       </div>
                    </div>
                    <div className="space-y-3">
                       <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Branch</Label>
                       <div className="relative group">
                          <select 
                            value={newSession.branch_id}
                            onChange={e => updateLabel(newSession.meal_type, e.target.value)}
                            className="w-full rounded-2xl border-gray-100 bg-gray-50 font-black uppercase text-[10px] h-16 px-6 outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none cursor-pointer"
                          >
                             {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                             <ChevronRight size={16} className="rotate-90" />
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                       <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Scan Mode</Label>
                       <div className="relative group">
                          <select 
                            value={newSession.scan_mode}
                            onChange={e => setNewSession({...newSession, scan_mode: e.target.value as 'session' | 'member'})}
                            className="w-full rounded-2xl border-gray-100 bg-gray-50 font-black uppercase text-[10px] h-16 px-6 outline-none focus:ring-4 focus:ring-blue-50 transition-all appearance-none cursor-pointer"
                          >
                             <option value="session">Fixed Terminal</option>
                             <option value="member">Mobile Scan</option>
                          </select>
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                             <ChevronRight size={16} className="rotate-90" />
                          </div>
                       </div>
                    </div>
                    <div className="space-y-3">
                       <Label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Session Date</Label>
                       <Input 
                         type="date"
                         value={newSession.session_date}
                         onChange={e => setNewSession({...newSession, session_date: e.target.value})}
                         className="rounded-2xl border-gray-100 bg-gray-50 font-black uppercase text-[10px] h-16 px-6 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all appearance-none"
                         required
                       />
                    </div>
                 </div>

                 <div className="pt-4">
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full h-20 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                    >
                       {isLoading ? <Loader2 className="animate-spin" size={24} /> : (
                         <>
                           <PlayCircle size={24} />
                           Go Live Now
                         </>
                       )}
                    </Button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
