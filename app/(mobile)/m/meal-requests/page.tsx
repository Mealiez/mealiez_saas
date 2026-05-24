"use client";

import { useState, useEffect } from 'react';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { Badge } from '@/components/ui/badge';
import { 
  Utensils, 
  Loader2, 
  ChevronLeft,
  CheckCircle2,
  Timer,
  Lock
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getMealSessionStatus, MealSessionStatus } from '@/lib/utils/meal-times';

interface MealRequest {
  id: string;
  session_date: string;
  meal_type: string;
  status: 'requested' | 'cancelled';
}

interface MealSettings {
  breakfast_start: string;
  lunch_start: string;
  dinner_start: string;
  timezone: string;
}

export default function MobileMealRequests() {
  const { user, isLoading: authLoading } = useAuthGuard();
  const router = useRouter();
  const [requests, setRequests] = useState<MealRequest[]>([]);
  const [settings, setSettings] = useState<MealSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [timers, setTimers] = useState<Record<string, MealSessionStatus>>({});

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/meal-requests');
      const data = await res.json();
      setRequests(data.data || []);
    } catch (err) {
      toast.error('Failed to load history');
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/meal-times');
      const data = await res.json();
      setSettings(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
       Promise.all([fetchRequests(), fetchSettings()]).finally(() => setIsLoading(false));
    }
  }, [user]);

  // Countdown timer logic
  useEffect(() => {
    if (!settings) return;

    const tick = () => {
      setTimers({
        breakfast: getMealSessionStatus(settings.breakfast_start, settings.timezone),
        lunch:     getMealSessionStatus(settings.lunch_start, settings.timezone),
        dinner:    getMealSessionStatus(settings.dinner_start, settings.timezone)
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [settings]);

  const handleAction = async (date: string, type: string, action: 'request' | 'cancel') => {
    const key = `${date}-${type}`;
    setSubmitting(key);
    try {
      const res = await fetch('/api/meal-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_date: date, meal_type: type, action })
      });

      if (!res.ok) throw new Error();
      
      toast.success(action === 'request' ? 'Booked!' : 'Cancelled');
      
      // OPTIMISTIC UI: Update local state immediately
      if (action === 'request') {
        setRequests(prev => [...prev, { 
          id: Math.random().toString(), 
          session_date: date, 
          meal_type: type, 
          status: 'requested' 
        }]);
      } else {
        setRequests(prev => prev.filter(r => !(r.session_date === date && r.meal_type === type)));
      }

      await fetchRequests(); // Sync with DB
    } catch (err) {
      toast.error('Sync failed');
    } finally {
      setSubmitting(null);
    }
  };

  if (authLoading) return null;

  const today = new Date().toISOString().split('T')[0];

  const renderSlot = (date: string, type: string) => {
    const req = requests.find(r => r.session_date === date && r.meal_type === type);
    const isBooked = req?.status === 'requested';
    const key = `${date}-${type}`;
    const status = timers[type];
    const isClosed = status?.isClosed;

    return (
      <button
        onClick={() => handleAction(date, type, isBooked ? 'cancel' : 'request')}
        disabled={submitting === key || (isClosed && !isBooked)}
        className={cn(
          "w-full p-5 rounded-[2rem] border-2 flex items-center justify-between transition-all active:scale-[0.97]",
          isBooked 
            ? "bg-green-50 border-green-200 text-green-900" 
            : isClosed 
              ? "bg-gray-100 border-gray-200 text-gray-400 grayscale opacity-60"
              : "bg-white border-gray-100 text-gray-900 shadow-sm"
        )}
      >
        <div className="flex items-center gap-4">
           <div className={cn(
             "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
             isBooked ? "bg-green-200/50" : isClosed ? "bg-gray-200" : "bg-blue-50"
           )}>
              {isClosed && !isBooked ? <Lock size={20} /> : <Utensils size={24} className={isBooked ? "text-green-600" : "text-blue-500"} />}
           </div>
           <div className="text-left">
              <div className="flex items-center gap-2">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none">{type}</p>
                 {!isClosed && !isBooked && (
                   <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      <Timer size={10} />
                      <span className="text-[9px] font-bold font-mono">{status?.timeLeft}</span>
                   </div>
                 )}
              </div>
              <p className="text-lg font-black tracking-tight mt-0.5">
                 {isBooked ? 'Confirmed' : isClosed ? 'Closed' : 'Book Now'}
              </p>
           </div>
        </div>
        {submitting === key ? (
          <Loader2 size={20} className="animate-spin text-gray-400" />
        ) : (
          isBooked ? <CheckCircle2 size={24} className="text-green-500" /> : <div className="w-6 h-6 rounded-full border-2 border-gray-200" />
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-12">
      {/* Mobile Header */}
      <header className="bg-white px-6 py-4 flex items-center gap-4 sticky top-0 z-20 border-b border-gray-100">
        <button onClick={() => router.back()} className="p-1">
          <ChevronLeft className="w-6 h-6 text-gray-900" />
        </button>
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Today's Booking</h1>
      </header>

      <div className="p-6 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        {/* Today Section */}
        <section className="space-y-4">
           <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Window</h2>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">Live Countdown</span>
           </div>
           <div className="grid gap-4">
              {renderSlot(today, 'breakfast')}
              {renderSlot(today, 'lunch')}
              {renderSlot(today, 'dinner')}
           </div>
        </section>

        {/* Quick Log */}
        <section className="space-y-4 pt-4">
           <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 px-1">Recent History</h2>
           <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
              {isLoading ? (
                <div className="p-12 flex flex-col items-center gap-3">
                   <Loader2 className="animate-spin text-blue-500" size={24} />
                   <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Syncing History</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                   {requests.slice(0, 8).map((req) => (
                     <div key={req.id} className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                        <div>
                           <p className="text-sm font-bold text-gray-900">{req.session_date}</p>
                           <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{req.meal_type}</p>
                        </div>
                        <Badge variant="outline" className={cn(
                          "rounded-full text-[9px] font-black uppercase tracking-tighter px-3 py-0.5",
                          req.status === 'requested' ? "border-green-100 text-green-700 bg-green-50" : "border-red-100 text-red-700 bg-red-50"
                        )}>
                          {req.status}
                        </Badge>
                     </div>
                   ))}
                   {requests.length === 0 && (
                     <div className="p-10 text-center">
                        <p className="text-xs text-gray-400 font-medium italic">No past bookings found</p>
                     </div>
                   )}
                </div>
              )}
           </div>
        </section>
      </div>
    </div>
  );
}
