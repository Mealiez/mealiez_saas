"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Clock, Save, Loader2, Info, Globe, Play } from 'lucide-react';
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

const TIMEZONES = [
  { label: 'India (IST)', value: 'Asia/Kolkata' },
  { label: 'Universal (UTC)', value: 'UTC' },
  { label: 'London (GMT)', value: 'Europe/London' },
  { label: 'New York (EST)', value: 'America/New_York' },
  { label: 'Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Singapore (SGT)', value: 'Asia/Singapore' },
];

export default function MealTimeConfig() {
  const [settings, setSettings] = useState<MealSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings/meal-times');
        const data = await res.json();
        setSettings(data.data);
      } catch (err) {
        toast.error('Failed to load settings');
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
    } catch (err) {
      toast.error('Could not save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const runAutomationTest = async () => {
    setIsTesting(true);
    const toastId = toast.loading('Triggering manual automation sync...');
    try {
      // We point to the Edge Function to simulate the Cron Job
      const res = await fetch('https://jplvixcpovpsjgsjgpks.supabase.co/functions/v1/process-attendance-schedules', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
          // Note: In local dev, this might need more setup, 
          // but on hosted it will use the project's logic.
        }
      });

      if (!res.ok) throw new Error('Sync failed');
      
      toast.success('Automation logic executed. Check Active Sessions.', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Trigger failed. Ensure Edge Function is deployed.', { id: toastId });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-black uppercase tracking-widest text-gray-400">Loading Configuration...</p>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-8">
      <Card className="rounded-[2.5rem] border-none shadow-xl shadow-blue-500/5 overflow-hidden bg-white">
        <CardHeader className="bg-gray-900 text-white p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <Clock className="text-blue-400" size={24} />
                  <CardTitle className="text-2xl font-black uppercase tracking-tight">Session Timing Control</CardTitle>
                </div>
                <CardDescription className="text-gray-400 font-medium italic">
                  Configure the active windows for meal sessions and booking deadlines.
                </CardDescription>
            </div>
            <div className="hidden md:block">
                <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm flex flex-col items-end">
                  <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest leading-none mb-1.5 text-right w-full">Current Zone</p>
                  <p className="text-xs font-bold text-white leading-none text-right">{settings.timezone}</p>
                </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8">
          <form onSubmit={handleSave} className="space-y-8">
            
            {/* Global Timezone Picker */}
            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-600">
                    <Globe size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase text-gray-900 leading-none">Regional Timezone</p>
                    <p className="text-xs font-medium text-gray-400 mt-1">All automation and deadlines will use this local clock.</p>
                  </div>
              </div>
              <select 
                className="h-12 px-4 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white min-w-[200px]"
                value={settings.timezone}
                onChange={e => setSettings({...settings, timezone: e.target.value})}
              >
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>

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
                        className="rounded-xl border-amber-200 bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-amber-600 tracking-widest">End Time</Label>
                      <Input 
                        type="time" 
                        value={settings.breakfast_end} 
                        onChange={e => setSettings({...settings, breakfast_end: e.target.value})}
                        className="rounded-xl border-amber-200 bg-white"
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
                        className="rounded-xl border-blue-200 bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-blue-600 tracking-widest">End Time</Label>
                      <Input 
                        type="time" 
                        value={settings.lunch_end} 
                        onChange={e => setSettings({...settings, lunch_end: e.target.value})}
                        className="rounded-xl border-blue-200 bg-white"
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
                        className="rounded-xl border-indigo-200 bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">End Time</Label>
                      <Input 
                        type="time" 
                        value={settings.dinner_end} 
                        onChange={e => setSettings({...settings, dinner_end: e.target.value})}
                        className="rounded-xl border-indigo-200 bg-white"
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
                the booking window closes automatically for that specific meal.
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={isSaving}
                className="h-14 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all"
              >
                {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 w-4 h-4" />}
                Save Configuration
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>

      {/* Debug/Test Tools */}
      <Card className="rounded-3xl border border-dashed border-gray-200 bg-gray-50/30">
         <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 text-gray-400">
                  <Play size={20} />
               </div>
               <div>
                  <h4 className="font-black text-gray-900 uppercase text-sm">Force Automation Sync</h4>
                  <p className="text-xs text-gray-500 font-medium">Manually trigger the scheduler to check for pending sessions.</p>
               </div>
            </div>
            <Button 
              variant="outline" 
              onClick={runAutomationTest}
              disabled={isTesting}
              className="rounded-xl font-bold bg-white"
            >
               {isTesting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : 'Run Sync Now'}
            </Button>
         </CardContent>
      </Card>
    </div>
  );
}
