"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

/*
 * CLIENT COMPONENT: Admin Scanner (Mode B)
 * Admin's camera scans a MEMBER's static QR badge.
 */

interface AdminScannerProps {
  sessionId: string;
}

type ScanState =
  | 'idle'
  | 'scanning'
  | 'processing'
  | 'success'
  | 'already_marked'
  | 'error';

interface ScanResult {
  member: {
    full_name: string;
    role: string;
    phone: string | null;
    is_active: boolean;
    member_since: string;
  };
  session: {
    label: string;
    meal_type: string;
    date: string;
  };
  marked_at: string;
}

export default function AdminScanner({ sessionId }: AdminScannerProps) {
  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Process the scanned token
  const processToken = useCallback(async (token: string) => {
    stopCamera();
    setState('processing');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/attendance/admin-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_token: token,
          session_id: sessionId
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to process scan');
        setState('error');
      } else {
        setResult(data);
        setState(data.already_marked ? 'already_marked' : 'success');
      }
    } catch (err) {
      setErrorMsg('Connection error. Please try again.');
      setState('error');
    }
  }, [sessionId, stopCamera]);

  // QR Decoding Loop
  const tick = useCallback(async () => {
    if (videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Dynamic import jsQR to avoid SSR issues
          const jsQR = (await import('jsqr')).default;
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code) {
            processToken(code.data);
            return; // Stop the loop
          }
        }
      }
    }
    animFrameRef.current = requestAnimationFrame(tick);
  }, [processToken]);

  // Start camera
  const startScanning = async () => {
    setState('scanning');
    setResult(null);
    setErrorMsg(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' } // Front camera for admin-facing-member
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        animFrameRef.current = requestAnimationFrame(tick);
      }
    } catch (err) {
      console.error('[CAMERA_ERROR]', err);
      setErrorMsg('Could not access camera. Please check permissions.');
      setState('error');
    }
  };

  // Cleanup
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const reset = () => {
    setResult(null);
    setErrorMsg(null);
    startScanning();
  };

  if (state === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 w-full text-center space-y-4">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
          <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m0 11v1m0-7v4m-9-4h.01M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Member ID Scanner</h3>
          <p className="text-sm text-gray-500 mt-1">Scan a member's QR badge to mark attendance</p>
        </div>
        <button
          onClick={startScanning}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 transition-colors"
        >
          Start Scanner
        </button>
      </div>
    );
  }

  if (state === 'scanning') {
    return (
      <div className="flex flex-col items-center w-full space-y-6">
        <div className="relative w-full max-w-sm aspect-square bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-indigo-500/30">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} hidden />
          <div className="absolute inset-0 border-2 border-white/20 pointer-events-none flex items-center justify-center">
             <div className="w-64 h-64 border-2 border-indigo-400 rounded-2xl opacity-50" />
          </div>
          <div className="absolute bottom-4 inset-x-0 text-center">
            <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-full">
              Point at Member's QR
            </span>
          </div>
        </div>
        <button
          onClick={() => { stopCamera(); setState('idle'); }}
          className="text-sm font-bold text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (state === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center p-12 w-full text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest animate-pulse">Looking up member...</p>
      </div>
    );
  }

  if ((state === 'success' || state === 'already_marked') && result) {
    const isAlreadyMarked = state === 'already_marked';
    return (
      <div className="w-full space-y-6">
        <div className={`w-full bg-white rounded-3xl border-2 p-8 shadow-sm transition-all animate-in zoom-in-95 duration-300 ${
          isAlreadyMarked ? 'border-amber-100 shadow-amber-100/20' : 'border-green-100 shadow-green-100/20'
        }`}>
          <div className="flex items-center justify-between mb-8">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
              isAlreadyMarked ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
            }`}>
              {isAlreadyMarked ? (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  <span>Already Marked</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  <span>Attendance Marked</span>
                </>
              )}
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {new Date(result.marked_at).toLocaleTimeString()}
            </span>
          </div>

          <div className="flex items-start space-x-6 mb-8">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg ring-4 ring-white ${
              isAlreadyMarked ? 'bg-amber-500' : 'bg-green-500'
            }`}>
              {result.member.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="flex-1 space-y-1">
              <h2 className="text-2xl font-black text-gray-900 leading-tight">{result.member.full_name}</h2>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded-md border border-gray-200">
                  {result.member.role}
                </span>
                {result.member.phone && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded-md border border-gray-200">
                    {result.member.phone}
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold text-gray-400 pt-2 uppercase tracking-widest">
                Member since {new Date(result.member.member_since).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
              <span>Session Info</span>
            </div>
            <p className="text-sm font-bold text-gray-700">{result.session.label}</p>
            <div className="flex items-center mt-1 space-x-2">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest px-2 py-0.5 bg-indigo-50 rounded border border-indigo-100">
                {result.session.meal_type}
              </span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {result.session.date}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={reset}
          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95"
        >
          Scan Next Member
        </button>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="w-full space-y-6">
        <div className="w-full bg-red-50 rounded-3xl border-2 border-red-100 p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-red-900 mb-2 uppercase tracking-tight">Scan Failed</h3>
          <p className="text-sm font-bold text-red-700/70 mb-8">{errorMsg}</p>
          <button
            onClick={reset}
            className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
        <button
          onClick={() => setState('idle')}
          className="w-full text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return null;
}
