import { BarChart3, Sparkles, Clock, FileText, PieChart, TrendingUp, ChevronLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export default function MobileReportsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      <header className="bg-white px-6 py-4 flex items-center gap-4 sticky top-0 z-20 border-b border-gray-100">
        <Link href="/m/home" className="p-1">
          <ChevronLeft className="w-6 h-6 text-gray-900" />
        </Link>
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Reports</h1>
      </header>

      <div className="p-6 flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm animate-in fade-in zoom-in duration-500">
          <Card className="border-none shadow-2xl shadow-indigo-500/10 rounded-[2.5rem] overflow-hidden bg-white">
            <div className="h-3 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600"></div>
            <CardContent className="p-8 text-center">
              <div className="mb-6 relative inline-block">
                <div className="h-20 w-20 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                  <BarChart3 size={40} strokeWidth={1.5} />
                </div>
                <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-white shadow-lg flex items-center justify-center text-amber-500 animate-bounce">
                  <Sparkles size={12} fill="currentColor" />
                </div>
              </div>

              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2 leading-none">
                Analytics
              </h1>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-6">
                Mobile Reports Engine
              </p>

              <div className="space-y-4">
                <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <div className="flex items-center justify-center gap-3 text-slate-400 mb-2">
                    <Clock size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Coming Soon</span>
                  </div>
                  <p className="text-xs font-bold text-slate-600 leading-relaxed uppercase tracking-tight">
                    Advanced PDF exports and visual consumption audits are being optimized for mobile.
                  </p>
                </div>

                <div className="pt-2 grid grid-cols-3 gap-2">
                   <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white border border-slate-50 shadow-sm">
                      <FileText size={12} className="text-blue-500" />
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Audit</span>
                   </div>
                   <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white border border-slate-50 shadow-sm">
                      <PieChart size={12} className="text-indigo-500" />
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Usage</span>
                   </div>
                   <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white border border-slate-50 shadow-sm">
                      <TrendingUp size={12} className="text-cyan-500" />
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Trends</span>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
