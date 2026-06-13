"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getClientUser } from '@/lib/auth/client-session';

const PATH_MAP: Record<string, string> = {
  '/dashboard': '/m/home',
  '/attendance': '/m/attendance',
  '/meal-requests': '/m/meal-requests',
  '/inventory': '/m/inventory',
  '/profile': '/m/profile',
  '/reports': '/m/reports',
};

export default function DeviceRedirector() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !pathname) return;

    const checkRoleAndRedirect = async () => {
      // 1. Skip checks for auth flows
      const isAuthPath = pathname.includes('/login') || 
                         pathname.includes('/register') || 
                         pathname.includes('/forgot-password') || 
                         pathname.includes('/reset-password');
      
      if (isAuthPath) return;

      const user = await getClientUser();
      if (!user) return;

      const isMember = user.role === 'member';
      const isCurrentlyOnMobilePath = pathname.startsWith('/m');

      // 2. MEMBER LOGIC: Always forced to Mobile paths
      if (isMember && !isCurrentlyOnMobilePath) {
        const target = PATH_MAP[pathname] || '/m/home';
        router.replace(target);
        return;
      }

      // 3. ADMIN/MANAGER LOGIC: Device-aware but flexible
      if (!isMember) {
        const width = window.innerWidth;
        const isCapacitor = (window as any).Capacitor || navigator.userAgent.includes('Capacitor');
        const isMobileDevice = width < 768 || isCapacitor;

        // Only force Admin/Manager to Mobile if they are physically on a mobile device and on a Web path
        if (isMobileDevice && !isCurrentlyOnMobilePath) {
          const target = PATH_MAP[pathname] || '/m/home';
          router.replace(target);
        }
        
        // NOTE: We REMOVED the auto-redirect from Mobile paths back to Desktop for Admins.
        // This allows them to use /m/ paths on Desktop for testing if they want.
      }
    };

    checkRoleAndRedirect();

    // Re-check on resize for dynamic experience
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(checkRoleAndRedirect, 500);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [pathname, router, isMounted]);

  return null;
}
