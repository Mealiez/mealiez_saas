import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminOrAbove } from '@/lib/auth/roles'
import UsersTable from './UsersTable'
import InviteUserModal from './InviteUserModal'

export default async function UsersPage({
  searchParams
}: {
  searchParams: { designation?: string; search?: string; page?: string }
}) {
  const currentUser = await requireAuth()

  // ROLE-BASED AUTH: Only admin can access user management
  if (currentUser.role !== 'admin') {
    redirect('/dashboard');
  }

  const pageSize = 10
  const currentPage = Number(searchParams.page) || 1
  const from = (currentPage - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = await createClient()

  // 1. Fetch designations for the filter dropdown and modal
  const { data: designations } = await supabase
    .from('designations')
    .select('id, name')
    .order('name')

  // 2. Fetch branches for the invite modal
  const { data: branches } = await supabase
    .from('branches')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  // 3. Build user query with join
  let query = supabase
    .from('users')
    .select(`
      id, 
      full_name, 
      enrollment_no,
      phone, 
      role, 
      is_active, 
      created_at,
      avatar_url,
      designation_id,
      designation:designations(name)
    `, { count: 'exact' })
    .eq('tenant_id', currentUser.tenant_id) // SECURITY: Must be same tenant
    .order('created_at', { ascending: false })

  if (searchParams.designation) {
    query = query.eq('designation_id', searchParams.designation)
  }

  if (searchParams.search) {
    const term = `%${searchParams.search}%`
    // Use .or() with a filter string for name and enrollment
    query = query.or(`full_name.ilike.${term},enrollment_no.ilike.${term}`)
  }

  const { data: users, count: totalCount } = await query.range(from, to)

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Team Members</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your team's access and roles.</p>
          </div>
          <div className="flex items-center gap-3">
            {isAdminOrAbove(currentUser.role) && (
              <InviteUserModal 
                currentUserRole={currentUser.role} 
                initialBranches={(branches as any[]) ?? []}
                initialDesignations={(designations as any[]) ?? []}
              />
            )}
          </div>
        </header>
        
        {/* Users Table Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <UsersTable
            initialUsers={(users as any[]) ?? []}
            currentUser={currentUser}
            designations={(designations as any[]) ?? []}
            totalCount={totalCount || 0}
            currentPage={currentPage}
            pageSize={pageSize}
          />
        </div>
      </div>
    </div>
  )
}
