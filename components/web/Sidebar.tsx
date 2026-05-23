"use client"

import { useState } from 'react'
import { 
  LayoutDashboard, 
  Users as UsersIcon, 
  UtensilsCrossed, 
  CheckCircle2, 
  Package, 
  BarChart3, 
  Settings as SettingsIcon,
  ChefHat,
  ChevronLeft,
  Menu,
  MapPin
} from 'lucide-react'
import SidebarSignOut from './SidebarSignOut'
import NavLink from './NavLink'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  {
    label: 'Dashboard',
    href:  '/dashboard',
    icon:  LayoutDashboard,
    group: 'core'
  },
  {
    label: 'Users',
    href:  '/users',
    icon:  UsersIcon,
    group: 'core'
  },
  {
    label: 'Branches',
    href:  '/branches',
    icon:  MapPin,
    group: 'core'
  },
  {
    label: 'Meals',
    href:  '/meals',
    icon:  UtensilsCrossed,
    group: 'ops'
  },
  {
    label: 'Attendance',
    href:  '/attendance',
    icon:  CheckCircle2,
    group: 'ops'
  },
  {
    label: 'Attendance Setup',
    href:  '/attendance/setup',
    icon:  SettingsIcon,
    group: 'ops'
  },
  {
    label: 'Attendance Records',
    href:  '/attendance/records',
    icon:  BarChart3,
    group: 'ops'
  },
  {
    label: 'Inventory',
    href:  '/inventory',
    icon:  Package,
    group: 'ops'
  },
  {
    label: 'Settings',
    href:  '/settings',
    icon:  SettingsIcon,
    group: 'core'
  }
]

interface SidebarProps {
  user: {
    full_name: string
    role: string
  }
}

export default function Sidebar({ user }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true)

  const filteredItems = navItems.filter(item => {
    if (['Users', 'Settings', 'Branches', 'Attendance Setup'].includes(item.label)) {
      return user.role === 'admin'
    }
    return true
  })

  return (
    <aside 
      className={cn(
        "hidden md:flex bg-slate-900 border-r border-slate-800 flex-col h-full transition-all duration-300 relative z-20 shrink-0",
        isOpen ? "w-64" : "w-20"
      )}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          {isOpen && (
            <span className="text-xl font-bold text-white tracking-tight truncate animate-in fade-in slide-in-from-left-2 duration-300">
              Mealiez
            </span>
          )}
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 transition-all",
            !isOpen && "absolute -right-4 top-20 bg-slate-900 border border-slate-800 rounded-full shadow-xl z-30 hover:scale-110"
          )}
        >
          {isOpen ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
        {/* Core Group */}
        <div className="space-y-1.5">
          {isOpen && (
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3 animate-in fade-in duration-300">
              System Core
            </div>
          )}
          {filteredItems
            .filter(item => item.group === 'core')
            .map(item => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isCollapsed={!isOpen}
              />
            ))}
        </div>

        {/* Operations Group */}
        <div className="space-y-1.5">
          {isOpen && (
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3 animate-in fade-in duration-300">
              Operations
            </div>
          )}
          {filteredItems
            .filter(item => item.group === 'ops')
            .map(item => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isCollapsed={!isOpen}
              />
            ))}
        </div>
      </nav>

      {/* Footer Sidebar Section */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/80 shrink-0">
        <div className={cn(
          "flex items-center gap-3 px-2 mb-4 py-2 rounded-xl bg-slate-800/40 border border-slate-700/30 transition-all overflow-hidden",
          !isOpen && "justify-center"
        )}>
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-inner shrink-0">
            {user.full_name.charAt(0)}
          </div>
          {isOpen && (
            <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
              <p className="text-xs font-bold text-slate-100 truncate">
                {user.full_name}
              </p>
              <p className="text-[10px] text-slate-400 truncate uppercase font-bold tracking-tighter">
                Tenant {user.role}
              </p>
            </div>
          )}
        </div>
        <SidebarSignOut isCollapsed={!isOpen} />
      </div>
    </aside>
  )
}
