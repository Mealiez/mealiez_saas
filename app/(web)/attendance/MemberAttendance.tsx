'use client';

import { useState } from 'react';
import MyQRModal from '@/components/web/MyQRModal';
import MemberScannerModal from '@/components/web/MemberScannerModal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { QrCode, Camera, Info, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
 * CLIENT COMPONENT: Member Attendance Dashboard
 * Members see their personal QR and a scanner for session check-ins.
 */

interface MemberAttendanceProps {
  user: {
    id: string;
    full_name: string;
    branch_id?: string | null;
  };
}

export default function MemberAttendance({ user }: MemberAttendanceProps) {
  const [activeTab, setActiveTab] = useState<'badge' | 'scan'>('badge');

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col items-center text-center space-y-2">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">My Attendance</h1>
        <p className="text-gray-500 font-medium max-w-md">
          Use your badge at the counter or scan the session QR code to mark your presence.
        </p>
      </div>

      {/* Tab Selector */}
      <div className="flex justify-center">
        <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center gap-1 shadow-inner">
           <button 
             onClick={() => setActiveTab('badge')}
             className={cn(
               "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
               activeTab === 'badge' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
             )}
           >
             My Badge
           </button>
           <button 
             onClick={() => setActiveTab('scan')}
             className={cn(
               "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
               activeTab === 'scan' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
             )}
           >
             Scan Session
           </button>
        </div>
      </div>

      <div className="flex justify-center">
        {activeTab === 'badge' ? (
          <Card className="w-full max-w-md rounded-[2.5rem] border-2 shadow-xl overflow-hidden animate-in zoom-in duration-300">
            <CardHeader className="bg-indigo-600 text-white p-8 text-center">
               <CardTitle className="text-2xl font-black uppercase tracking-tight">Personal Badge</CardTitle>
               <CardDescription className="text-indigo-100 font-medium italic">Identification for {user.full_name}</CardDescription>
            </CardHeader>
            <CardContent className="p-10 flex flex-col items-center space-y-8">
               <div className="p-4 bg-white rounded-3xl shadow-inner border-4 border-indigo-50">
                 <MyQRModal userId={user.id} userName={user.full_name} isInline />
               </div>

               <div className="w-full space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                     <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><User size={20} /></div>
                     <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Name</p>
                        <p className="text-sm font-bold text-gray-900 truncate">{user.full_name}</p>
                     </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                     <div className="p-2 bg-blue-100 rounded-xl text-blue-600"><MapPin size={20} /></div>
                     <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Assigned Branch</p>
                        <p className="text-sm font-bold text-gray-900">Platform/Global</p>
                     </div>
                  </div>
               </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-md rounded-[2.5rem] border-2 shadow-xl overflow-hidden animate-in zoom-in duration-300">
            <CardHeader className="bg-blue-600 text-white p-8 text-center">
               <CardTitle className="text-2xl font-black uppercase tracking-tight">QR Scanner</CardTitle>
               <CardDescription className="text-blue-100 font-medium italic">Mark attendance via camera</CardDescription>
            </CardHeader>
            <CardContent className="p-10 flex flex-col items-center space-y-8">
               <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 ring-8 ring-blue-50/50">
                  <Camera size={40} />
               </div>
               
               <div className="text-center space-y-4">
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">
                    Point your camera at the session QR code displayed on the manager's screen.
                  </p>
                  <MemberScannerModal isInline />
               </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 flex items-start gap-4">
        <div className="bg-amber-100 p-2 rounded-lg text-amber-600"><Info size={20} /></div>
        <div>
          <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Pro Tip</h4>
          <p className="text-xs text-amber-700/80 font-medium mt-1 leading-relaxed">
            {activeTab === 'badge' 
              ? "Keep this badge ready when approaching the counter. It works even if the session QR is not visible."
              : "Scanning the session QR is the fastest way to mark attendance during peak hours."}
          </p>
        </div>
      </div>
    </div>
  );
}
