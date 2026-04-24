"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

/*
 * MOBILE COMPONENT: Admin ID Scanner
 * Admin uses rear camera to scan member QR badges.
 * Flow: Auth Guard -> Session Picker -> Camera Scanner -> Result
 */

type ScanState = 'idle' | 'scanning' | 'processing' | 'success' | 'already_marked' | 'error'

interface Session {
  id: string
  label: string
  meal_type: string
  session_date: string
}

interface ScanResult {
  member: {
    full_name: string
    role: string
    phone: string | null
    is_active: boolean
    member_since: string
  }
  session: {
    label: string
    meal_type: string
    date: string
  }
  marked_at: string
}

export default function AdminScanMobilePage() {
  const { user, isLoading: authLoading, isAuthorized } = useAuthGuard({
    requiredRole: ['owner', 'admin', 'manager']
  })

  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  
  const [state, setState] = useState<ScanState>('idle')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  // Fetch active sessions
  useEffect(() => {
    if (!isAuthorized) return

    async function fetchSessions() {
      try {
        const supabase = createClient()
        const { data: { session: authSession } } = await supabase.auth.getSession()

        const res = await fetch('/api/attendance/sessions?status=active', {
          headers: {
            'Authorization': `Bearer ${authSession?.access_token}`
          }
        })
        const data = await res.json()
        setSessions(data.sessions || [])
      } catch (err) {
        console.error('[FETCH_SESSIONS_ERROR]', err)
      } finally {
        setSessionsLoading(false)
      }
    }

    fetchSessions()
  }, [isAuthorized])

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  const processToken = useCallback(async (token: string) => {
    if (!selectedSessionId) return
    stopCamera()
    setState('processing')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/attendance/admin-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_token: token,
          session_id: selectedSessionId
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to process scan')
        setState('error')
      } else {
        setResult(data)
        setState(data.already_marked ? 'already_marked' : 'success')
      }
    } catch (err) {
      setErrorMsg('Connection error. Please try again.')
      setState('error')
    }
  }, [selectedSessionId, stopCamera])

  const tick = useCallback(async () => {
    if (videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current
      const video = videoRef.current
      if (canvas && video) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          canvas.height = video.videoHeight
          canvas.width = video.videoWidth
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          
          const jsQR = (await import('jsqr')).default
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          })

          if (code) {
            processToken(code.data)
            return
          }
        }
      }
    }
    animFrameRef.current = requestAnimationFrame(tick)
  }, [processToken])

  const startScanning = async () => {
    setState('scanning')
    setResult(null)
    setErrorMsg(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Rear camera for mobile admin
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        animFrameRef.current = requestAnimationFrame(tick)
      }
    } catch (err) {
      console.error('[CAMERA_ERROR]', err)
      setErrorMsg('Could not access camera. Please check permissions.')
      setState('error')
    }
  }

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  if (authLoading || sessionsLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Verifying Admin Access</p>
      </div>
    )
  }

  if (!isAuthorized) return null

  // Session Picker State
  if (!selectedSessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col p-6">
        <header className="mb-8">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Scanner Setup</h1>
          <p className="text-sm text-gray-500 mt-1">Select an active session to begin</p>
        </header>

        <div className="space-y-4 flex-1">
          {sessions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Active Sessions</p>
              <p className="text-xs text-gray-500 mt-2">Active sessions must be created on the web dashboard first.</p>
            </div>
          ) : (
            sessions.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedSessionId(s.id)}
                className="w-full bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group active:scale-95 transition-all"
              >
                <div className="text-left">
                  <h3 className="font-black text-gray-900 uppercase tracking-tight">{s.label}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100 uppercase tracking-widest">
                      {s.meal_type}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {s.session_date}
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))
          )}
        </div>

        <Link 
          href="/m/home" 
          className="mt-8 text-center text-xs font-bold text-gray-400 uppercase tracking-widest"
        >
          Cancel and Return Home
        </Link>
      </div>
    )
  }

  // Scanning State
  if (state === 'idle' || state === 'scanning') {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <header className="p-6 flex items-center justify-between text-white bg-black/50 backdrop-blur-md fixed top-0 inset-x-0 z-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">ADMIN SCANNER</p>
            <h2 className="text-sm font-black truncate max-w-[200px] uppercase">
              {sessions.find(s => s.id === selectedSessionId)?.label}
            </h2>
          </div>
          <button 
            onClick={() => { stopCamera(); setSelectedSessionId(null); setState('idle'); }}
            className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 relative">
          {state === 'idle' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center space-y-6">
              <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m0 11v1m0-7v4m-9-4h.01M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest px-8">
                Point camera at member's phone to scan their badge
              </p>
              <button
                onClick={startScanning}
                className="px-12 py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all"
              >
                Start Camera
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} hidden />
              {/* Scan Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-64 h-64 border-2 border-white/50 rounded-3xl relative">
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl" />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl" />
                  {/* Scan line animation */}
                  <div className="absolute inset-x-2 top-0 h-0.5 bg-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-scan-line" />
                </div>
                <p className="mt-8 text-[10px] font-black uppercase tracking-[0.2em] text-white/70 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full">
                  Align QR Code within Frame
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  if (state === 'processing') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-white uppercase tracking-widest animate-pulse">Processing Badge...</p>
      </div>
    )
  }

  if ((state === 'success' || state === 'already_marked') && result) {
    const isAlreadyMarked = state === 'already_marked'
    return (
      <div className={`min-h-screen flex flex-col p-6 transition-colors duration-500 ${
        isAlreadyMarked ? 'bg-amber-500' : 'bg-green-500'
      }`}>
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl animate-in zoom-in-50 duration-500">
            {isAlreadyMarked ? (
              <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>

          <div className="space-y-2 text-white">
            <h2 className="text-4xl font-black tracking-tight">{result.member.full_name}</h2>
            <p className="text-lg font-bold opacity-90">
              {isAlreadyMarked ? 'Already Checked In' : 'Attendance Marked!'}
            </p>
          </div>

          <div className="w-full max-w-xs bg-black/10 backdrop-blur-md rounded-3xl p-6 text-white space-y-4 text-left border border-white/10">
            <div className="flex justify-between items-start">
               <div>
                 <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Member Info</p>
                 <p className="text-sm font-black mt-1 uppercase tracking-tight">{result.member.role}</p>
                 <p className="text-xs font-bold opacity-80">{result.member.phone || 'No Phone'}</p>
               </div>
               <div className="text-right">
                 <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Marked At</p>
                 <p className="text-sm font-black mt-1">{new Date(result.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
               </div>
            </div>
            <div className="pt-4 border-t border-white/10">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Session</p>
              <p className="text-xs font-bold">{result.session.label}</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => { setState('idle'); startScanning(); }}
          className="w-full py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all mb-4"
        >
          Scan Next Member
        </button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-red-600 flex flex-col p-6">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 text-white">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl animate-bounce">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="space-y-2 px-8">
            <h2 className="text-3xl font-black uppercase tracking-tight">Scan Failed</h2>
            <p className="text-lg font-bold opacity-90 leading-tight">{errorMsg}</p>
          </div>
        </div>
        <button
          onClick={() => { setState('idle'); startScanning(); }}
          className="w-full py-5 bg-white text-red-600 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all mb-4"
        >
          Try Again
        </button>
      </div>
    )
  }

  return null
}
