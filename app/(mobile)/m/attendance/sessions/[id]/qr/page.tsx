"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { ChevronLeft, Loader2, RefreshCcw, Maximize, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function FullScreenQRPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [sessionLabel, setSessionLabel] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchToken = async () => {
    try {
      const res = await fetch(`/api/attendance/sessions/${sessionId}`);
      const data = await res.json();
      if (data.qr_token) {
        setQrToken(data.qr_token);
        setSessionLabel(data.session?.label || 'Attendance Session');
      } else {
        toast.error('Session is not active or token unavailable');
        router.back();
      }
    } catch (err) {
      toast.error('Failed to fetch QR');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
    // Refresh token every 5 mins if needed
    const interval = setInterval(fetchToken, 300000);
    return () => clearInterval(interval);
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 text-center px-10 leading-relaxed">
          Generating Dynamic Session Token...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Abstract Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-blue-50 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-indigo-50 rounded-full blur-3xl opacity-50" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10">
         <button onClick={() => router.back()} className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900 shadow-sm active:scale-90 transition-all">
            <ChevronLeft size={24} />
         </button>
         <button onClick={fetchToken} className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm active:rotate-180 transition-all duration-500">
            <RefreshCcw size={20} />
         </button>
      </div>

      {/* Main QR Frame */}
      <div className="w-full max-w-sm space-y-12 text-center relative z-10">
         <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100 mb-2">
               <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
               <span className="text-[8px] font-black uppercase tracking-[0.2em] text-green-600">Session Live</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight leading-tight">
               {sessionLabel}
            </h1>
         </div>

         <div className="relative group">
            {/* Corner Accents */}
            <div className="absolute -top-4 -left-4 w-12 h-12 border-t-4 border-l-4 border-blue-600 rounded-tl-3xl opacity-20 group-hover:opacity-100 transition-opacity" />
            <div className="absolute -top-4 -right-4 w-12 h-12 border-t-4 border-r-4 border-blue-600 rounded-tr-3xl opacity-20 group-hover:opacity-100 transition-opacity" />
            <div className="absolute -bottom-4 -left-4 w-12 h-12 border-b-4 border-l-4 border-blue-600 rounded-bl-3xl opacity-20 group-hover:opacity-100 transition-opacity" />
            <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-4 border-r-4 border-blue-600 rounded-br-3xl opacity-20 group-hover:opacity-100 transition-opacity" />

            <div className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-blue-900/10 border border-gray-50 flex flex-col items-center justify-center aspect-square">
               {qrToken ? (
                  <QRCodeSVG 
                    value={qrToken}
                    size={240}
                    level="H"
                    includeMargin={false}
                  />
               ) : (
                  <p className="text-red-500 font-bold">QR Unavailable</p>
               )}
            </div>
         </div>

         <div className="space-y-6">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-tight leading-relaxed px-4">
               Point members' scanner here to mark their presence instantly.
            </p>

            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col items-center gap-2">
                  <Smartphone size={20} className="text-blue-600" />
                  <span className="text-[8px] font-black uppercase text-gray-400">Mobile Ready</span>
               </div>
               <div className="p-4 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col items-center gap-2">
                  <Maximize size={20} className="text-indigo-600" />
                  <span className="text-[8px] font-black uppercase text-gray-400">Auto Scanned</span>
               </div>
            </div>
         </div>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-10 text-center w-full px-10">
         <p className="text-[7px] font-black uppercase tracking-[0.3em] text-gray-300">Mealiez Attendance Security Protocol v2.1</p>
      </div>
    </div>
  );
}
