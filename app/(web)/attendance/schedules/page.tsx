"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Clock, 
  Calendar as CalendarIcon, 
  Loader2, 
  AlertCircle,
  Bell,
  Utensils,
  MapPin,
  Settings2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Schedule {
  id: string;
  meal_type: string;
  label: string;
  start_time: string;
  days_of_week: number[];
  is_active: boolean;
  scan_mode: 'session' | 'member';
  branch_id?: string;
  branches?: { name: string };
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AttendanceSchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowShowForm] = useState(false);

  // Form State
  const [newSchedule, setNewSchedule] = useState({
    meal_type: 'lunch',
    label: '',
    start_time: '12:00',
    days_of_week: [1, 2, 3, 4, 5],
    scan_mode: 'session' as 'session' | 'member',
    branch_id: '',
  });

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/attendance/schedules');
      const data = await res.json();
      setSchedules(data.data || []);
    } catch (err) {
      toast.error('Failed to load schedules');
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch('/api/branches');
      const data = await res.json();
      setBranches(data.data || []);
    } catch (err) {
      console.error('Failed to load branches');
    }
  };

  useEffect(() => {
    Promise.all([fetchSchedules(), fetchBranches()]).finally(() => setIsLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const payload = {
        ...newSchedule,
        branch_id: newSchedule.branch_id === '' ? null : newSchedule.branch_id
      };
      
      const res = await fetch('/api/attendance/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();
      
      toast.success('Schedule created successfully');
      setShowShowForm(false);
      fetchSchedules();
    } catch (err) {
      toast.error('Could not create schedule');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This pattern will stop creating sessions.')) return;
    
    try {
      const res = await fetch(`/api/attendance/schedules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Schedule removed');
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/attendance/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (!res.ok) throw new Error();
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
      toast.success(currentStatus ? 'Schedule paused' : 'Schedule resumed');
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const toggleDay = (dayIndex: number) => {
    setNewSchedule(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(dayIndex)
        ? prev.days_of_week.filter(d => d !== dayIndex)
        : [...prev.days_of_week, dayIndex],
    }));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase flex items-center gap-3">
             <Bell className="text-blue-600" /> Auto-Sessions
          </h1>
          <p className="text-gray-500 font-medium mt-1">Schedule recurring meal sessions to start automatically.</p>
        </div>
        <Button 
          onClick={() => setShowShowForm(!showForm)}
          className="rounded-2xl h-12 px-6 bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-500/20 transition-all"
        >
          {showForm ? 'Cancel' : <><Plus size={16} className="mr-2" /> Create Schedule</>}
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-blue-500/10 overflow-hidden bg-white animate-in slide-in-from-top-4 duration-300">
          <CardHeader className="bg-gray-900 text-white p-8">
            <CardTitle className="text-xl font-black uppercase tracking-tight">New Automation Pattern</CardTitle>
            <CardDescription className="text-gray-400 font-medium">Define when the system should fire up a new session.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleCreate} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Schedule Label</Label>
                    <Input 
                      placeholder="e.g. Daily Staff Lunch" 
                      value={newSchedule.label}
                      onChange={e => setNewSchedule({...newSchedule, label: e.target.value})}
                      className="rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-all h-12"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Meal Type</Label>
                      <select 
                        className="w-full h-12 px-3 rounded-xl border border-gray-100 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={newSchedule.meal_type}
                        onChange={e => setNewSchedule({...newSchedule, meal_type: e.target.value})}
                      >
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Start Time</Label>
                      <Input 
                        type="time" 
                        value={newSchedule.start_time}
                        onChange={e => setNewSchedule({...newSchedule, start_time: e.target.value})}
                        className="rounded-xl border-gray-100 bg-gray-50 h-12"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Initial Scan Mode</Label>
                      <select 
                        className="w-full h-12 px-3 rounded-xl border border-gray-100 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={newSchedule.scan_mode}
                        onChange={e => setNewSchedule({...newSchedule, scan_mode: e.target.value as 'session' | 'member'})}
                      >
                        <option value="session">Member Scan (Mode A)</option>
                        <option value="member">Admin Scan (Mode B)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Mess Branch</Label>
                      <select 
                        className="w-full h-12 px-3 rounded-xl border border-gray-100 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={newSchedule.branch_id}
                        onChange={e => setNewSchedule({...newSchedule, branch_id: e.target.value})}
                      >
                        <option value="">Global (All Branches)</option>
                        {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">Repeat Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((day, idx) => {
                      const isSelected = newSchedule.days_of_week.includes(idx);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(idx)}
                          className={cn(
                            "w-12 h-12 rounded-xl text-xs font-black uppercase transition-all border-2",
                            isSelected 
                              ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20" 
                              : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                          )}
                        >
                          {day.charAt(0)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                    <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-[10px] font-medium text-amber-900 leading-relaxed">
                      Sessions created by schedule must be **Closed Manually**. The automation only handles the Start trigger.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                 <Button 
                   type="submit" 
                   disabled={isCreating}
                   className="h-14 px-10 rounded-2xl bg-gray-900 hover:bg-black font-black uppercase tracking-widest shadow-xl transition-all"
                 >
                   {isCreating ? <Loader2 className="animate-spin mr-2" /> : <Clock className="mr-2 w-4 h-4" />}
                   Save Schedule
                 </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List of Schedules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          <div className="col-span-full py-20 text-center">
             <Loader2 className="animate-spin mx-auto text-gray-300" size={32} />
          </div>
        ) : schedules.map((s) => (
          <Card key={s.id} className={cn(
            "rounded-[2.5rem] border-none shadow-sm transition-all group overflow-hidden bg-white border border-gray-50",
            !s.is_active && "opacity-60 grayscale"
          )}>
            <div className="p-8 space-y-6">
               <div className="flex items-start justify-between">
                  <div className="space-y-1">
                     <Badge variant="outline" className="capitalize border-blue-100 text-blue-700 bg-blue-50/30 font-black text-[9px] tracking-widest px-2.5 flex items-center gap-1 w-fit">
                        <Utensils size={10} />
                        {s.meal_type}
                     </Badge>
                     <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{s.label}</h3>
                  </div>
                  <div className="flex gap-2">
                     <button 
                       onClick={() => toggleActive(s.id, s.is_active)}
                       className={cn(
                         "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                         s.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
                       )}
                     >
                        <Bell size={18} />
                     </button>
                     <button 
                       onClick={() => handleDelete(s.id)}
                       className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all flex items-center justify-center"
                     >
                        <Trash2 size={18} />
                     </button>
                  </div>
               </div>

               <div className="space-y-3">
                  <div className="flex items-center gap-6 text-gray-500">
                    <div className="flex items-center gap-2 font-mono font-bold text-lg">
                      <Clock size={16} className="text-gray-400" />
                      {s.start_time.substring(0, 5)}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                      <Settings2 size={12} />
                      Mode {s.scan_mode === 'session' ? 'A' : 'B'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                    <CalendarIcon size={16} />
                    {s.days_of_week.length === 7 ? 'Daily' : s.days_of_week.map(d => DAYS[d].charAt(0)).join(', ')}
                  </div>
                  {s.branches?.name && (
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500">
                      <MapPin size={12} />
                      {s.branches.name}
                    </div>
                  )}
               </div>

               <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</span>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    s.is_active ? "text-green-600" : "text-amber-600"
                  )}>
                    {s.is_active ? 'Armed & Ready' : 'Paused'}
                  </span>
               </div>
            </div>
          </Card>
        ))}

        {!isLoading && schedules.length === 0 && !showForm && (
           <div className="col-span-full py-20 text-center bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-300">
                 <Bell size={32} />
              </div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No active automation patterns.</p>
              <Button 
                variant="link" 
                onClick={() => setShowShowForm(true)}
                className="text-blue-600 font-black uppercase tracking-widest text-[10px] mt-2"
              >
                Create your first schedule
              </Button>
           </div>
        )}
      </div>
    </div>
  );
}
