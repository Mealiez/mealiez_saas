import { requireSuperAdmin } from '@/lib/auth/guards'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import PlatformStats from './PlatformStats'
import Link from 'next/link'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function SuperDashboardPage() {
  const superUser = await requireSuperAdmin()
  // redirects if not super admin

  // Fetch data server-side
  const [tenantsResult, usersResult, attendanceResult] = await Promise.all([
    supabaseAdmin
      .from('tenants')
      .select('id, name, plan, created_at'),
    supabaseAdmin
      .from('users')
      .select('id, role, is_active, created_at, tenant_id'),
    supabaseAdmin
      .from('attendance_records')
      .select('id, marked_at')
      .gte('marked_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  ])

  const tenants = tenantsResult.data ?? []
  const users = usersResult.data ?? []
  const recentAttendance = attendanceResult.data ?? []

  const stats = {
    total_tenants: tenants.length,
    total_users: users.length,
    active_users: users.filter(u => u.is_active).length,
    meals_30d: recentAttendance.length,
    plan_breakdown: {
      trial: tenants.filter(t => t.plan === 'trial').length,
      starter: tenants.filter(t => t.plan === 'starter').length,
      pro: tenants.filter(t => t.plan === 'pro').length,
      enterprise: tenants.filter(t => t.plan === 'enterprise').length
    },
    new_tenants_30d: tenants.filter(t =>
      new Date(t.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length
  }

  const recentTenants = [...tenants]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Platform Dashboard
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Mealiez platform overview ·{' '}
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-900/50 border border-green-700 rounded-full text-green-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            System Operational
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <PlatformStats stats={stats} />

      {/* Plan breakdown */}
      <div className="mt-8 bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">
          Subscription Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Trial', count: stats.plan_breakdown.trial, color: 'text-gray-400' },
            { label: 'Starter', count: stats.plan_breakdown.starter, color: 'text-blue-400' },
            { label: 'Pro', count: stats.plan_breakdown.pro, color: 'text-indigo-400' },
            { label: 'Enterprise', count: stats.plan_breakdown.enterprise, color: 'text-purple-400' }
          ].map(p => (
            <div key={p.label} className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                {p.label}
              </p>
              <p className={`text-3xl font-bold ${p.color}`}>
                {p.count}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                mess{p.count !== 1 ? 'es' : ''}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent messes */}
      <div className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">
            Recently Registered Messes
          </h2>
          <Link href="/super/messes" className="text-sm text-indigo-400 hover:text-indigo-300">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-800">
                <th className="text-left pb-3 font-medium">Mess Name</th>
                <th className="text-left pb-3 font-medium">Plan</th>
                <th className="text-left pb-3 font-medium">Registered</th>
                <th className="text-left pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {recentTenants.map(t => (
                <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                  <td className="py-3 text-gray-200 font-medium">{t.name}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-900/50 text-indigo-300 capitalize">
                      {t.plan}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500 text-xs">
                    {new Date(t.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="py-3 text-right">
                    <Link href={`/super/messes/${t.id}`} className="text-xs text-indigo-400 hover:text-indigo-300">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
              {recentTenants.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500 italic">
                    No messes registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
