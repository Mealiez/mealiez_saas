"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardPath } from '@/lib/utils';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getDashboardPath());
  }, [router]);

  return null;
}
