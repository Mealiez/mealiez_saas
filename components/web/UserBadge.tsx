"use client";

import { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Printer, ShieldCheck } from 'lucide-react';
import html2canvas from 'html2canvas';

interface UserBadgeProps {
  user: {
    id: string;
    full_name: string;
    role: string;
    created_at: string;
    avatar_url?: string | null;
    tenants?: { name: string } | null;
    branches?: { name: string } | null;
  };
}

export default function UserBadge({ user }: UserBadgeProps) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await fetch(`/api/member-qr?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setQrToken(data.token);
        }
      } catch (err) {
        console.error('Failed to fetch QR token', err);
      }
    };
    fetchToken();
  }, [user.id]);

  const downloadBadge = async () => {
    if (!badgeRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(badgeRef.current, {
        scale: 3, // High quality
        backgroundColor: null,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `Badge-${user.full_name.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Identity Badge</h3>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={downloadBadge}
          disabled={isGenerating || !qrToken}
          className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          {isGenerating ? 'Generating...' : <><Download size={14} /> Download</>}
        </Button>
      </div>

      <div className="flex justify-center p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
        {/* ACTUAL BADGE START */}
        <div 
          ref={badgeRef}
          className="w-[300px] h-[450px] bg-white rounded-[24px] shadow-xl overflow-hidden flex flex-col border border-gray-100 relative"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {/* Top Header Pattern */}
          <div className="h-24 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 flex flex-col justify-end">
            <h4 className="text-white text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Official Member Card</h4>
            <p className="text-white text-lg font-black tracking-tighter uppercase">{user.tenants?.name || 'Mealiez'}</p>
          </div>

          {/* User Info Section */}
          <div className="flex-1 flex flex-col items-center pt-8 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black text-2xl border-2 border-white shadow-md mb-4 uppercase overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
              ) : (
                user.full_name.charAt(0)
              )}
            </div>
            
            <h2 className="text-xl font-black text-gray-900 leading-tight uppercase tracking-tight mb-1">{user.full_name}</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">{user.role}</p>

            {/* QR Code */}
            <div className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
              {qrToken ? (
                <QRCodeSVG 
                  value={qrToken}
                  size={140}
                  level="H"
                  includeMargin={false}
                />
              ) : (
                <div className="w-[140px] h-[140px] bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-[10px] font-bold text-gray-400">
                  GENERATING QR...
                </div>
              )}
            </div>

            {/* Details Grid */}
            <div className="w-full grid grid-cols-2 gap-y-4 border-t border-gray-50 pt-6">
              <div className="text-left">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Branch</p>
                <p className="text-[10px] font-black text-gray-900 uppercase truncate">{user.branches?.name || 'MAIN'}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Joined</p>
                <p className="text-[10px] font-black text-gray-900 uppercase">{new Date(user.created_at).toLocaleDateString()}</p>
              </div>
              <div className="col-span-2 text-center pt-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                   <ShieldCheck size={10} className="text-green-600" />
                   <span className="text-[8px] font-black text-green-700 uppercase tracking-widest">Verified Identity</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="bg-gray-50 px-6 py-3 flex justify-between items-center border-t border-gray-100">
            <span className="text-[8px] font-mono text-gray-400 truncate w-32">ID: {user.id.split('-')[0]}...</span>
            <div className="flex gap-0.5">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
               <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
            </div>
          </div>
        </div>
        {/* ACTUAL BADGE END */}
      </div>
      <p className="text-[10px] text-gray-400 text-center font-medium leading-relaxed italic">
        * Admin can download this badge as a high-resolution PNG for printing and physical distribution.
      </p>
    </div>
  );
}
