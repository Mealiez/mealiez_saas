"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavLinkProps = {
  href:  string
  icon:  LucideIcon
  label: string
}

export default function NavLink({ 
  href, icon: Icon, label 
}: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || 
                   (href !== '/dashboard' && pathname.startsWith(href + '/'))

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group",
        isActive
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold"
          : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
      )}
    >
      <Icon className={cn(
        "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
        isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
      )} />
      <span className="truncate tracking-tight">{label}</span>
      
      {isActive && (
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-200 animate-in fade-in zoom-in duration-300" />
      )}
    </Link>
  )
}
