"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Clock, Save, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface MealSettings {
  breakfast_start: string;
  breakfast_end: string;
  lunch_start: string;
  lunch_end: string;
  dinner_start: string;
  dinner_end: string;
  timezone: string;
}

const DEFAULT_SETTINGS: MealSettings = {
  breakfast_start: '07:00',
  breakfast_end: '09:00',
  lunch_start: '12:00',
  lunch_end: '14:00',
  dinner_start: '19:00',
  dinner_end: '21:00',
  timezone: 'Asia/Kolkata',
};

export default function MealTimeSettings() {
  const [settings, setSettings] = useState<MealSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings/meal-times');
        const result = await res.json();
        
        if (res.status === 404) {
          setSettings(DEFAULT_SETTINGS);
        } else if (res.ok && result.data) {
          setSettings(result.data);
        } else {
          throw new Error(result.error || 'Failed to load');
        }
      } catch (err) {
        toast.error('Failed to load settings');
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/meal-times', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error('Failed to save');
      
      toast.success('Meal settings updated successfully');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      toast.error('Could not save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12 font-sans">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <Card className="rounded-[2.5rem] border-none shadow-xl shadow-blue-500/5 overflow-hidden bg-white font-sans text-gray-900">
      <CardHeader className="bg-gray-900 text-white p-8">
        <div className="flex items-center gap-3">
          <Clock className="text-blue-400" size={24} />
          <div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight">Session Timing Control</CardTitle>
            <CardDescription className="text-gray-400 font-medium italic">
              Define the active windows for breakfast, lunch, and dinner.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-8">
        <form onSubmit={handleSave} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Breakfast */}
            <div className="space-y-4 p-6 bg-amber-50/50 rounded-3xl border border-amber-100/50">
              <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🍳</span>
                  <h3 className="font-black uppercase tracking-tight text-amber-900">Breakfast</h3>
              </div>
              <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Start Time</Label>
                    <Input 
                      type="time" 
                      value={settings.breakfast_start} 
                      onChange={e => setSettings({...settings, breakfast_start: e.target.value})}
                      className="rounded-xl border-amber-200 bg-white font-bold h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-amber-600 tracking-widest">End Time</Label>
                    <Input 
                      type="time" 
                      value={settings.breakfast_end} 
                      onChange={e => setSettings({...settings, breakfast_end: e.target.value})}
                      className="rounded-xl border-amber-200 bg-white font-bold h-11"
                    />
                  </div>
              </div>
            </div>

            {/* Lunch */}
            <div className="space-y-4 p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50">
              <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🍱</span>
                  <h3 className="font-black uppercase tracking-tight text-blue-900">Lunch</h3>
              </div>
              <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Start Time</Label>
                    <Input 
                      type="time" 
                      value={settings.lunch_start} 
                      onChange={e => setSettings({...settings, lunch_start: e.target.value})}
                      className="rounded-xl border-blue-200 bg-white font-bold h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-blue-600 tracking-widest">End Time</Label>
                    <Input 
                      type="time" 
                      value={settings.lunch_end} 
                      onChange={e => setSettings({...settings, lunch_end: e.target.value})}
                      className="rounded-xl border-blue-200 bg-white font-bold h-11"
                    />
                  </div>
              </div>
            </div>

            {/* Dinner */}
            <div className="space-y-4 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
              <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🍽️</span>
                  <h3 className="font-black uppercase tracking-tight text-indigo-900">Dinner</h3>
              </div>
              <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Start Time</Label>
                    <Input 
                      type="time" 
                      value={settings.dinner_start} 
                      onChange={e => setSettings({...settings, dinner_start: e.target.value})}
                      className="rounded-xl border-indigo-200 bg-white font-bold h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">End Time</Label>
                    <Input 
                      type="time" 
                      value={settings.dinner_end} 
                      onChange={e => setSettings({...settings, dinner_end: e.target.value})}
                      className="rounded-xl border-indigo-200 bg-white font-bold h-11"
                    />
                  </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3 border border-blue-100">
            <Info className="text-blue-600 mt-0.5 shrink-0" size={18} />
            <p className="text-xs font-medium text-blue-900 leading-relaxed">
              <strong>Deadline Logic:</strong> Members are strictly required to submit their meal requests 
              before the <strong>Start Time</strong> of each session. Once the start time passes, 
              the booking window closes automatically.
            </p>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            {showSuccess && (
              <div className="flex items-center gap-2 text-green-600 animate-in fade-in slide-in-from-right-2 duration-300">
                <CheckCircle2 size={16} />
                <span className="text-xs font-black uppercase tracking-widest">Timings Saved</span>
              </div>
            )}
            <Button 
              type="submit" 
              disabled={isSaving}
              className="h-14 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all font-sans"
            >
              {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 w-4 h-4" />}
              Save Configuration
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
