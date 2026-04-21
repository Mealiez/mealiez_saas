"use client";

import { useState, useEffect } from 'react';

/*
 * CLIENT COMPONENT: Attendance Log
 * Displays a real-time list of members who marked attendance.
 * Polls for updates every 10 seconds if session is active.
 */

export type AttendanceSummary = {
  session_id: string;
  session_label: string;
  session_date: string;
  meal_type: string;
  total_count: number;
  records: Array<{
    record_id: string;
    user_id: string;
    full_name: string;
    marked_at: string;
    method: 'qr' | 'manual';
  }>;
};

interface AttendanceLogProps {
  sessionId: string;
  initialData: AttendanceSummary | null;
  isActive: boolean;
}

export default function AttendanceLog({
  sessionId,
  initialData,
  isActive,
}: AttendanceLogProps) {
  const [data, setData] = useState<AttendanceSummary | null>(initialData);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Auto-refresh logic (polling)
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/attendance/sessions/${sessionId}`);
        const json = await res.json();
        if (json.session) {
          setData(json.session);
          setLastUpdated(new Date());
        }
      } catch (err) {
        console.error('[ATTENDANCE_POLL_ERROR]', err);
      }
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [isActive, sessionId]);

  if (!data) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Live Attendance</h2>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10">
          {data.total_count} Present
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
        {data.records.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12 text-center space-y-2">
            <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="font-medium">No one has checked in yet</p>
          </div>
        ) : (
          data.records.map((record) => (
            <div
              key={record.record_id}
              className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all duration-200 animate-in slide-in-from-right-2"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white">
                  {record.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{record.full_name}</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight">
                    {new Date(record.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                record.method === 'qr' 
                  ? 'bg-green-50 text-green-700 border-green-100' 
                  : 'bg-orange-50 text-orange-700 border-orange-100'
              }`}>
                {record.method}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100 text-[10px] font-bold text-gray-400 flex justify-between items-center uppercase tracking-widest">
        <span>Last update: {lastUpdated.toLocaleTimeString()}</span>
        {isActive && (
          <span className="flex items-center text-green-500">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse" />
            Live Polling
          </span>
        )}
      </div>
    </div>
  );
}
