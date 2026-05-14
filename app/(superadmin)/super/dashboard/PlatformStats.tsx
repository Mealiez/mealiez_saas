"use client"

interface PlatformStatsProps {
  stats: {
    total_tenants: number
    total_users: number
    active_users: number
    meals_30d: number
    new_tenants_30d: number
  }
}

export default function PlatformStats({ stats }: PlatformStatsProps) {
  const cards = [
    {
      label: 'Total Messes',
      value: stats.total_tenants.toLocaleString(),
      sublabel: 'registered on platform',
      color: 'indigo'
    },
    {
      label: 'Total Users',
      value: stats.total_users.toLocaleString(),
      sublabel: 'across all messes',
      color: 'blue'
    },
    {
      label: 'Active Users',
      value: stats.active_users.toLocaleString(),
      sublabel: 'currently enabled',
      color: 'green'
    },
    {
      label: 'Meals (30d)',
      value: stats.meals_30d.toLocaleString(),
      sublabel: 'attendance records',
      color: 'amber'
    },
    {
      label: 'New Messes (30d)',
      value: stats.new_tenants_30d.toLocaleString(),
      sublabel: 'last 30 days',
      color: 'purple'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-6"
        >
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
            {card.label}
          </p>
          <p className="text-4xl font-bold text-white tracking-tight">
            {card.value}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            {card.sublabel}
          </p>
        </div>
      ))}
    </div>
  )
}
