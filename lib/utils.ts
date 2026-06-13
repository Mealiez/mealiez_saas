import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Determines the correct dashboard path based on screen width and native environment.
 */
export function getDashboardPath() {
  if (typeof window === 'undefined') return '/dashboard';

  const width = window.innerWidth;
  const isMobile = width < 768 || 
                   window.hasOwnProperty('Capacitor') || 
                   navigator.userAgent.includes('Capacitor');

  return isMobile ? '/m/home' : '/dashboard';
}
