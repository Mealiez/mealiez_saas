"use client"

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface SuperAdminSidebarProps {
  email: string
}

const navItems = [
  {
    label: 'Dashboard',
    href: '/super/dashboard',
    icon: '▦',
    section: 'overview'
  },
  {
    label: 'Messes',
    href: '/super/messes',
    icon: '🏠',
    section: 'platform'
  },
  {
    label: 'Users',
    href: '/super/users',
    icon: '👥',
    section: 'platform'
  },
  {
    label: 'Subscriptions',
    href: '/super/subscriptions',
    icon: '💳',
    section: 'billing'
  },
  {
    label: 'Feature Flags',
    href: '/super/features',
    icon: '⚡',
    section: 'config'
  },
  {
    label: 'Tenant Config',
    href: '/super/config',
    icon: '⚙️',
    section: 'config'
  },
  {
    label: 'Audit Log',
    href: '/super/audit',
    icon: '📋',
    section: 'system'
  },
  {
    label: 'System Health',
    href: '/super/health',
    icon: '💚',
    section: 'system'
  }
]

const sectionLabels: Record<string, string> = {
  platform: "Platform",
  billing: "Billing",
  config: "Configuration",
  system: "System"
}

export default function SuperAdminSidebar({ email }: SuperAdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/super/login')
    router.refresh()
  }

  // Helper to group items by section
  const sections = ['overview', 'platform', 'billing', 'config', 'system']

  return (
    <aside className="w-60 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
      {/* Logo / Brand */}
      <div className="px-6 py-6 border-b border-gray-800">
        <p className="text-xs text-indigo-400 uppercase tracking-widest font-medium mb-1">
          Platform Console
        </p>
        <h2 className="text-white font-bold text-lg tracking-tight">
          Mealiez
        </h2>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {sections.map((section) => {
          const items = navItems.filter(item => item.section === section)
          if (items.length === 0) return null

          return (
            <div key={section} className="mb-6">
              {sectionLabels[section] && (
                <p className="px-3 mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {sectionLabels[section]}
                </p>
              )}
              {items.map((item) => {
                const isActive = item.href === '/super/dashboard' 
                  ? pathname === item.href 
                  : pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                      isActive
                        ? 'bg-indigo-900/50 text-indigo-300'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Footer: user info + sign out */}
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-900 flex items-center justify-center text-indigo-300 text-sm font-bold">
            {email[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-300 font-medium truncate">
              {email}
            </p>
            <p className="text-xs text-indigo-400 font-medium">
              Super Admin
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left text-xs text-gray-500 hover:text-gray-300 transition-colors py-1"
        >
          Sign out →
        </button>
      </div>
    </aside>
  )
}
