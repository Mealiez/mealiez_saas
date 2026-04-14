import { requireAuth } from '@/lib/auth/session'
import Link from 'next/link'
import { isAdminOrAbove } from '@/lib/auth/roles'

type ModuleCard = {
  title:       string
  description: string
  href:        string
  icon:        string
  adminOnly:   boolean
}

const MODULE_CARDS: ModuleCard[] = [
  {
    title:       'User Management',
    description: 'Invite staff, assign roles, manage team members',
    href:        '/users',
    icon:        '👥',
    adminOnly:   true
  },
  {
    title:       'Meal Management',
    description: 'Plan menus, manage daily meals',
    href:        '/meals',
    icon:        '🍽️',
    adminOnly:   false
  },
  {
    title:       'Attendance',
    description: 'Track daily meal attendance',
    href:        '/attendance',
    icon:        '✅',
    adminOnly:   false
  },
  {
    title:       'Inventory',
    description: 'Manage ingredients and stock',
    href:        '/inventory',
    icon:        '📦',
    adminOnly:   true
  },
  {
    title:       'Reports',
    description: 'Analytics and custom reports',
    href:        '/reports',
    icon:        '📊',
    adminOnly:   true
  },
  {
    title:       'Settings',
    description: 'Tenant settings and billing',
    href:        '/settings',
    icon:        '⚙️',
    adminOnly:   true
  }
]

export default async function DashboardPage() {
  const user = await requireAuth()

  const visibleCards = MODULE_CARDS.filter(card =>
    !card.adminOnly || isAdminOrAbove(user.role)
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.full_name} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {user.role === 'owner' || user.role === 'admin'
            ? "Here's your admin overview."
            : "Here's what you have access to."
          }
        </p>
      </div>

      {/* Role badge + tenant info */}
      <div className="mb-8 p-4 bg-white rounded-xl 
                      border border-gray-200 
                      flex items-center gap-4">
        <div>
          <p className="text-xs text-gray-400">
            Your role
          </p>
          <span className="inline-block mt-1 px-3 py-1 
                           text-sm font-medium rounded-full 
                           bg-indigo-50 text-indigo-700 
                           capitalize">
            {user.role}
          </span>
        </div>
        <div className="border-l border-gray-200 pl-4">
          <p className="text-xs text-gray-400">
            Tenant ID
          </p>
          <p className="text-xs font-mono text-gray-600 mt-1">
            {user.tenant_id}
          </p>
        </div>
      </div>

      {/* Module cards grid */}
      <div className="grid grid-cols-1 gap-4 
                      sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map(card => (
          <Link
            key={card.href}
            href={card.href}
            className="block p-6 bg-white rounded-xl 
                       border border-gray-200 
                       hover:border-indigo-300 
                       hover:shadow-md 
                       transition-all group"
          >
            <div className="text-3xl mb-3">
              {card.icon}
            </div>
            <h2 className="font-semibold text-gray-900 
                           group-hover:text-indigo-700 
                           transition-colors">
              {card.title}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
