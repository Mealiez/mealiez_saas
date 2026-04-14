import { requireAuth } from '@/lib/auth/session'
import SidebarSignOut from '@/components/web/SidebarSignOut'
import NavLink from '@/components/web/NavLink'

const navItems = [
  {
    label: 'Dashboard',
    href:  '/dashboard',
    icon:  '🏠'
  },
  {
    label: 'Users',
    href:  '/users',
    icon:  '👥'
  },
  {
    label: 'Meals',
    href:  '/meals',
    icon:  '🍽️'
  },
  {
    label: 'Attendance',
    href:  '/attendance',
    icon:  '✅'
  },
  {
    label: 'Inventory',
    href:  '/inventory',
    icon:  '📦'
  },
  {
    label: 'Reports',
    href:  '/reports',
    icon:  '📊'
  },
  {
    label: 'Settings',
    href:  '/settings',
    icon:  '⚙️'
  }
]

export default async function WebLayout({
  children
}: {
  children: React.ReactNode
}) {
  const user = await requireAuth()

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">

      {/* SIDEBAR */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col fixed inset-y-0">
        {/* Logo Section */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <span className="text-xl font-bold text-blue-600 tracking-tight">
            Mealiez
          </span>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
            Main Menu
          </div>
          {navItems.map(item => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </nav>

        {/* Footer Sidebar Section */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-3 px-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
              {user.full_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.full_name}
              </p>
              <p className="text-xs text-gray-500 truncate capitalize">
                {user.role}
              </p>
            </div>
          </div>
          <SidebarSignOut />
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col md:pl-64">
        
        {/* TOP HEADER */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-500">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="px-3 py-1 bg-gray-100 rounded-full border border-gray-200">
                <span className="text-xs font-mono text-gray-600">
                  Tenant: {user.tenant_id.slice(0, 8)}...
                </span>
             </div>
          </div>
        </header>

        {/* MAIN PAGE CONTENT */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
