"use client"

import { useState, useEffect } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { signOut } from '@/lib/auth/client-session'
import Link from 'next/link'
import { 
  QrCode, 
  Utensils, 
  Camera, 
  ChevronRight, 
  LogOut, 
  Zap,
  Activity,
  History,
  ChefHat,
  Monitor,
  LayoutGrid
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ActiveSession {
  id: string;
  label: string;
  meal_type: string;
  started_at: string;
}

export default function MobileHomePage() {
  const { user, isLoading: authLoading, isAuthorized } = useAuthGuard()
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (user && ['admin', 'manager'].includes(user.role)) {
       fetch('/api/attendance/sessions')
         .then(res => res.json())
         .then(data => {
            setActiveSessions(data.data?.filter((s: any) => s.is_active) || [])
         })
         .finally(() => setLoading(false))
    } else {
       setLoading(false)
    }
  }, [user])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthorized || !user) return null

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut();
  };

  const isManagerPlus = ['admin', 'manager'].includes(user.role)

  return (
    <div className="p-6 space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Authenticated {user.role}</p>
           <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase leading-none">
             Hello, {user.full_name.split(' ')[0]}
           </h1>
        </div>
      </header>

      {/* ACTIVE SESSION HIGHLIGHT (Manager Only) */}
      {isManagerPlus && activeSessions.length > 0 && (
        <section className="space-y-4">
           <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                 <Activity size={14} className="text-green-500" /> Live Tracking
              </h3>
           </div>
           <Link href="/m/attendance/active">
              <Card className="rounded-[2rem] border-none bg-blue-600 text-white shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all overflow-hidden relative">
                 <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
                    <Zap size={140} />
                 </div>
                 <CardContent className="p-6 relative z-10">
                    <div className="flex items-start justify-between">
                       <div className="space-y-3">
                          <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full border border-white/10">
                             <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                             <span className="text-[8px] font-black uppercase tracking-widest">{activeSessions[0].meal_type}</span>
                          </div>
                          <h4 className="text-xl font-black uppercase leading-tight">{activeSessions[0].label}</h4>
                          <p className="text-[10px] font-bold text-blue-100 uppercase tracking-tighter">Started {new Date(activeSessions[0].started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                       </div>
                       <ChevronRight size={24} className="text-white/50" />
                    </div>
                 </CardContent>
              </Card>
           </Link>
        </section>
      )}

      {/* CORE NAVIGATION GRID */}
      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 px-1">System Modules</h3>
        <div className="grid grid-cols-1 gap-4">
           <Link href="/m/my-qr" className="group">
              <div className="p-5 bg-white border border-gray-100 rounded-3xl active:scale-[0.98] transition-all shadow-sm flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                       <QrCode size={24} />
                    </div>
                    <div>
                       <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Identity Badge</h4>
                       <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Show to check-in</p>
                    </div>
                 </div>
                 <ChevronRight size={18} className="text-gray-300" />
              </div>
           </Link>

           <Link href="/m/meal-requests" className="group">
              <div className="p-5 bg-white border border-gray-100 rounded-3xl active:scale-[0.98] transition-all shadow-sm flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                       <Utensils size={24} />
                    </div>
                    <div>
                       <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Meal Booking</h4>
                       <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Manage your requests</p>
                    </div>
                 </div>
                 <ChevronRight size={18} className="text-gray-300" />
              </div>
           </Link>

           <Link href="/m/attendance/scan" className="group">
              <div className="p-5 bg-white border border-gray-100 rounded-3xl active:scale-[0.98] transition-all shadow-sm flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                       <Camera size={24} />
                    </div>
                    <div>
                       <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Scan Terminal</h4>
                       <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Mark attendance</p>
                    </div>
                 </div>
                 <ChevronRight size={18} className="text-gray-300" />
              </div>
           </Link>

           {isManagerPlus && (
             <Link href="/m/meal-requests/dashboard" className="group">
                <div className="p-5 bg-white border border-gray-100 rounded-3xl active:scale-[0.98] transition-all shadow-sm flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-gray-900/10">
                         <LayoutGrid size={24} />
                      </div>
                      <div>
                         <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Management Hub</h4>
                         <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Analytics & Reporting</p>
                      </div>
                   </div>
                   <ChevronRight size={18} className="text-gray-300" />
                </div>
             </Link>
           )}
        </div>
      </section>

      {/* QUICK STATS / FOOTER */}
      <div className="pt-4 flex flex-col gap-6">
         <div className="grid grid-cols-2 gap-4">
            <Link href="/m/meals" className="p-4 bg-slate-100 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
               <ChefHat size={20} className="text-slate-600" />
               <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Meals Menu</span>
            </Link>
            {!isManagerPlus && (
               <Link href="/m/attendance/history" className="p-4 bg-slate-100 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                  <History size={20} className="text-slate-600" />
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">My Logs</span>
               </Link>
            )}
            {isManagerPlus && (
               <Link href="/m/profile" className="p-4 bg-slate-100 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                  <Monitor size={20} className="text-slate-600" />
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Profile</span>
               </Link>
            )}
         </div>
      </div>
    </div>
  )
}
