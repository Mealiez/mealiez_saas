"use client";

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';

/*
 * CLIENT COMPONENT: My QR Badge Modal (Web)
 * Shows the member's permanent identity QR code.
 */

interface MyQR {
  token: string;
  issued_at: string;
  full_name: string;
}

export default function MyQRModal({ trigger }: { trigger?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [qr, setQr] = useState<MyQR | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQR = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/member-qr');
      if (!res.ok) throw new Error('Failed to fetch QR');
      const data = await res.json();
      setQr(data);
      setIsOpen(true);
    } catch (err) {
      console.error('[MY_QR_FETCH_ERROR]', err);
      setError('Failed to load your identity badge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {trigger ? (
        <div onClick={fetchQR} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button 
          variant="outline" 
          onClick={fetchQR}
          disabled={loading}
          className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
        >
          <span>🪪</span> {loading ? 'Loading...' : 'My QR Badge'}
        </Button>
      )}

      {isOpen && qr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center animate-in fade-in zoom-in duration-200 relative">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-black text-gray-900">Your Identity Badge</h2>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Show this to the admin scanner</p>
            </div>

            <div className="p-4 bg-white rounded-2xl shadow-inner border border-gray-100 mb-6 inline-block">
              <QRCodeSVG 
                value={qr.token}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="space-y-1 mb-6">
              <h3 className="text-lg font-bold text-gray-900">{qr.full_name}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Issued on {new Date(qr.issued_at).toLocaleDateString()}
              </p>
            </div>

            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex items-start gap-3 text-left">
              <span className="text-amber-600 text-lg">⚠️</span>
              <p className="text-[10px] text-amber-700 font-bold leading-tight">
                Private Token. Do not share or screenshot this QR code.
              </p>
            </div>
            
            <Button 
              onClick={() => setIsOpen(false)}
              className="w-full mt-8 bg-gray-900 hover:bg-black text-white rounded-xl"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-bold animate-in slide-in-from-bottom-2">
          {error}
        </div>
      )}
    </>
  );
}
