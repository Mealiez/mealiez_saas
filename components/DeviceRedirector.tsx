"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getDashboardPath } from '@/lib/utils';

export default function DeviceRedirector() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkDevice = () => {
      if (typeof window === 'undefined') return;

      const isMobilePath = pathname?.startsWith('/m');
      const isAuthPath = pathname?.includes('/login') || pathname?.includes('/register') || pathname?.includes('/forgot-password') || pathname?.includes('/reset-password');
      
      // We don't want to redirect while the user is trying to login/auth
      if (isAuthPath) return;

      const targetPath = getDashboardPath();
      const isMobileDevice = targetPath === '/m/home';

      if (isMobileDevice && !isMobilePath) {
        router.replace('/m/home');
      } else if (!isMobileDevice && isMobilePath) {
        router.replace('/dashboard');
      }
    };

    checkDevice();
    
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, [pathname, router]);

  return null;
}
