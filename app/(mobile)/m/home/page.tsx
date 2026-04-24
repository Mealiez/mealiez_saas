"use client"

import { useAuthGuard } from '@/hooks/useAuthGuard'
import { signOut } from '@/lib/auth/client-session'
import Link from 'next/link'

export default function MobileHomePage() {
  const { user, isLoading, isAuthorized } = useAuthGuard()
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthorized || !user) return null

  const handleSignOut = async () => {
    await signOut()
    // useAuthGuard's onAuthStateChange will handle redirect to /m/login
  }

  const isManagerPlus = ['owner', 'admin', 'manager'].includes(user.role)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-6 space-y-8">
      {/* Header */}
      <header className="pt-4">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          Hello, {user.full_name.split(' ')[0]}
        </h1>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
          {user.role} Account
        </p>
      </header>

      {/* Nav Cards */}
      <div className="space-y-4">
        <Link 
          href="/m/my-qr"
          className="block bg-white p-6 rounded-3xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl">
                🪪
              </div>
              <div>
                <h3 className="font-black text-gray-900 uppercase tracking-tight">My QR Badge</h3>
                <p className="text-xs text-gray-500">Show to check in</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        <Link 
          href="/m/attendance/scan"
          className="block bg-white p-6 rounded-3xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-2xl">
                📷
              </div>
              <div>
                <h3 className="font-black text-gray-900 uppercase tracking-tight">Scan QR</h3>
                <p className="text-xs text-gray-500">Scan session code</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        {isManagerPlus && (
          <Link 
            href="/m/admin-scan"
            className="block bg-white p-6 rounded-3xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl">
                  🔍
                </div>
                <div>
                  <h3 className="font-black text-gray-900 uppercase tracking-tight">Admin Scan</h3>
                  <p className="text-xs text-gray-500">Scan member badges</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        )}
      </div>

      <div className="flex-1" />

      {/* Footer Actions */}
      <button
        onClick={handleSignOut}
        className="w-full py-4 px-4 text-center font-black text-sm text-red-500 bg-red-50 rounded-2xl border border-red-100 uppercase tracking-widest active:scale-95 transition-all"
      >
        Sign Out
      </button>
    </div>
  )
}
