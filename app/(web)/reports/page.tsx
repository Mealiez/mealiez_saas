import { BarChart3, Sparkles, Clock, FileText, PieChart, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function ReportsPlaceholderPage() {
  return (
    <div className="h-full flex items-center justify-center p-6 bg-slate-50/50">
      <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
        <Card className="border-none shadow-2xl shadow-indigo-500/10 rounded-[2.5rem] overflow-hidden">
          <div className="h-3 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600"></div>
          <CardContent className="p-10 text-center">
            <div className="mb-8 relative inline-block">
              <div className="h-24 w-24 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                <BarChart3 size={48} strokeWidth={1.5} />
              </div>
              <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white shadow-lg flex items-center justify-center text-indigo-500 animate-bounce">
                <Sparkles size={16} fill="currentColor" />
              </div>
            </div>

            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-3 leading-none">
              Analytics
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-6">
              Data-Driven Insights
            </p>

            <div className="space-y-4">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:shadow-xl hover:shadow-indigo-200/50 transition-all duration-300">
                <div className="flex items-center justify-center gap-3 text-slate-400 mb-2">
                  <Clock size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">Under Construction</span>
                </div>
                <p className="text-sm font-bold text-slate-600 leading-relaxed">
                  We are building a powerful reporting engine. Soon you will be able to export consumption audits, cost analysis, and waste management reports.
                </p>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-2">
                   <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-50 shadow-sm">
                      <FileText size={14} className="text-blue-500" />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">PDF Export</span>
                   </div>
                   <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-50 shadow-sm">
                      <PieChart size={14} className="text-indigo-500" />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Visuals</span>
                   </div>
                   <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white border border-slate-50 shadow-sm">
                      <TrendingUp size={14} className="text-cyan-500" />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Forecasting</span>
                   </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
