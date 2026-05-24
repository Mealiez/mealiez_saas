"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  QrCode, 
  Camera, 
  Utensils, 
  Package 
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    label: 'Home',
    href: '/m/home',
    icon: Home
  },
  {
    label: 'Badge',
    href: '/m/my-qr',
    icon: QrCode
  },
  {
    label: 'Scan',
    href: '/m/attendance/scan',
    icon: Camera
  },
  {
    label: 'Booking',
    href: '/m/meal-requests',
    icon: Utensils
  },
  {
    label: 'Inventory',
    href: '/m/inventory',
    icon: Package
  }
]

export default function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <div className="max-w-lg mx-auto flex justify-around items-center h-16 px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
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
                "p-1 rounded-xl transition-all duration-300",
                isActive && "bg-blue-50"
              )}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-tighter transition-all",
                isActive ? "opacity-100 scale-100" : "opacity-70 scale-95"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 bg-blue-600 rounded-full animate-in fade-in zoom-in duration-500" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
