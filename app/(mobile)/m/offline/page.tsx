'use client'

import { WifiOff, RefreshCcw, ShieldAlert, Utensils, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface MealRequest {
  id: string;
  session_date: string;
  meal_type: string;
  status: 'requested' | 'cancelled';
}

interface AttendanceLog {
  id: string;
  marked_at: string;
  method: string;
  session_id: {
    label: string;
    meal_type: string;
  };
}

export default function MobileOfflinePage() {
  const [isChecking, setIsChecking] = useState(false)
  const router = useRouter()
  const [cachedRequests, setCachedRequests] = useState<MealRequest[]>([])
  const [cachedLogs, setCachedLogs] = useState<AttendanceLog[]>([])
  const [activeTab, setActiveTab] = useState<'requests' | 'attendance'>('requests')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const requestsStr = localStorage.getItem('mealiez_meal_requests')
      const logsStr = localStorage.getItem('mealiez_attendance_logs')
      if (requestsStr) {
        try {
          setCachedRequests(JSON.parse(requestsStr))
        } catch (e) {}
      }
      if (logsStr) {
        try {
          setCachedLogs(JSON.parse(logsStr))
        } catch (e) {}
      }
    }
  }, [])

  const handleRetry = () => {
    setIsChecking(true)
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      router.push('/m/home')
    } else {
      setTimeout(() => setIsChecking(false), 1000)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      <div className="flex flex-col items-center justify-center pt-12 pb-6 px-6 text-center">
        <div className="bg-red-50 p-6 rounded-full mb-6">
          <WifiOff className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-xl font-black uppercase tracking-tight text-gray-900 mb-2">Connection Lost</h1>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-left w-full max-w-md">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800 font-medium leading-relaxed">
              For security reasons, offline attendance scanning and meal requests are disabled. An active connection is required to verify records.
            </p>
          </div>
        </div>

        <button 
          onClick={handleRetry} 
          disabled={isChecking}
          className="w-full max-w-[200px] py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all mb-8"
        >
          <RefreshCcw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking' : 'Try Again'}
        </button>
      </div>

      {/* SHOW CACHED RECORDS */}
      <div className="px-6 flex-1 max-w-md mx-auto w-full">
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-6 space-y-6">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Offline Data Viewer</h2>
            <p className="text-xs text-gray-500">Below are your last synced records cached on this device.</p>
          </div>

          {/* Tab buttons */}
          <div className="flex bg-gray-50 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab('requests')}
              className={cn(
                "flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all",
                activeTab === 'requests' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
              )}
            >
              Meal Bookings ({cachedRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={cn(
                "flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all",
                activeTab === 'attendance' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
              )}
            >
              Attendance ({cachedLogs.length})
            </button>
          </div>

          {/* Tab content */}
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {activeTab === 'requests' ? (
              cachedRequests.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {cachedRequests.map((req) => (
                    <div key={req.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{req.session_date}</p>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{req.meal_type}</p>
                      </div>
                      <Badge variant="outline" className={cn(
                        "rounded-full text-[9px] font-black uppercase tracking-tighter px-3 py-0.5",
                        req.status === 'requested' ? "border-green-100 text-green-700 bg-green-50" : "border-red-100 text-red-700 bg-red-50"
                      )}>
                        {req.status === 'requested' ? 'booked' : 'cancel'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-8 italic">No cached meal bookings</p>
              )
            ) : (
              cachedLogs.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {cachedLogs.map((log) => (
                    <div key={log.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0",
                          log.method === 'qr' ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
                        )}>
                          <Utensils size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 leading-none">{log.session_id?.label || 'Session'}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{log.session_id?.meal_type}</span>
                            <div className="w-1 h-1 rounded-full bg-gray-200" />
                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
                              {new Date(log.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] font-black text-gray-900 uppercase tracking-tighter mb-0.5">
                          {new Date(log.marked_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                        </p>
                        <Badge variant="outline" className={cn(
                          "rounded-full text-[8px] font-black uppercase tracking-widest px-2 py-0",
                          log.method === 'qr' ? "border-indigo-100 text-indigo-700 bg-indigo-50" : "border-amber-100 text-amber-700 bg-amber-50"
                        )}>
                          {log.method}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-8 italic">No cached attendance logs</p>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
