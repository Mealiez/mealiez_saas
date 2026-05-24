"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if running in Capacitor/Native context
    const isNative = typeof window !== 'undefined' && 
                    (window.hasOwnProperty('Capacitor') || 
                     navigator.userAgent.includes('Capacitor'));

    if (isNative) {
      router.replace('/m/home');
    } else {
      router.replace('/dashboard');
    }
  }, [router]);

  return null;
}
