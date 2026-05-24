"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavLinkProps = {
  href:  string
  icon:  LucideIcon
  label: string
  isCollapsed?: boolean
}

export default function NavLink({ 
  href, icon: Icon, label, isCollapsed = false
}: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || 
                   (href !== '/dashboard' && pathname.startsWith(href + '/'))

  return (
    <Link
      href={href}
      title={isCollapsed ? label : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 group",
        isActive
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold"
          : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
        isCollapsed && "justify-center px-2"
      )}
    >
      <Icon className={cn(
        "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
        isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
      )} />
      
      {!isCollapsed && (
        <span className="truncate tracking-tight animate-in fade-in slide-in-from-left-2 duration-300">
          {label}
        </span>
      )}
      
      {isActive && !isCollapsed && (
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-200 animate-in fade-in zoom-in duration-500" />
      )}
    </Link>
  )
}
