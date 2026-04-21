"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { 
  CheckCircle2, 
  XCircle, 
  Info, 
  Loader2, 
  Camera, 
  ArrowLeft 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/*
 * MOBILE COMPONENT: QR Attendance Scanner
 * Runs in Capacitor (Android) or Browser.
 * Uses getUserMedia + jsQR for decoding.
 */

type ScanState = 
  | 'idle' 
  | 'scanning' 
  | 'processing' 
  | 'success' 
  | 'error' 
  | 'already_marked';

type ScanResult = {
  success: boolean;
  already_marked?: boolean;
  message: string;
  session?: { label: string; meal_type: string };
};

export default function ScanAttendancePage() {
  const router = useRouter();
  const { user, isLoading, isAuthorized } = useAuthGuard();

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stop camera tracks and clear interval
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Process token from QR
  async function processToken(token: string) {
    setScanState('processing');
    stopCamera();

    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: token })
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
        setScanState(data.already_marked ? 'already_marked' : 'success');
      } else {
        setErrorMessage(data.error ?? 'Failed to mark attendance.');
        setScanState('error');
      }
    } catch (err) {
      setErrorMessage('Network error. Please try again.');
      setScanState('error');
    }
  }

  // Scan loop
  const startScanning = useCallback(() => {
    scanIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Dynamic import to avoid SSR issues
      const jsQR = (await import('jsqr')).default;
      const code = jsQR(
        imageData.data,
        imageData.width,
        imageData.height,
        { inversionAttempts: "dontInvert" }
      );

      if (code?.data) {
        processToken(code.data);
      }
    }, 300);
  }, []);

  // Initialize camera
  async function startCamera() {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for play to confirm stream is active
        await videoRef.current.play();
      }
      setScanState('scanning');
      startScanning();
    } catch (err) {
      console.error('[CAMERA_ERROR]', err);
      setErrorMessage(
        'Camera access denied. Please allow camera permission and retry.'
      );
      setScanState('error');
    }
  }

  // Reset to idle
  function reset() {
    stopCamera();
    setResult(null);
    setErrorMessage(null);
    setScanState('idle');
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading Auth</p>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 flex items-center space-x-4 sticky top-0 z-50">
        <button onClick={() => router.replace('/m/home')} className="p-1">
          <ArrowLeft className="w-6 h-6 text-gray-900" />
        </button>
        <h1 className="text-xl font-black text-gray-900">Attendance Scan</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        
        {/* IDLE STATE */}
        {scanState === 'idle' && (
          <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-gray-900/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto ring-4 ring-gray-800">
              <Camera className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Scan QR Code</h2>
              <p className="text-gray-400 font-medium">Point your camera at the attendance QR code displayed by the admin.</p>
            </div>
            <Button size="lg" className="w-full bg-white text-black hover:bg-gray-200" onClick={startCamera}>
              Start Scanning
            </Button>
          </div>
        )}

        {/* SCANNING STATE */}
        {scanState === 'scanning' && (
          <div className="fixed inset-0 z-10 flex flex-col items-center justify-center bg-black overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} hidden />
            
            {/* Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {/* Scan box simulation */}
              <div className="w-64 h-64 border-2 border-white/50 rounded-3xl relative">
                <div className="absolute inset-0 border-4 border-white rounded-3xl animate-pulse" />
                {/* Corner highlights */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-3xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-3xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-3xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-3xl" />
              </div>
              
              <div className="mt-8 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full">
                <p className="text-white text-sm font-bold uppercase tracking-widest animate-pulse">
                  Detecting QR Code...
                </p>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="absolute bottom-10 left-6 right-6 border-white/20 bg-white/10 text-white backdrop-blur-xl"
              onClick={reset}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* PROCESSING STATE */}
        {scanState === 'processing' && (
          <div className="text-center animate-in fade-in">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white">Marking Attendance...</h2>
          </div>
        )}

        {/* SUCCESS STATE */}
        {scanState === 'success' && (
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm text-center space-y-6 animate-in zoom-in">
            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900 leading-tight">Attendance Marked!</h2>
              {result?.session && (
                <div className="space-y-1">
                  <p className="text-gray-500 font-bold">{result.session.label}</p>
                  <span className="inline-block px-2 py-0.5 bg-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-500 rounded-md">
                    {result.session.meal_type}
                  </span>
                </div>
              )}
            </div>
            <Button className="w-full h-14 rounded-2xl text-lg font-bold" onClick={reset}>
              Scan Another
            </Button>
          </div>
        )}

        {/* ALREADY MARKED STATE */}
        {scanState === 'already_marked' && (
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm text-center space-y-6 animate-in zoom-in">
            <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <Info className="w-10 h-10 text-blue-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900 leading-tight">Already Marked</h2>
              <p className="text-gray-500 font-medium">{result?.message}</p>
            </div>
            <Button className="w-full h-14 rounded-2xl text-lg font-bold" onClick={() => router.replace('/m/home')}>
              Back to Home
            </Button>
          </div>
        )}

        {/* ERROR STATE */}
        {scanState === 'error' && (
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm text-center space-y-6 animate-in zoom-in">
            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900 leading-tight">Scan Failed</h2>
              <p className="text-red-500 font-medium">{errorMessage}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-14 rounded-2xl" onClick={() => router.replace('/m/home')}>
                Back
              </Button>
              <Button className="h-14 rounded-2xl font-bold bg-red-600 hover:bg-red-700" onClick={reset}>
                Try Again
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
