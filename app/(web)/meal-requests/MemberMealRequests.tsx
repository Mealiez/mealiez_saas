"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Utensils, Loader2, Timer, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getMealSessionStatus, MealSessionStatus, getMealSequenceStatus, MealWindowStatus } from '@/lib/utils/meal-times';

interface MealRequest {
  id: string;
  session_date: string;
  meal_type: string;
  status: 'requested' | 'cancelled';
  requested_at: string;
}

interface MealSettings {
  breakfast_start: string;
  lunch_start: string;
  dinner_start: string;
  timezone: string;
}

export default function MemberMealRequests() {
  const [requests, setRequests] = useState<MealRequest[]>([]);
  const [settings, setSettings] = useState<MealSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [sequenceStatus, setSequenceStatus] = useState<Record<string, { windowStatus: MealWindowStatus; timeLeft: string }>>({});

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/meal-requests');
      const data = await res.json();
      setRequests(data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load your requests');
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
    Promise.all([fetchRequests(), fetchSettings()]).finally(() => setIsLoading(false));

    // Re-fetch settings when window regains focus to reflect changes from other tabs
    const handleFocus = () => fetchSettings();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Countdown timer logic using sequence
  useEffect(() => {
    if (!settings) return;

    const tick = () => {
      setSequenceStatus(getMealSequenceStatus(settings));
    };

    tick(); // Initial call
    const interval = setInterval(tick, 1000);
    
    // Periodically re-fetch settings from DB to stay in sync with changes
    const settingsInterval = setInterval(fetchSettings, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(settingsInterval);
    };
  }, [settings]);

  const handleAction = async (date: string, type: string, action: 'request' | 'cancel') => {
    const key = `${date}-${type}`;
    setIsSubmitting(key);
    try {
      const res = await fetch('/api/meal-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_date: date, meal_type: type, action })
      });

      if (!res.ok) throw new Error('Action failed');
      
      toast.success(action === 'request' ? 'Meal requested!' : 'Request cancelled');
      
      // OPTIMISTIC UI: Update local state immediately
      setRequests(prev => {
        const otherRequests = prev.filter(r => !(r.session_date === date && r.meal_type === type));
        return [...otherRequests, { 
          id: Math.random().toString(), 
          session_date: date, 
          meal_type: type, 
          status: action === 'request' ? 'requested' : 'cancelled',
          requested_at: new Date().toISOString()
        }];
      });

      await fetchRequests(); // Sync with DB
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(null);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const renderSlot = (date: string, type: string, label: string) => {
    const request = requests.find(r => r.session_date === date && r.meal_type === type);
    const statusInfo = sequenceStatus[type];
    const windowStatus = statusInfo?.windowStatus || 'not_opened';
    
    // Determine final status based on window and user request
    let displayStatus: 'book' | 'ended' | 'not opened' | 'booked' | 'cancel' = 'book';
    if (request?.status === 'requested') displayStatus = 'booked';
    else if (request?.status === 'cancelled') displayStatus = 'cancel';
    else if (windowStatus === 'ended') displayStatus = 'ended';
    else if (windowStatus === 'not_opened') displayStatus = 'not opened';
    else displayStatus = 'book';

    const isBooked = displayStatus === 'booked';
    const isCancelled = displayStatus === 'cancel';
    const isEnded = displayStatus === 'ended';
    const isNotOpened = displayStatus === 'not opened';
    const isDisabled = isEnded || isNotOpened;
    const key = `${date}-${type}`;

    return (
      <div className={cn(
        "flex items-center justify-between p-5 rounded-2xl border transition-all",
        isDisabled ? "bg-gray-100/50 border-gray-200 grayscale opacity-60" : "bg-gray-50 border-gray-100 hover:bg-white hover:shadow-sm"
      )}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-2.5 rounded-xl transition-colors",
            isBooked ? "bg-green-100 text-green-600" : 
            isCancelled ? "bg-red-100 text-red-600" :
            isDisabled ? "bg-gray-200 text-gray-400" : "bg-blue-100 text-blue-600"
          )}>
            {isDisabled ? <Lock size={20} /> : <Utensils size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
               <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">{label}</p>
               {windowStatus === 'open' && (
                 <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    <Timer size={10} />
                    <span className="text-[10px] font-bold font-mono">{statusInfo?.timeLeft}</span>
                 </div>
               )}
            </div>
            <p className="text-base font-black text-gray-900 mt-0.5 uppercase tracking-tighter">
               {displayStatus}
            </p>
          </div>
        </div>
        
        <Button
          size="sm"
          variant={isBooked ? "outline" : "default"}
          onClick={() => handleAction(date, type, isBooked ? 'cancel' : 'request')}
          disabled={isSubmitting === key || isDisabled}
          className={cn(
            "rounded-xl font-bold h-10 px-6 uppercase text-xs tracking-widest",
            !isBooked && !isDisabled && "bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/10"
          )}
        >
          {isSubmitting === key ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isBooked ? (
            'Cancel'
          ) : isEnded ? (
            'Ended'
          ) : isNotOpened ? (
            'Locked'
          ) : (
            'Book Now'
          )}
        </Button>
      </div>
    );
  };

  if (isLoading) {
     return (
        <div className="p-20 text-center space-y-4">
           <Loader2 className="animate-spin mx-auto text-blue-500" size={32} />
           <p className="font-black uppercase tracking-widest text-gray-400 text-xs">Loading Live Status...</p>
        </div>
     );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Quick Request Section */}
      <div className="max-w-2xl mx-auto">
        <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-blue-500/10 overflow-hidden bg-white">
          <CardHeader className="bg-blue-600 text-white p-8">
            <div className="flex items-center justify-between">
               <div className="space-y-1">
                  <div className="flex items-center gap-3">
                     <Calendar className="opacity-60" size={20} />
                     <CardTitle className="text-2xl font-black uppercase tracking-tight">Today's Meals</CardTitle>
                  </div>
                  <CardDescription className="text-blue-100 font-medium italic">
                    {new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}
                  </CardDescription>
               </div>
               <Timer size={32} className="opacity-20" />
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-5">
             {renderSlot(today, 'breakfast', 'Breakfast')}
             {renderSlot(today, 'lunch', 'Lunch')}
             {renderSlot(today, 'dinner', 'Dinner')}
             
             <div className="pt-4 border-t border-gray-50">
                <p className="text-[10px] font-bold text-gray-400 uppercase text-center tracking-widest">
                   * Real-time cutoff applied based on {settings?.timezone} time
                </p>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* History Log */}
      <Card className="rounded-3xl border-none shadow-sm bg-white border border-gray-100 overflow-hidden">
        <CardHeader className="border-b border-gray-50 px-8 py-6">
          <CardTitle className="text-lg font-black uppercase tracking-tight text-gray-900">Personal Request History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="px-8 py-4">Date</th>
                  <th className="px-8 py-4">Meal</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4 text-right">Requested At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...requests].sort((a,b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()).map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-4 font-bold text-gray-900">{req.session_date}</td>
                    <td className="px-8 py-4 capitalize font-medium text-gray-600">{req.meal_type}</td>
                    <td className="px-8 py-4">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "rounded-full font-black uppercase text-[10px] tracking-widest px-3",
                          req.status === 'requested' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                        )}
                      >
                        {req.status === 'requested' ? 'booked' : 'cancel'}
                      </Badge>
                    </td>
                    <td className="px-8 py-4 text-right text-gray-400 font-medium">
                      {new Date(req.requested_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-gray-400 italic font-medium">
                      No meal requests found in your history.
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
