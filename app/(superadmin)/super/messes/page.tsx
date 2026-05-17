import { requireSuperAdmin } from '@/lib/auth/guards'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import MessPlanBadge from './MessPlanBadge'

export default async function AllMessesPage() {
  const superUser = await requireSuperAdmin()
  
  const supabaseAdmin = createAdminClient()

  // Fetch tenants
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select(`
      id, name, slug, plan,
      address, city, contact_email,
      timezone, created_at, updated_at
    `)
    .order('created_at', { ascending: false })

  // Fetch user counts for all tenants
  const { data: userCounts } = await supabaseAdmin
    .from('users')
    .select('tenant_id, id, role, is_active')

  // Build member count map
  const countMap: Record<string, {
    total: number, admin: number,
    manager: number, member: number
  }> = {}

  for (const u of userCounts ?? []) {
    if (!countMap[u.tenant_id]) {
      countMap[u.tenant_id] = {
        total: 0, admin: 0, manager: 0, member: 0
      }
    }
    countMap[u.tenant_id].total++
    countMap[u.tenant_id][u.role as 'admin' | 'manager' | 'member']++
  }

  const enrichedTenants = (tenants ?? []).map(t => ({
    ...t,
    user_counts: countMap[t.id] ?? {
      total: 0, admin: 0, manager: 0, member: 0
    }
  }))

  const totalMesses = enrichedTenants.length
  const planStats = {
    trial: enrichedTenants.filter(t => t.plan === 'trial').length,
    starter: enrichedTenants.filter(t => t.plan === 'starter').length,
    pro: enrichedTenants.filter(t => t.plan === 'pro').length,
    enterprise: enrichedTenants.filter(t => t.plan === 'enterprise').length
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">All Messes</h1>
        <p className="text-gray-400 mt-1 text-sm">
          {totalMesses} registered organizations
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        {[
          { label: 'Trial', count: planStats.trial, color: 'text-gray-400 border-gray-800' },
          { label: 'Starter', count: planStats.starter, color: 'text-blue-400 border-blue-900/50' },
          { label: 'Pro', count: planStats.pro, color: 'text-indigo-400 border-indigo-900/50' },
          { label: 'Enterprise', count: planStats.enterprise, color: 'text-purple-400 border-purple-900/50' }
        ].map(s => (
          <div key={s.label} className={`px-4 py-2 bg-gray-900 border ${s.color} rounded-xl text-sm font-medium`}>
            {s.label}: <span className="text-white ml-1">{s.count}</span>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide border-b border-gray-800">
                <th className="text-left px-6 py-4 font-medium">Name</th>
                <th className="text-left px-6 py-4 font-medium">Plan</th>
                <th className="text-left px-6 py-4 font-medium">Members</th>
                <th className="text-left px-6 py-4 font-medium">Contact</th>
                <th className="text-left px-6 py-4 font-medium">City</th>
                <th className="text-left px-6 py-4 font-medium">Registered</th>
                <th className="text-right px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {enrichedTenants.map(t => (
                <tr key={t.id} className="hover:bg-gray-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-gray-200 font-medium">{t.name}</div>
                    <div className="text-gray-500 text-xs">{t.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <MessPlanBadge tenantId={t.id} currentPlan={t.plan} />
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    <div className="font-medium">{t.user_counts.total} total</div>
                    <div className="text-[10px] text-gray-500 uppercase">
                      A:{t.user_counts.admin} M:{t.user_counts.manager} m:{t.user_counts.member}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-400 text-xs">{t.contact_email || '—'}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {t.city || '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {new Date(t.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/super/messes/${t.id}`}
                      className="inline-flex items-center px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {enrichedTenants.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 italic">
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
