"use client"

import { useState, useEffect } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { createClient } from '@/lib/supabase/client'
import { QRCodeSVG } from 'qrcode.react'

/*
 * CLIENT COMPONENT: My Attendance QR Badge
 * Member opens this screen to show their permanent
 * QR code to the admin scanner (Mode B).
 */

type LoadState = 'loading' | 'ready' | 'error'

interface MyQR {
  token: string
  issued_at: string
  full_name: string
}

export default function MyQRPage() {
  const { user, isLoading: authLoading, isAuthorized } = useAuthGuard()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [qr, setQr] = useState<MyQR | null>(null)

  useEffect(() => {
    if (!isAuthorized) return

    async function fetchQR() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        const res = await fetch('/api/member-qr', {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        })

        if (!res.ok) throw new Error('Failed to fetch QR')

        const data = await res.json()
        setQr(data)
        setLoadState('ready')
      } catch (err) {
        console.error('[MY_QR_FETCH_ERROR]', err)
        setLoadState('error')
      }
    }

    fetchQR()
  }, [isAuthorized])

  // Screen Wake Lock implementation
  useEffect(() => {
    let wakeLock: any = null
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen')
        }
      } catch (e) {
        // WakeLock not supported
        console.warn('Wake Lock not supported on this device')
      }
    }
    
    requestWakeLock()

    // Re-request if visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      wakeLock?.release()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  if (authLoading || loadState === 'loading') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Badge</p>
      </div>
    )
  }

  if (!isAuthorized || loadState === 'error' || !qr) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900">Failed to load badge</h3>
        <p className="text-sm text-gray-500 mt-2 mb-6">There was an issue retrieving your identity token.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-6 pt-12">
      {/* Brand */}
      <div className="mb-12 text-center">
        <h1 className="text-2xl font-black text-indigo-600 tracking-tight">Mealiez</h1>
        <div className="w-12 h-1 bg-indigo-600 mx-auto mt-1 rounded-full" />
      </div>

      {/* QR Card */}
      <div className="w-full max-w-sm bg-white rounded-[2rem] border-2 border-gray-100 shadow-2xl p-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="p-4 bg-white rounded-2xl shadow-inner border border-gray-50 mb-8">
          <QRCodeSVG 
            value={qr.token}
            size={250}
            level="H"
            includeMargin={false}
          />
        </div>

        <div className="space-y-1 mb-8">
          <h2 className="text-2xl font-black text-gray-900 leading-tight">{qr.full_name}</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">
            My Attendance Badge
          </p>
        </div>

        <div className="w-full pt-8 border-t border-gray-50 flex flex-col items-center space-y-4">
          <div className="flex flex-col items-center space-y-1">
             <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Issued On</span>
             <span className="text-xs font-bold text-gray-600">
               {new Date(qr.issued_at).toLocaleDateString(undefined, { 
                 month: 'long', 
                 day: 'numeric', 
                 year: 'numeric' 
               })}
             </span>
          </div>
          
          <div className="px-4 py-2 bg-amber-50 rounded-xl border border-amber-100 flex items-center space-x-2">
            <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-[10px] font-bold text-amber-700 leading-tight text-left">
              Do not share this QR code with others.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Helper */}
      <p className="mt-12 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center px-12 leading-relaxed">
        Present this screen to the attendance admin to check in.
        <br />
        <span className="opacity-60 font-normal normal-case italic mt-1 block">Screen will stay awake while open.</span>
      </p>
    </div>
  )
}
