"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getClientUser } from '@/lib/auth/client-session';

export default function AttendanceIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    getClientUser().then(user => {
      if (user?.role === 'manager' || user?.role === 'admin') {
        router.replace('/m/attendance/active');
      } else {
        router.replace('/m/attendance/history');
      }
    });
  }, [router]);

  return null;
}
