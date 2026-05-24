"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Search
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
  const [isClosing, setIsClosing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      // 1. Fetch Session Info
      const resSession = await fetch(`/api/attendance/sessions/${sessionId}`);
      const dataSession = await resSession.json();
      setSession(dataSession.data);

      // 2. Fetch Records (Assuming this endpoint returns records for a session)
      const resRecords = await fetch(`/api/attendance/mark?sessionId=${sessionId}`);
      const dataRecords = await resRecords.json();
      setRecords(dataRecords.data || []);
    } catch (err) {
      toast.error('Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll for live updates every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const handleCloseSession = async () => {
    if (!confirm('End this session? No more scans will be allowed.')) return;
    setIsClosing(true);
    try {
      const res = await fetch(`/api/attendance/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false })
      });
      if (res.ok) {
        toast.success('Session ended');
        router.back();
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
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-10">
      <header className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-20 border-b border-gray-100">
        <div className="flex items-center gap-4">
           <button onClick={() => router.back()} className="p-1">
             <ChevronLeft className="w-6 h-6 text-gray-900" />
           </button>
           <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Live Report</h1>
        </div>
        <button onClick={fetchData} className="p-2 text-blue-600 active:rotate-180 transition-transform duration-500">
           <RefreshCcw size={20} />
        </button>
      </header>

      <div className="p-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        {/* Session Info Card */}
        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-blue-500/5 bg-white overflow-hidden">
           <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", session.is_active ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
                    <p className={cn("text-[10px] font-black uppercase tracking-widest", session.is_active ? "text-green-600" : "text-gray-400")}>
                       {session.is_active ? 'Live Tracking' : 'Session Ended'}
                    </p>
                 </div>
                 <Badge variant="outline" className="rounded-full bg-gray-50 border-gray-100 text-[10px] font-black uppercase px-3">
                    {session.meal_type}
                 </Badge>
              </div>

              <div>
                 <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none mb-2">{session.label}</h2>
                 <div className="flex flex-wrap gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                    <div className="flex items-center gap-1.5"><MapPin size={12} /> {session.branches?.name || 'Global'}</div>
                    <div className="flex items-center gap-1.5"><Clock size={12} /> {new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                 </div>
              </div>

              {session.is_active && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                   <Link href={`/m/attendance/scan?sessionId=${session.id}`} className="flex-1">
                      <Button className="w-full rounded-2xl bg-gray-900 hover:bg-black font-black uppercase text-[10px] tracking-widest h-12">
                         <QrCode className="mr-2 w-4 h-4" /> Open Scanner
                      </Button>
                   </Link>
                   <Button 
                      onClick={handleCloseSession}
                      disabled={isClosing}
                      variant="outline" 
                      className="flex-1 rounded-2xl border-red-100 text-red-600 hover:bg-red-50 font-black uppercase text-[10px] tracking-widest h-12"
                   >
                      {isClosing ? <Loader2 className="animate-spin" size={16} /> : <><XCircle className="mr-2 w-4 h-4" /> End Session</>}
                   </Button>
                </div>
              )}
           </div>
        </Card>

        {/* Live Attendance List */}
        <div className="space-y-4">
           <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                 <Users size={14} className="text-blue-600" />
                 Members Present
              </h3>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{records.length} Scanned</span>
           </div>

           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input 
                placeholder="Search member name..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="rounded-2xl border-none shadow-sm bg-white h-12 pl-12 font-bold text-sm"
              />
           </div>

           <div className="space-y-3">
              {filteredRecords.map((record) => (
                <Card key={record.id} className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
                   <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold overflow-hidden border border-blue-100">
                            {record.users?.avatar_url ? (
                              <img src={record.users.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              record.users?.full_name.charAt(0) || '?'
                            )}
                         </div>
                         <div>
                            <p className="text-sm font-black text-gray-900 leading-none">{record.users?.full_name}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-tighter">
                               Method: {record.method} • {new Date(record.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                         </div>
                      </div>
                      <div className="p-2 bg-green-50 text-green-600 rounded-xl">
                         <CheckCircle2 size={18} />
                      </div>
                   </CardContent>
                </Card>
              ))}
              {filteredRecords.length === 0 && (
                <div className="py-12 text-center opacity-30">
                   <Users size={48} className="mx-auto text-gray-300 mb-2" />
                   <p className="text-xs font-black uppercase tracking-widest">No matching records</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
