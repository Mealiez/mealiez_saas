"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Settings2, 
  Zap, 
  Clock, 
  MapPin, 
  Download, 
  ChevronRight, 
  ArrowLeft,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

/*
 * CLIENT COMPONENT: Attendance Setup Page
 * Orchestrates Automated and Quick attendance configurations.
 */

interface Branch {
  id: string;
  name: string;
}

interface AutomatedConfig {
  id?: string;
  branch_id: string;
  is_enabled: boolean;
  static_qr_token: string;
  breakfast_start: string;
  breakfast_end: string;
  lunch_start: string;
  lunch_end: string;
  dinner_start: string;
  dinner_end: string;
}

function AttendanceSetupContent() {
  const [step, setStep] = useState<'selection' | 'automated_config'>('selection');
  const searchParams = useSearchParams();
  const preSelectedBranchId = searchParams.get('branch_id');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeConfig, setActiveConfig] = useState<AutomatedConfig | null>(null);
  const [form, setForm] = useState<Partial<AutomatedConfig>>({
    breakfast_start: '07:00',
    breakfast_end: '10:30',
    lunch_start: '12:00',
    lunch_end: '15:30',
    dinner_start: '19:00',
    dinner_end: '22:30',
    is_enabled: true
  });

  useEffect(() => {
    async function init() {
      try {
        const [bRes, cRes] = await Promise.all([
          fetch('/api/branches'),
          fetch('/api/attendance/automated/config')
        ]);
        const bData = await bRes.json();
        const cData = await cRes.json();
        
        const fetchedBranches = bData.data || [];
        setBranches(fetchedBranches);

        // Logic: 
        // 1. If branch_id in URL, select that branch
        // 2. Else if existing config, select first config branch
        // 3. Else select nothing
        if (preSelectedBranchId) {
           setForm(prev => ({ ...prev, branch_id: preSelectedBranchId }));
           setStep('automated_config');
           // Fetch config for this specific branch
           const specific = cData.data?.find((c: any) => c.branch_id === preSelectedBranchId);
           if (specific) {
             setActiveConfig(specific);
             setForm(specific);
           }
        } else if (cData.data?.length > 0) {
          setActiveConfig(cData.data[0]);
          setForm(cData.data[0]);
        }
      } catch (e) {
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [preSelectedBranchId]);

  const handleSaveConfig = async () => {
    if (!form.branch_id) {
      toast.error('Please select a branch first');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/attendance/automated/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActiveConfig(data.data);
      toast.success('Automated configuration saved');
      setStep('selection');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading && step === 'selection') {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-500 font-bold uppercase tracking-widest text-[10px]">Syncing Config</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Print-only QR Section */}
      <div className="hidden print:block print:m-0 print:p-0">
         <div className="flex flex-col items-center justify-center min-h-screen text-center space-y-12">
            <h1 className="text-6xl font-black uppercase tracking-tighter text-black">MEALIEZ</h1>
            <div className="border-[20px] border-black p-8 rounded-[4rem]">
               <QRCodeSVG 
                  value={`${window.location.origin}/m/attendance/mark?token=${activeConfig?.static_qr_token}&type=automated`}
                  size={500}
               />
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-gray-900">{branches.find(b => b.id === activeConfig?.branch_id)?.name || 'Assigned Branch'}</h2>
              <p className="text-2xl text-gray-500 font-medium">Scan to Mark Attendance</p>
            </div>
            <div className="grid grid-cols-3 gap-12 pt-12 border-t-2 border-gray-100 w-full max-w-4xl">
               <div>
                  <p className="text-sm font-black text-gray-400 uppercase">Breakfast</p>
                  <p className="text-xl font-bold">{activeConfig?.breakfast_start.slice(0, 5)} - {activeConfig?.breakfast_end.slice(0, 5)}</p>
               </div>
               <div>
                  <p className="text-sm font-black text-gray-400 uppercase">Lunch</p>
                  <p className="text-xl font-bold">{activeConfig?.lunch_start.slice(0, 5)} - {activeConfig?.lunch_end.slice(0, 5)}</p>
               </div>
               <div>
                  <p className="text-sm font-black text-gray-400 uppercase">Dinner</p>
                  <p className="text-xl font-bold">{activeConfig?.dinner_start.slice(0, 5)} - {activeConfig?.dinner_end.slice(0, 5)}</p>
               </div>
            </div>
         </div>
      </div>

      <div className="print:hidden space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/attendance">
              <Button variant="ghost" size="icon" className="rounded-full bg-gray-100 hover:bg-gray-200">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Attendance Setup</h1>
              <p className="text-gray-500 font-medium text-sm">Configure how check-ins are recorded</p>
            </div>
          </div>
        </div>

        {step === 'selection' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mode 1: Automated */}
            <Card className="rounded-[2.5rem] border-2 shadow-sm overflow-hidden flex flex-col group hover:border-indigo-600 transition-all duration-300">
              <CardHeader className="bg-gray-50/50 p-8 border-b">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-200">
                  <Settings2 className="w-7 h-7" />
                </div>
                <CardTitle className="text-2xl font-black uppercase tracking-tight text-gray-900">Automated Mode</CardTitle>
                <CardDescription className="text-sm font-medium">Recommended for regular mess operations. Permanent QR with automatic meal detection.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 flex-1 space-y-6">
                <div className="space-y-4">
                   <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                      <span className="text-indigo-600">✓</span> Permanent QR (Never changes)
                   </div>
                   <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                      <span className="text-indigo-600">✓</span> No daily session setup required
                   </div>
                   <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                      <span className="text-indigo-600">✓</span> Branch-specific security
                   </div>
                </div>

                {activeConfig && (
                   <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Current Status</p>
                      <div className="flex items-center justify-between">
                         <span className="font-bold text-indigo-900">Active at {branches.find(b => b.id === activeConfig.branch_id)?.name}</span>
                         <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                   </div>
                )}
              </CardContent>
              <CardFooter className="p-8 pt-0 gap-3">
                 <Button className="flex-1 rounded-2xl h-14 font-black bg-indigo-600 hover:bg-indigo-700 uppercase tracking-tight text-sm" onClick={() => setStep('automated_config')}>
                    {activeConfig ? 'Edit Config' : 'Configure Now'}
                 </Button>
                 {activeConfig && (
                    <Button variant="outline" className="rounded-2xl h-14 px-6 border-2" onClick={handlePrint}>
                       <Download className="w-5 h-5" />
                    </Button>
                 )}
              </CardFooter>
            </Card>

            {/* Mode 2: Quick */}
            <Card className="rounded-[2.5rem] border-2 shadow-sm overflow-hidden flex flex-col group hover:border-blue-600 transition-all duration-300">
              <CardHeader className="bg-gray-50/50 p-8 border-b">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-200">
                  <Zap className="w-7 h-7" />
                </div>
                <CardTitle className="text-2xl font-black uppercase tracking-tight text-gray-900">Quick Mode</CardTitle>
                <CardDescription className="text-sm font-medium">Recommended for temporary events or special meals. Manager creates session manually.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 flex-1 space-y-6">
                 <div className="space-y-4">
                   <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                      <span className="text-blue-600">✓</span> Dynamic QR (Expires quickly)
                   </div>
                   <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                      <span className="text-blue-600">✓</span> Precise manual control
                   </div>
                   <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                      <span className="text-blue-600">✓</span> Support for ad-hoc events
                   </div>
                </div>
              </CardContent>
              <CardFooter className="p-8 pt-0">
                 <Button className="w-full rounded-2xl h-14 font-black bg-blue-600 hover:bg-blue-700 uppercase tracking-tight text-sm" asChild>
                    <Link href="/attendance">Launch Quick Session</Link>
                 </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <Card className="rounded-[2.5rem] border-none shadow-2xl animate-in zoom-in duration-300">
             <CardHeader className="p-8 border-b">
               <div className="flex justify-between items-center">
                 <div>
                    <CardTitle className="text-2xl font-black uppercase tracking-tight">Configure Automated Attendance</CardTitle>
                    <CardDescription className="text-sm font-medium">Step-by-step setup for permanent branch QR</CardDescription>
                 </div>
                 <Button variant="ghost" className="rounded-full" onClick={() => setStep('selection')}>
                    Cancel
                 </Button>
               </div>
             </CardHeader>
             <CardContent className="p-8 space-y-8">
                
                {/* Branch Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs">1</div>
                    <Label className="text-lg font-bold">Select Branch Location</Label>
                  </div>
                  <select 
                    value={form.branch_id}
                    onChange={e => setForm({...form, branch_id: e.target.value})}
                    className="w-full h-14 px-4 rounded-2xl border-2 border-gray-100 focus:border-indigo-600 outline-none transition-all font-bold"
                  >
                    <option value="">Choose a branch...</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Meal Timings */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs">2</div>
                    <Label className="text-lg font-bold">Configure Meal Windows</Label>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Breakfast */}
                    <div className="p-6 bg-amber-50/50 rounded-[2rem] border border-amber-100 space-y-4">
                       <p className="text-xs font-black text-amber-600 uppercase tracking-widest">🍳 Breakfast</p>
                       <div className="space-y-2">
                         <Label className="text-[10px] uppercase font-black text-gray-400">Time Window</Label>
                         <div className="flex items-center gap-2">
                            <Input type="time" className="rounded-xl border-none font-bold" value={form.breakfast_start} onChange={e => setForm({...form, breakfast_start: e.target.value})} />
                            <span className="text-gray-400 font-bold">to</span>
                            <Input type="time" className="rounded-xl border-none font-bold" value={form.breakfast_end} onChange={e => setForm({...form, breakfast_end: e.target.value})} />
                         </div>
                       </div>
                    </div>

                    {/* Lunch */}
                    <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100 space-y-4">
                       <p className="text-xs font-black text-blue-600 uppercase tracking-widest">🍛 Lunch</p>
                       <div className="space-y-2">
                         <Label className="text-[10px] uppercase font-black text-gray-400">Time Window</Label>
                         <div className="flex items-center gap-2">
                            <Input type="time" className="rounded-xl border-none font-bold" value={form.lunch_start} onChange={e => setForm({...form, lunch_start: e.target.value})} />
                            <span className="text-gray-400 font-bold">to</span>
                            <Input type="time" className="rounded-xl border-none font-bold" value={form.lunch_end} onChange={e => setForm({...form, lunch_end: e.target.value})} />
                         </div>
                       </div>
                    </div>

                    {/* Dinner */}
                    <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100 space-y-4">
                       <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">🍱 Dinner</p>
                       <div className="space-y-2">
                         <Label className="text-[10px] uppercase font-black text-gray-400">Time Window</Label>
                         <div className="flex items-center gap-2">
                            <Input type="time" className="rounded-xl border-none font-bold" value={form.dinner_start} onChange={e => setForm({...form, dinner_start: e.target.value})} />
                            <span className="text-gray-400 font-bold">to</span>
                            <Input type="time" className="rounded-xl border-none font-bold" value={form.dinner_end} onChange={e => setForm({...form, dinner_end: e.target.value})} />
                         </div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Info Card */}
                <div className="bg-gray-900 rounded-3xl p-6 text-white flex items-start gap-4">
                   <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl">💡</div>
                   <div>
                     <p className="text-sm font-bold">How it works</p>
                     <p className="text-xs text-gray-400 mt-1 leading-relaxed">The system will automatically detect the meal type based on the current scan time. If a user scans at 1:00 PM, they will be marked as "Present" for Lunch. Attendance is limited to once per meal per day.</p>
                   </div>
                </div>

             </CardContent>
             <CardFooter className="p-8 bg-gray-50 rounded-b-[2.5rem] border-t gap-4">
                <Button className="h-14 flex-1 rounded-2xl font-black bg-indigo-600 hover:bg-indigo-700 uppercase tracking-tight" onClick={handleSaveConfig} disabled={isLoading}>
                   {isLoading ? 'Saving...' : 'Save & Enable Mode'}
                </Button>
                {activeConfig && (
                   <Button variant="destructive" className="h-14 rounded-2xl px-6" disabled={isLoading}>
                      <Trash2 className="w-5 h-5" />
                   </Button>
                )}
             </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function AttendanceSetupPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-500 font-bold uppercase tracking-widest text-[10px]">Loading Setup</p>
      </div>
    }>
      <AttendanceSetupContent />
    </Suspense>
  );
}
