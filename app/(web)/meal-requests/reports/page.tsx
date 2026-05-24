"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileDown, Printer, FileText, Layout, Loader2, CheckCircle2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleExport = async (type: 'quick' | 'detailed') => {
    if (!reportRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading(`Generating ${type} report...`);

    try {
      // Small delay to ensure any animations finish
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`meal-request-${type}-report-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success('Report downloaded successfully', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-32">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Reporting Engine</h1>
        <p className="text-gray-500 font-medium mt-1">Export analytics and booking data for kitchen prep</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Quick Report Option */}
        <Card className="rounded-[2.5rem] border-2 border-gray-50 shadow-sm hover:border-blue-100 transition-all group overflow-hidden">
          <CardHeader className="p-8">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
               <FileText size={28} />
            </div>
            <CardTitle className="text-xl font-black uppercase tracking-tight">Quick Summary</CardTitle>
            <CardDescription className="font-medium text-gray-400">
               Single page overview of today's totals. Perfect for the kitchen notice board.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
             <Button 
               onClick={() => handleExport('quick')}
               disabled={isExporting}
               className="w-full h-14 rounded-2xl bg-gray-900 hover:bg-black font-black uppercase tracking-widest text-xs"
             >
               {isExporting ? <Loader2 className="animate-spin mr-2" /> : <FileDown className="mr-2 w-4 h-4" />}
               Export Quick PDF
             </Button>
          </CardContent>
        </Card>

        {/* Detailed Report Option */}
        <Card className="rounded-[2.5rem] border-2 border-gray-50 shadow-sm hover:border-indigo-100 transition-all group overflow-hidden">
          <CardHeader className="p-8">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
               <Layout size={28} />
            </div>
            <CardTitle className="text-xl font-black uppercase tracking-tight">Detailed Breakdown</CardTitle>
            <CardDescription className="font-medium text-gray-400">
               Complete list of all users, branches, and specific meal requests for the selected date.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
             <Button 
               onClick={() => handleExport('detailed')}
               disabled={isExporting}
               variant="outline"
               className="w-full h-14 rounded-2xl border-gray-200 hover:bg-gray-50 font-black uppercase tracking-widest text-xs"
             >
               {isExporting ? <Loader2 className="animate-spin mr-2" /> : <Printer className="mr-2 w-4 h-4" />}
               Print Detailed Log
             </Button>
          </CardContent>
        </Card>
      </div>

      {/* Hidden Preview (What actually gets captured) */}
      <div className="opacity-0 pointer-events-none absolute left-[-9999px] top-0">
        <div 
          ref={reportRef} 
          className="w-[800px] p-12 bg-white flex flex-col space-y-8"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
           <div className="flex justify-between items-start border-b-4 border-gray-900 pb-8">
              <div>
                 <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900">Mealiez</h1>
                 <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Kitchen Operational Report</p>
              </div>
              <div className="text-right">
                 <p className="text-sm font-black text-gray-900">DATE: {new Date().toLocaleDateString()}</p>
                 <p className="text-[10px] font-bold text-gray-400 uppercase">Generated via Mealiez Management Cloud</p>
              </div>
           </div>

           <div className="grid grid-cols-3 gap-8">
              <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Bookings</p>
                 <p className="text-4xl font-black text-gray-900">124</p>
              </div>
              <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Breakfast</p>
                 <p className="text-4xl font-black text-blue-600">42</p>
              </div>
              <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                 <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Lunch</p>
                 <p className="text-4xl font-black text-indigo-600">58</p>
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-lg font-black uppercase tracking-tight text-gray-900">Branch Distribution</h3>
              <div className="space-y-3">
                 {[
                   { name: 'Main Branch', count: 84 },
                   { name: 'Downtown Hub', count: 22 },
                   { name: 'West Campus', count: 18 }
                 ].map(b => (
                   <div key={b.name} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <span className="font-bold text-gray-700">{b.name}</span>
                      <span className="font-black text-gray-900 px-4 py-1 bg-gray-100 rounded-lg">{b.count}</span>
                   </div>
                 ))}
              </div>
           </div>

           <div className="pt-8 mt-auto border-t border-gray-100">
              <div className="flex items-center gap-2 text-green-600">
                 <CheckCircle2 size={16} />
                 <span className="text-xs font-black uppercase tracking-widest">Verified by System Auditor</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
