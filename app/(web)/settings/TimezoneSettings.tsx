"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, Loader2, Save, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const TIMEZONES = [
  { label: 'India (IST)', value: 'Asia/Kolkata' },
  { label: 'Universal (UTC)', value: 'UTC' },
  { label: 'London (GMT)', value: 'Europe/London' },
  { label: 'New York (EST)', value: 'America/New_York' },
  { label: 'Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Singapore (SGT)', value: 'Asia/Singapore' },
];

export default function TimezoneSettings() {
  const [timezone, setTimezone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings/meal-times');
        const result = await res.json();
        if (res.ok && result.data) {
          setTimezone(result.data.timezone);
        }
      } catch (err) {
        toast.error('Failed to load timezone');
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timezone) return;

    setIsSaving(true);
    try {
      const currentRes = await fetch('/api/settings/meal-times');
      const currentData = await currentRes.json();
      
      const res = await fetch('/api/settings/meal-times', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentData.data, timezone }),
      });

      if (!res.ok) throw new Error('Failed to save');
      
      toast.success('Timezone updated successfully');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      toast.error('Could not save timezone');
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

  return (
    <Card className="rounded-[2.5rem] border-none shadow-xl shadow-blue-500/5 overflow-hidden bg-white font-sans">
      <CardHeader className="bg-gray-900 text-white p-8">
        <div className="flex items-center gap-3">
          <Globe className="text-blue-400" size={24} />
          <div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight">Regional Timezone</CardTitle>
            <CardDescription className="text-gray-400 font-medium italic">
              Configure the master clock for all booking deadlines and automation.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-8">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-blue-600">
                  <Globe size={20} />
                </div>
                <div>
                  <p className="text-sm font-black uppercase text-gray-900 leading-none">Select Timezone</p>
                  <p className="text-xs font-medium text-gray-400 mt-1">All members will see timings based on this zone.</p>
                </div>
            </div>
            <select 
              className="h-12 px-4 rounded-xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white min-w-[250px] appearance-none cursor-pointer"
              value={timezone || ''}
              onChange={e => setTimezone(e.target.value)}
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label} — {tz.value}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-4">
            {showSuccess && (
              <div className="flex items-center gap-2 text-green-600 animate-in fade-in slide-in-from-right-2 duration-300">
                <CheckCircle2 size={16} />
                <span className="text-xs font-black uppercase tracking-widest">Timezone Saved</span>
              </div>
            )}
            <Button 
              type="submit" 
              disabled={isSaving}
              className="h-12 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-widest transition-all"
            >
              {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 w-4 h-4" />}
              Save Timezone
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
