"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavLinkProps = {
  href:  string
  icon:  string
  label: string
}

export default function NavLink({ 
  href, icon, label 
}: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || 
                   pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg 
        text-sm transition-colors
        ${isActive
          ? 'bg-indigo-50 text-indigo-700 font-medium'
          : 'text-gray-700 hover:bg-gray-100'
        }
      `}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
