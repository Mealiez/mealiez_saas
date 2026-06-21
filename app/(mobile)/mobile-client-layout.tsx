"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getClientUser, type AuthUser, signOut, onAuthStateChange, getClientSession } from '@/lib/auth/client-session'
import MobileBottomNav from '@/components/mobile/MobileBottomNav'
import { Loader2, UserCircle, Monitor, LogOut } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { PwaUpdater } from '@/components/pwa/pwa-updater'
import { InstallPrompt } from '@/components/pwa/install-prompt'

export default function MobileClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const isLoginPage = pathname === '/login'

  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!isOnline && pathname) {
      const onlineOnlyPaths = [
        '/m/attendance/scan',
        '/m/attendance/active',
        '/m/attendance/sessions',
        '/m/meal-requests',
        '/m/inventory/purchase',
        '/m/reports'
      ]

      const isOnlineOnly = onlineOnlyPaths.some(p => pathname.startsWith(p))
      if (isOnlineOnly) {
        router.replace('/m/offline')
      }
    }
  }, [isOnline, pathname, router])

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      const u = await getClientUser()
      if (isMounted) {
        setUser(u)
        setLoading(false)
      }
    }

    checkAuth()

    const subscription = onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        router.replace('/login')
      } else if (event === 'SIGNED_IN') {
        checkAuth()
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router])

  // Background pre-fetching when online
  useEffect(() => {
    if (user && isOnline) {
      // 1. Fetch and cache attendance logs
      fetch(`/api/users/${user.id}/attendance`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then(data => {
          localStorage.setItem('mealiez_attendance_logs', JSON.stringify(data.data || []));
        })
        .catch(err => console.error('[PREFETCH_ATTENDANCE_ERROR]', err));

      // 2. Fetch and cache meal requests (history)
      fetch('/api/meal-requests')
        .then(res => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then(data => {
          localStorage.setItem('mealiez_meal_requests', JSON.stringify(data.data || []));
        })
        .catch(err => console.error('[PREFETCH_MEAL_REQUESTS_ERROR]', err));

      // 3. Fetch and cache today's meals menu
      fetch('/api/meals/today')
        .then(res => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then(data => {
          if (data.data) {
            localStorage.setItem('mealiez_meals_today', JSON.stringify(data.data));
            localStorage.setItem('mealiez_meals_today_date', data.date || new Date().toISOString().split('T')[0]);
          }
        })
        .catch(err => console.error('[PREFETCH_MEALS_ERROR]', err));

      // 4. Fetch and cache member QR badge (only for members)
      if (user.role === 'member') {
        getClientSession().then(session => {
          if (session) {
            fetch('/api/member-qr', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            })
            .then(res => {
              if (res.ok) return res.json();
              throw new Error();
            })
            .then(data => {
              localStorage.setItem('mealiez_member_qr', JSON.stringify(data));
            })
            .catch(err => console.error('[PREFETCH_QR_ERROR]', err));
          }
        });
      }
    }
  }, [user, isOnline]);

  const handleAdminLogout = async () => {
    await signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  // BLOCK ADMIN ON MOBILE
  if (user?.role === 'admin') {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center p-8 text-center">
        <div className="max-w-xs w-full space-y-6 animate-in fade-in zoom-in duration-500">
           <div className="relative inline-block">
              <div className="h-20 w-20 rounded-3xl bg-red-50 flex items-center justify-center text-red-600 shadow-inner">
                <Monitor size={40} />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-white shadow flex items-center justify-center text-red-600 font-bold border-2 border-red-50">!</div>
           </div>
           
           <div className="space-y-2">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Access Denied</h2>
              <p className="text-sm font-bold text-gray-500 leading-relaxed uppercase tracking-tight">
                It is not accessible, use desktop.
              </p>
           </div>

           <button 
             onClick={handleAdminLogout}
             className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
           >
              <LogOut size={16} />
              Sign Out & Switch
           </button>
        </div>
      </div>
    )
  }

  // If logged out or on login page, don't show shell
  if (!user || isLoginPage) {
    return <>{children}</>
  }

  return (
    <section className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* MOBILE HEADER */}
      <header className="h-16 shrink-0 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 flex items-center justify-between z-40 sticky top-0">
        <div className="flex items-center gap-2">
           <div className="w-10 h-10 overflow-hidden flex items-center justify-center">
              <img src="/icon.png" alt="Mealiez" className="w-full h-full object-contain" />
           </div>
           <span className="text-lg font-black tracking-tighter uppercase text-gray-900">Mealiez</span>
        </div>

        <Link href="/m/profile" className="group">
           <div className="h-9 w-9 rounded-full bg-blue-50 border-2 border-white shadow-sm flex items-center justify-center text-blue-600 font-bold text-xs overflow-hidden transition-all active:scale-95 group-hover:border-blue-200">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                user?.full_name?.charAt(0) || <UserCircle size={20} />
              )}
           </div>
        </Link>
      </header>

      {/* MOBILE CONTENT AREA */}
      <main className="flex-1 overflow-y-auto scroll-smooth pb-20 relative">
        <div className="max-w-lg mx-auto w-full">
          {children}
        </div>
      </main>

      {/* MOBILE NAVIGATION */}
      <MobileBottomNav />
      <PwaUpdater />
      <InstallPrompt />
    </section>
  )
}
