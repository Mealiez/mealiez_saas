"use client";

import { useState, useEffect } from 'react';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Utensils, 
  Loader2, 
  ChevronLeft,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MealRequest {
  id: string;
  session_date: string;
  meal_type: string;
  status: 'requested' | 'cancelled';
}

export default function MobileMealRequests() {
  const { user, isLoading: authLoading } = useAuthGuard();
  const router = useRouter();
  const [requests, setRequests] = useState<MealRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/meal-requests');
      const data = await res.json();
      setRequests(data.data || []);
    } catch (err) {
      toast.error('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchRequests();
  }, [user]);

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
      fetchRequests();
    } catch (err) {
      toast.error('Sync failed');
    } finally {
      setSubmitting(null);
    }
  };

  if (authLoading) return null;

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const renderSlot = (date: string, type: string) => {
    const req = requests.find(r => r.session_date === date && r.meal_type === type);
    const isBooked = req?.status === 'requested';
    const key = `${date}-${type}`;

    return (
      <button
        onClick={() => handleAction(date, type, isBooked ? 'cancel' : 'request')}
        disabled={submitting === key}
        className={cn(
          "w-full p-5 rounded-3xl border-2 flex items-center justify-between transition-all active:scale-[0.97]",
          isBooked 
            ? "bg-green-50 border-green-200 text-green-900" 
            : "bg-white border-gray-100 text-gray-900 shadow-sm"
        )}
      >
        <div className="flex items-center gap-4">
           <div className={cn(
             "w-10 h-10 rounded-2xl flex items-center justify-center",
             isBooked ? "bg-green-200/50" : "bg-gray-100"
           )}>
              <Utensils size={20} className={isBooked ? "text-green-600" : "text-gray-400"} />
           </div>
           <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{type}</p>
              <p className="text-lg font-black tracking-tight">{isBooked ? 'Reserved' : 'Available'}</p>
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
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Meal Booking</h1>
      </header>

      <div className="p-6 space-y-8">
        {/* Today Section */}
        <section className="space-y-4">
           <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Today</h2>
              <span className="text-xs font-bold text-gray-400">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
           </div>
           <div className="grid gap-3">
              {renderSlot(today, 'breakfast')}
              {renderSlot(today, 'lunch')}
              {renderSlot(today, 'dinner')}
           </div>
        </section>

        {/* Quick Log */}
        <section className="space-y-4 pt-4">
           <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Past Bookings</h2>
           <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
              {isLoading ? (
                <div className="p-12 flex justify-center">
                   <Loader2 className="animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                   {requests.slice(0, 5).map((req) => (
                     <div key={req.id} className="p-4 flex items-center justify-between">
                        <div>
                           <p className="text-sm font-bold text-gray-900">{req.session_date}</p>
                           <p className="text-[10px] font-black uppercase text-gray-400">{req.meal_type}</p>
                        </div>
                        <Badge variant="outline" className={cn(
                          "rounded-full text-[9px] font-black uppercase tracking-tighter",
                          req.status === 'requested' ? "border-green-100 text-green-600 bg-green-50" : "border-red-100 text-red-600 bg-red-50"
                        )}>
                          {req.status}
                        </Badge>
                     </div>
                   ))}
                   {requests.length === 0 && (
                     <p className="p-8 text-center text-xs text-gray-400 font-medium italic">No history found</p>
                   )}
                </div>
              )}
           </div>
        </section>
      </div>
    </div>
  );
}
