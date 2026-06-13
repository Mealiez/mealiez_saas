"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardPath } from '@/lib/utils';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Determine target based on current device resolution/environment
    router.replace(getDashboardPath());
  }, [router]);

  return null;
}
