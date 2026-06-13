"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const PATH_MAP: Record<string, string> = {
  '/dashboard': '/m/home',
  '/attendance': '/m/attendance',
  '/meal-requests': '/m/meal-requests',
  '/inventory': '/m/inventory',
  '/profile': '/m/profile',
  '/reports': '/m/reports',
};

// Create reverse map automatically
const REVERSE_PATH_MAP: Record<string, string> = Object.entries(PATH_MAP).reduce(
  (acc, [web, mobile]) => ({ ...acc, [mobile]: web }),
  {}
);

export default function DeviceRedirector() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !pathname) return;

    const checkDeviceAndRedirect = () => {
      // 1. Skip checks for auth flows
      const isAuthPath = pathname.includes('/login') || 
                         pathname.includes('/register') || 
                         pathname.includes('/forgot-password') || 
                         pathname.includes('/reset-password');
      
      if (isAuthPath) return;

      // 2. Detection (Resolution + Capacitor)
      const width = window.innerWidth;
      const isCapacitor = (window as any).Capacitor || 
                         navigator.userAgent.includes('Capacitor') ||
                         navigator.userAgent.includes('Mobile');
      
      const isMobileDevice = width < 768 || isCapacitor;
      const isCurrentlyOnMobilePath = pathname.startsWith('/m');

      // 3. Environment Enforcement with Path Preservation
      // If Mobile device is on a Web path
      if (isMobileDevice && !isCurrentlyOnMobilePath) {
        const target = PATH_MAP[pathname] || '/m/home';
        router.replace(target);
      } 
      // If Desktop device is on a Mobile path
      else if (!isMobileDevice && isCurrentlyOnMobilePath) {
        const target = REVERSE_PATH_MAP[pathname] || '/dashboard';
        router.replace(target);
      }
    };

    // Run on path change and window resize
    checkDeviceAndRedirect();

    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkDeviceAndRedirect, 250);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [pathname, router, isMounted]);

  return null;
}
