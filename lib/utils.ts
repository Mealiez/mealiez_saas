import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Determines the correct dashboard path based on device characteristics.
 * Supports both client-side (window) and server-side (User-Agent) detection.
 */
export function getDashboardPath(userAgent?: string) {
  let isMobile = false;

  if (typeof window !== 'undefined') {
    // Client-side detection
    const width = window.innerWidth;
    const isCapacitor = (window as any).Capacitor || navigator.userAgent.includes('Capacitor');
    isMobile = width < 768 || isCapacitor;
  } else if (userAgent) {
    // Server-side detection (basic)
    isMobile = /mobile/i.test(userAgent);
  }

  return isMobile ? '/m/home' : '/dashboard';
}
