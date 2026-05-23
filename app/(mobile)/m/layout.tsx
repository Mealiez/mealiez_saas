"use client"

import MobileBottomNav from '@/components/mobile/MobileBottomNav'

export default function MobileSubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mobile-sub-layout min-h-screen flex flex-col bg-gray-50 pb-20">
      <main className="flex-1">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  )
}
