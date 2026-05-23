"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Utensils, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MealRequest {
  id: string;
  session_date: string;
  meal_type: string;
  status: 'requested' | 'cancelled';
  requested_at: string;
}

export default function MemberMealRequests() {
  const [requests, setRequests] = useState<MealRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/meal-requests');
      const data = await res.json();
      setRequests(data.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load your requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

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
      fetchRequests();
    } catch (err) {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(null);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const renderSlot = (date: string, type: string, label: string) => {
    const request = requests.find(r => r.session_date === date && r.meal_type === type);
    const isRequested = request?.status === 'requested';
    const key = `${date}-${type}`;

    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-all hover:bg-white hover:shadow-sm">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl",
            isRequested ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
          )}>
            <Utensils size={18} />
          </div>
          <div>
            <p className="text-xs font-black uppercase text-gray-400 tracking-widest">{label}</p>
            <p className="text-sm font-bold text-gray-900">{isRequested ? 'Reserved' : 'Not Requested'}</p>
          </div>
        </div>
        
        <Button
          size="sm"
          variant={isRequested ? "outline" : "default"}
          onClick={() => handleAction(date, type, isRequested ? 'cancel' : 'request')}
          disabled={isSubmitting === key}
          className={cn(
            "rounded-xl font-bold h-9 px-5",
            !isRequested && "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {isSubmitting === key ? <Loader2 size={16} className="animate-spin" /> : (isRequested ? 'Cancel' : 'Request')}
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Quick Request Section */}
      <div className="max-w-2xl mx-auto">
        <Card className="rounded-[2.5rem] border-2 border-blue-50 shadow-xl shadow-blue-500/5 overflow-hidden">
          <CardHeader className="bg-blue-600 text-white p-8">
            <div className="flex items-center gap-3 mb-1">
               <Calendar className="opacity-60" size={20} />
               <CardTitle className="text-2xl font-black uppercase tracking-tight">Today</CardTitle>
            </div>
            <CardDescription className="text-blue-100 font-medium italic">
              {new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
             {renderSlot(today, 'breakfast', 'Breakfast')}
             {renderSlot(today, 'lunch', 'Lunch')}
             {renderSlot(today, 'dinner', 'Dinner')}
          </CardContent>
        </Card>
      </div>

      {/* History Log */}
      <Card className="rounded-3xl border-none shadow-sm bg-white border border-gray-100 overflow-hidden">
        <CardHeader className="border-b border-gray-50 px-8 py-6">
          <CardTitle className="text-lg font-black uppercase tracking-tight text-gray-900">Request History</CardTitle>
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
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-gray-400">
                      <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                      <p className="font-bold uppercase tracking-widest text-xs">Loading Log...</p>
                    </td>
                  </tr>
                ) : requests.map((req) => (
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
                        {req.status}
                      </Badge>
                    </td>
                    <td className="px-8 py-4 text-right text-gray-400 font-medium">
                      {new Date(req.requested_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {!isLoading && requests.length === 0 && (
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
