"use client";

import { useState } from 'react';
import { BarChart3, Sparkles, FileText, Download, ChevronLeft, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { toast } from 'sonner';
import Papa from 'papaparse';

export default function MobileReportsPage() {
  const [isExporting, setIsExporting] = useState(false);

  const exportTodaySummary = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/reports/today-summary');
      if (!res.ok) throw new Error('Failed to fetch data');
      
      const { summary } = await res.json();
      
      const csvData = [
        ['Category', 'Breakfast', 'Lunch', 'Dinner', 'Total'],
        ['Meal Requests', summary.requests.breakfast, summary.requests.lunch, summary.requests.dinner, summary.requests.total],
        ['Actual Attendance', summary.attendance.breakfast, summary.attendance.lunch, summary.attendance.dinner, summary.attendance.total]
      ];

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `Mealiez_Summary_${summary.date}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Summary exported successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      <header className="bg-white px-6 py-4 flex items-center gap-4 sticky top-0 z-20 border-b border-gray-100">
        <Link href="/m/home" className="p-1">
          <ChevronLeft className="w-6 h-6 text-gray-900" />
        </Link>
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Module Reports</h1>
      </header>

      <div className="p-6 flex-1 space-y-6">
        <Card className="border-none shadow-xl shadow-indigo-500/5 rounded-[2.5rem] overflow-hidden bg-white">
          <div className="h-2 bg-gradient-to-r from-indigo-600 to-blue-600"></div>
          <CardContent className="p-8 text-center">
            <div className="mb-6 relative inline-block">
              <div className="h-20 w-20 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                <BarChart3 size={40} strokeWidth={1.5} />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-white shadow-lg flex items-center justify-center text-amber-500 animate-bounce">
                <Sparkles size={12} fill="currentColor" />
              </div>
            </div>

            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-1">Operations</h1>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-8">Management Reporting Engine</p>

            <div className="space-y-4">
               <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100/50 text-left">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-700 mb-1">Quick Export</h4>
                  <p className="text-xs font-bold text-indigo-900/60 leading-tight uppercase mb-4">Download current day consumption and request summary.</p>
                  
                  <Button 
                    onClick={exportTodaySummary}
                    disabled={isExporting}
                    className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-500/20"
                  >
                    {isExporting ? <Loader2 className="animate-spin mr-2" /> : <Download className="mr-2 w-4 h-4" />}
                    Export Today Summary
                  </Button>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm text-left">
                     <FileText size={20} className="text-blue-500 mb-2" />
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-900">Audit Log</h4>
                     <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Full History</p>
                  </div>
                  <div className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm text-left">
                     <FileText size={20} className="text-emerald-500 mb-2" />
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-900">Meal Stats</h4>
                     <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Predictions</p>
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>

        <div className="p-6 bg-gray-900 rounded-[2.5rem] text-white">
           <h3 className="text-sm font-black uppercase tracking-widest mb-2 opacity-60">System Note</h3>
           <p className="text-xs font-bold leading-relaxed uppercase tracking-tight text-gray-400">
             Reports generated here include all branches under your tenant. For specific branch reports, please use the desktop dashboard.
           </p>
        </div>
      </div>
    </div>
  );
}
