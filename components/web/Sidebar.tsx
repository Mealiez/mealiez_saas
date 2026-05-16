"use client"

import { 
  LayoutDashboard, 
  Users as UsersIcon, 
  UtensilsCrossed, 
  CheckCircle2, 
  Package, 
  BarChart3, 
  Settings as SettingsIcon,
  ChefHat
} from 'lucide-react'
import SidebarSignOut from './SidebarSignOut'
import NavLink from './NavLink'
import { cn } from '@/lib/utils'

const navItems = [
  {
    label: 'Dashboard',
    href:  '/dashboard',
    icon:  LayoutDashboard
  },
  {
    label: 'Users',
    href:  '/users',
    icon:  UsersIcon
  },
  {
    label: 'Meals',
    href:  '/meals',
    icon:  UtensilsCrossed
  },
  {
    label: 'Attendance',
    href:  '/attendance',
    icon:  CheckCircle2
  },
  {
    label: 'Inventory',
    href:  '/inventory',
    icon:  Package
  },
  {
    label: 'Reports',
    href:  '/reports',
    icon:  BarChart3
  },
  {
    label: 'Settings',
    href:  '/settings',
    icon:  SettingsIcon
  }
]

interface SidebarProps {
  user: {
    full_name: string
    role: string
  }
}

export default function Sidebar({ user }: SidebarProps) {
  return (
    <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col fixed inset-y-0 z-20">
      {/* Logo Section */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            Mealiez
          </span>
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3">
          System Core
        </div>
        {navItems
          .filter(item => {
            if (['Users', 'Settings'].includes(item.label)) {
              return user.role === 'admin'
            }
            return true
          })
          .map(item => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
            />
          ))}
      </nav>

      {/* Footer Sidebar Section */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-3 px-3 mb-4 py-2 rounded-xl bg-slate-800/40 border border-slate-700/30">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-inner">
            {user.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-100 truncate">
              {user.full_name}
            </p>
            <p className="text-[10px] text-slate-400 truncate uppercase font-bold tracking-tighter">
              Tenant {user.role}
            </p>
          </div>
        </div>
        <SidebarSignOut />
      </div>
    </aside>
  )
}
