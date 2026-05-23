"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import jsQR from 'jsqr';

/*
 * CLIENT COMPONENT: Member Scanner Modal (Web)
 * Allows a member to scan the session QR code using their webcam.
 */

interface MemberScannerModalProps {
  onSuccess?: () => void;
  isInline?: boolean;
}

export default function MemberScannerModal({ onSuccess, isInline }: MemberScannerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(isInline || false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setIsScanning(false);
  }, []);

  const processToken = useCallback(async (token: string) => {
    stopCamera();
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to mark attendance');
      }

      setResult({ success: true, message: data.message || 'Attendance marked successfully!' });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('[SCAN_PROCESS_ERROR]', err);
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [stopCamera, onSuccess]);

  const tick = useCallback(() => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });

      if (context) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          processToken(code.data);
          return; // Stop ticking
        }
      }
    }
    animFrameRef.current = requestAnimationFrame(tick);
  }, [processToken]);

  const startCamera = useCallback(async () => {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsScanning(true);
      animFrameRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.error('[CAMERA_ERROR]', err);
      setError('Camera access denied. Please allow permissions.');
    }
  }, [tick]);

  useEffect(() => {
    if (isOpen || isInline) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, isInline, startCamera, stopCamera]);

  if (isInline) {
    return (
      <div className="w-full space-y-6">
        {isScanning && (
          <div className="relative aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl ring-4 ring-blue-50/50 max-w-sm mx-auto">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 border-2 border-white/20 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-blue-400 rounded-2xl opacity-50 relative">
                 <div className="absolute inset-x-2 top-0 h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan-line" />
              </div>
            </div>
            <div className="absolute bottom-4 inset-x-0 text-center">
              <span className="px-4 py-1.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full border border-white/10">
                Align QR Code inside frame
              </span>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Processing Check-in...</p>
          </div>
        )}

        {result && (
          <div className="text-center py-8 space-y-6 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Check-in Success</h3>
              <p className="text-sm font-medium text-gray-500">{result.message}</p>
            </div>
            <Button 
              onClick={() => { setResult(null); startCamera(); }}
              className="w-full bg-gray-900 hover:bg-black text-white rounded-2xl h-14 font-black uppercase tracking-widest"
            >
              Scan Again
            </Button>
          </div>
        )}

        {error && (
          <div className="text-center py-8 space-y-6 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-red-900 uppercase">Scan Error</h3>
              <p className="text-sm font-bold text-red-700/70">{error}</p>
            </div>
            <Button 
              onClick={startCamera}
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-2xl h-14 font-black uppercase tracking-widest"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
      >
        <span>📷</span> Scan QR
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Scan Attendance QR</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-8">
              {isScanning && (
                <div className="relative aspect-square bg-black rounded-2xl overflow-hidden shadow-inner ring-4 ring-gray-100">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 border-2 border-white/20 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-indigo-400 rounded-2xl opacity-50 relative">
                       <div className="absolute inset-x-2 top-0 h-0.5 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-scan-line" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 inset-x-0 text-center">
                    <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                      Point at Session QR
                    </span>
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest animate-pulse">Verifying Attendance...</p>
                </div>
              )}

              {result && (
                <div className="text-center py-8 space-y-6">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-gray-900">Success!</h3>
                    <p className="text-sm font-medium text-gray-500">{result.message}</p>
                  </div>
                  <Button 
                    onClick={() => setIsOpen(false)}
                    className="w-full bg-gray-900 hover:bg-black text-white rounded-xl py-6 text-sm font-black uppercase tracking-widest"
                  >
                    Done
                  </Button>
                </div>
              )}

              {error && (
                <div className="text-center py-8 space-y-6">
                  <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-red-900 uppercase">Verification Failed</h3>
                    <p className="text-sm font-bold text-red-700/70">{error}</p>
                  </div>
                  <Button 
                    onClick={startCamera}
                    className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-6 text-sm font-black uppercase tracking-widest"
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
