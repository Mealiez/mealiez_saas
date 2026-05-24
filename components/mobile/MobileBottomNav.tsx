"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  QrCode, 
  Camera, 
  Utensils, 
  CheckCircle2,
  ChefHat,
  FileBarChart
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getClientUser, type AuthUser } from '@/lib/auth/client-session'

const memberNav = [
  { label: 'Home', href: '/m/home', icon: Home },
  { label: 'Badge', href: '/m/my-qr', icon: QrCode },
  { label: 'Scan', href: '/m/attendance/scan', icon: Camera },
  { label: 'Booking', href: '/m/meal-requests', icon: Utensils },
  { label: 'Attendance', href: '/m/attendance/history', icon: CheckCircle2 },
  { label: 'Meals', href: '/m/meals', icon: ChefHat }
]

const managerNav = [
  { label: 'Home', href: '/m/home', icon: Home },
  { label: 'Badge', href: '/m/my-qr', icon: QrCode },
  { label: 'Scan', href: '/m/attendance/scan', icon: Camera },
  { label: 'Requests', href: '/m/meal-requests/dashboard', icon: Utensils },
  { label: 'Attendance', href: '/m/attendance/active', icon: CheckCircle2 }
]

export default function MobileBottomNav() {
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    getClientUser().then(setUser)
  }, [])

  const navItems = (user?.role === 'manager' || user?.role === 'admin') ? managerNav : memberNav

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-gray-100 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <div className="max-w-lg mx-auto flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 w-full h-full transition-all duration-300",
                isActive ? "text-blue-600" : "text-gray-400"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-300",
                isActive && "bg-blue-50"
              )}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[8px] font-black uppercase tracking-tighter transition-all",
                isActive ? "opacity-100 scale-100" : "opacity-70 scale-95"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 bg-blue-600 rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
