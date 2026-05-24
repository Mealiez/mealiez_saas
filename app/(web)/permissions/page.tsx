import { Shield, Sparkles, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function PermissionsPage() {
  return (
    <div className="h-full flex items-center justify-center p-6 bg-slate-50/50">
      <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
        <Card className="border-none shadow-2xl shadow-blue-500/10 rounded-[2.5rem] overflow-hidden">
          <div className="h-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
          <CardContent className="p-10 text-center">
            <div className="mb-8 relative inline-block">
              <div className="h-24 w-24 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
                <Shield size={48} strokeWidth={1.5} />
              </div>
              <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white shadow-lg flex items-center justify-center text-amber-500 animate-bounce">
                <Sparkles size={16} fill="currentColor" />
              </div>
            </div>

            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-3 leading-none">
              Permissions
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-6">
              Advanced RBAC Control
            </p>

            <div className="space-y-4">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                <div className="flex items-center justify-center gap-3 text-slate-400 mb-2">
                  <Clock size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">Coming Soon</span>
                </div>
                <p className="text-sm font-bold text-slate-600 leading-relaxed">
                  We are building a granular permission system. Soon you will be able to create custom roles and define exactly what each member can see and do.
                </p>
              </div>

              <div className="pt-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest justify-center">
                  <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                  Granular Access
                  <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                  Custom Roles
                  <div className="h-1 w-1 rounded-full bg-slate-300"></div>
                  Audit Logs
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
