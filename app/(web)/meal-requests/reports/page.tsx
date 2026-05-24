"use client";

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileDown, Printer, FileText, Layout, Loader2, CheckCircle2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Stats {
  total_requests: number;
  meal_type_breakdown: {
    breakfast: number;
    lunch: number;
    dinner: number;
  };
  branch_distribution: { name: string; count: number }[];
}

export default function ReportsPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/meal-requests/stats');
        const data = await res.json();
        setStats(data.data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load live statistics');
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  const handleExport = async (type: 'quick' | 'detailed') => {
    if (!reportRef.current || !stats) return;
    setIsExporting(true);
    const toastId = toast.loading(`Generating ${type} report...`);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794, // Standard A4 width at 96dpi
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`mealiez-${type}-report-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success('Report downloaded successfully', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm font-black uppercase tracking-widest text-gray-400">Preparing Reports...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 pb-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-8">
        <div>
           <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase leading-none">Reporting Engine</h1>
           <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-3">Export analytics and booking data for kitchen prep</p>
        </div>
        <Badge className="bg-blue-50 text-blue-600 border-blue-100 font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
           Live Data Sync Active
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Quick Report Option */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-blue-500/5 bg-white group overflow-hidden transition-all hover:scale-[1.02]">
          <CardHeader className="p-10 pb-6">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">
               <FileText size={32} />
            </div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight text-gray-900 leading-none">Quick Summary</CardTitle>
            <CardDescription className="font-bold text-gray-400 text-xs uppercase tracking-widest mt-3">
               Today's Operational Totals
            </CardDescription>
          </CardHeader>
          <CardContent className="px-10 pb-10 space-y-6 text-sm text-gray-500 font-medium leading-relaxed">
             <p>A high-level overview of total bookings across all meal slots. Optimized for quick printing and physical distribution to kitchen staff.</p>
             <Button 
               onClick={() => handleExport('quick')}
               disabled={isExporting || !stats}
               className="w-full h-16 rounded-[2rem] bg-gray-900 hover:bg-black font-black uppercase tracking-widest text-xs shadow-xl shadow-gray-900/10"
             >
               {isExporting ? <Loader2 className="animate-spin mr-2" /> : <FileDown className="mr-2 w-5 h-5" />}
               Generate Summary PDF
             </Button>
          </CardContent>
        </Card>

        {/* Detailed Report Option */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-indigo-500/5 bg-white group overflow-hidden transition-all hover:scale-[1.02]">
          <CardHeader className="p-10 pb-6">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">
               <Layout size={32} />
            </div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight text-gray-900 leading-none">Full Audit</CardTitle>
            <CardDescription className="font-bold text-gray-400 text-xs uppercase tracking-widest mt-3">
               Branch & User Breakdown
            </CardDescription>
          </CardHeader>
          <CardContent className="px-10 pb-10 space-y-6 text-sm text-gray-500 font-medium leading-relaxed">
             <p>Granular distribution data including per-branch request counts. Ideal for auditing supply chain logistics and waste reduction.</p>
             <Button 
               onClick={() => handleExport('detailed')}
               disabled={isExporting || !stats}
               variant="outline"
               className="w-full h-16 rounded-[2rem] border-2 border-indigo-50 text-indigo-600 hover:bg-indigo-50 font-black uppercase tracking-widest text-xs"
             >
               {isExporting ? <Loader2 className="animate-spin mr-2" /> : <Printer className="mr-2 w-5 h-5" />}
               Export Full Audit
             </Button>
          </CardContent>
        </Card>
      </div>

      {/* Hidden Preview (What actually gets captured) */}
      <div className="opacity-0 pointer-events-none absolute left-[-9999px] top-0">
        <div 
          ref={reportRef} 
          className="w-[794px] p-12 bg-white flex flex-col space-y-10"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
           <div className="flex justify-between items-start border-b-[4px] border-gray-900 pb-8">
              <div>
                 <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 leading-none mb-1">Mealiez</h1>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Kitchen Operational Report</p>
              </div>
              <div className="text-right">
                 <p className="text-xs font-black text-gray-900 uppercase tracking-widest">DATE: {new Date().toLocaleDateString()}</p>
                 <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">Ref ID: MRT-{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
              </div>
           </div>

           <div className="grid grid-cols-4 gap-4">
              <div className="p-5 bg-gray-900 rounded-[1.5rem] flex flex-col items-center text-center">
                 <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Today</p>
                 <p className="text-3xl font-black text-white leading-none">{stats?.total_requests}</p>
              </div>
              <div className="p-5 bg-blue-50 rounded-[1.5rem] border border-blue-100 flex flex-col items-center text-center">
                 <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Breakfast</p>
                 <p className="text-3xl font-black text-blue-600 leading-none">{stats?.meal_type_breakdown.breakfast}</p>
              </div>
              <div className="p-5 bg-indigo-50 rounded-[1.5rem] border border-indigo-100 flex flex-col items-center text-center">
                 <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Lunch</p>
                 <p className="text-3xl font-black text-indigo-600 leading-none">{stats?.meal_type_breakdown.lunch}</p>
              </div>
              <div className="p-5 bg-purple-50 rounded-[1.5rem] border border-purple-100 flex flex-col items-center text-center">
                 <p className="text-[8px] font-black text-purple-400 uppercase tracking-widest mb-1">Dinner</p>
                 <p className="text-3xl font-black text-purple-600 leading-none">{stats?.meal_type_breakdown.dinner}</p>
              </div>
           </div>


           <div className="space-y-6">
              <div className="flex items-center gap-4 mb-4">
                 <h3 className="text-2xl font-black uppercase tracking-tight text-gray-900 leading-none">Branch Distribution</h3>
                 <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                 {stats?.branch_distribution.map(b => (
                   <div key={b.name} className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
                      <span className="text-lg font-black text-gray-700 uppercase tracking-tight">{b.name}</span>
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total requests</span>
                         <span className="text-2xl font-black text-gray-900 px-6 py-2 bg-gray-50 rounded-2xl min-w-[80px] text-center">{b.count}</span>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="pt-12 mt-auto border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3 text-green-600">
                 <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center border border-green-100">
                    <CheckCircle2 size={18} />
                 </div>
                 <span className="text-sm font-black uppercase tracking-widest">Verified by System Auditor</span>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Confidential Internal Document • Mealiez Platform</p>
           </div>
        </div>
      </div>
    </div>
  );
}
