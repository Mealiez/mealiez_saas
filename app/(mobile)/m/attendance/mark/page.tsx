"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { 
  CheckCircle2, 
  XCircle, 
  Info, 
  Loader2, 
  ArrowLeft,
  MapPin,
  Clock,
  Utensils
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/*
 * MOBILE COMPONENT: QR Result / Mark Attendance Landing
 * This page opens directly when a user scans an attendance QR with their camera.
 * It handles both Quick (Session-based) and Automated (Fixed-token) modes.
 */

type MarkState = 'loading' | 'success' | 'already_marked' | 'error';

interface MarkResult {
  message: string;
  session?: { label: string; meal_type: string };
  record?: { meal_type: string; branch_name: string; marked_at: string; source: string };
  error?: string;
  code?: string;
}

function AttendanceResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading, isAuthorized } = useAuthGuard();

  const [state, setState] = useState<MarkState>('loading');
  const [result, setResult] = useState<MarkResult | null>(null);

  const token = searchParams.get('token');
  const type = searchParams.get('type') || 'quick'; // 'quick' or 'automated'

  useEffect(() => {
    if (!isAuthorized || !token) return;

    async function performMark() {
      const endpoint = type === 'automated' 
        ? '/api/attendance/automated/mark' 
        : '/api/attendance/mark';
      
      const payload = type === 'automated'
        ? { session_token: token, type: 'automated' }
        : { session_token: token };

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
          setResult(data);
          setState(data.already_marked ? 'already_marked' : 'success');
        } else {
          setResult(data);
          setState('error');
        }
      } catch (err) {
        setResult({ error: 'Network error. Please check your connection.' });
        setState('error');
      }
    }

    performMark();
  }, [isAuthorized, token, type]);

  if (isAuthLoading || state === 'loading') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-100 rounded-full animate-pulse" />
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin absolute inset-0 m-auto" />
        </div>
        <h2 className="mt-6 text-lg font-black text-gray-900 uppercase tracking-tight">Verifying Check-in...</h2>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-2">Database Authorization</p>
      </div>
    );
  }

  if (!isAuthorized) return null;

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-black text-gray-900">Invalid QR Link</h2>
        <p className="text-gray-500 mt-2">The scanned QR code does not contain a valid attendance token.</p>
        <Button className="mt-8 rounded-2xl w-full h-14" onClick={() => router.replace('/m/home')}>
           Go Home
        </Button>
      </div>
    );
  }

  const mealType = result?.session?.meal_type || result?.record?.meal_type || 'Unknown';
  const branchName = result?.record?.branch_name || user?.branch_id || 'Assigned Branch';
  const displayLabel = result?.session?.label || `${mealType} - ${new Date().toLocaleDateString('en-IN')}`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-6 items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        
        {/* SUCCESS CARD */}
        {(state === 'success' || state === 'already_marked') && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-100 border border-gray-100 text-center space-y-8 animate-in zoom-in duration-300">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ring-8 ${
              state === 'success' ? 'bg-green-100 ring-green-50' : 'bg-amber-100 ring-amber-50'
            }`}>
              {state === 'success' ? (
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              ) : (
                <Info className="w-12 h-12 text-amber-600" />
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none">
                {state === 'success' ? 'Marked!' : 'Duplicate'}
              </h2>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                Attendance recorded successfully
              </p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-6 space-y-4 border border-gray-100">
              <div className="flex items-center gap-4 text-left">
                <div className="p-2 bg-blue-100 rounded-xl text-blue-600"><Utensils size={18} /></div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Meal Type</p>
                  <p className="font-bold text-gray-900 capitalize">{mealType}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-left">
                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><MapPin size={18} /></div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Branch</p>
                  <p className="font-bold text-gray-900">{branchName}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-left">
                <div className="p-2 bg-amber-100 rounded-xl text-amber-600"><Clock size={18} /></div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Timestamp</p>
                  <p className="font-bold text-gray-900">
                    {new Date(result?.record?.marked_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>

            {result?.record?.source === 'automated' && (
              <span className="inline-block px-3 py-1 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full">
                Automated Mode
              </span>
            )}
            {type === 'quick' && (
               <span className="inline-block px-3 py-1 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full">
                Quick Mode
              </span>
            )}

            <Button className="w-full h-14 rounded-2xl text-lg font-bold bg-gray-900 hover:bg-black" onClick={() => router.replace('/m/home')}>
              Done
            </Button>
          </div>
        )}

        {/* ERROR CARD */}
        {state === 'error' && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-red-100 border border-gray-100 text-center space-y-8 animate-in zoom-in duration-300">
            <div className="w-24 h-24 rounded-full bg-red-100 ring-8 ring-red-50 flex items-center justify-center mx-auto">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none uppercase">Failed</h2>
              <p className="text-red-500 font-bold uppercase tracking-widest text-[10px]">
                {result?.code?.replace(/_/g, ' ') || 'Validation Error'}
              </p>
            </div>

            <div className="bg-red-50 rounded-3xl p-6 border border-red-100">
              <p className="text-red-700 font-medium text-sm leading-relaxed">
                {result?.error || 'Something went wrong during attendance verification.'}
              </p>
            </div>

            <div className="pt-4 flex flex-col gap-3">
               <Button className="w-full h-14 rounded-2xl text-lg font-bold bg-gray-900 hover:bg-black" onClick={() => router.replace('/m/home')}>
                  Go Home
               </Button>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Try scanning the QR code again
               </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function AttendanceResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    }>
      <AttendanceResultContent />
    </Suspense>
  );
}
