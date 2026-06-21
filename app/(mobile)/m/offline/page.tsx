'use client'

import { WifiOff, RefreshCcw, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function MobileOfflinePage() {
  const [isChecking, setIsChecking] = useState(false)
  const router = useRouter()

  const handleRetry = () => {
    setIsChecking(true)
    if (navigator.onLine) {
      router.push('/m/home')
    } else {
      setTimeout(() => setIsChecking(false), 1000)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <div className="bg-red-50 p-6 rounded-full mb-6">
        <WifiOff className="w-12 h-12 text-red-500" />
      </div>
      <h1 className="text-xl font-black uppercase tracking-tight text-gray-900 mb-2">Connection Lost</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 text-left">
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
        className="w-full max-w-[200px] py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
      >
        <RefreshCcw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
        {isChecking ? 'Checking' : 'Try Again'}
      </button>
    </div>
  )
}
