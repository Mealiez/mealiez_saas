import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminOrAbove } from '@/lib/auth/roles'
import UsersTable from './UsersTable'
import InviteUserModal from './InviteUserModal'

export default async function UsersPage({
  searchParams
}: {
  searchParams: { designation?: string }
}) {
  const currentUser = await requireAuth()

  // ROLE-BASED AUTH: Only admin can access user management
  if (currentUser.role !== 'admin') {
    redirect('/dashboard');
  }

  const supabase = await createClient()

  // 1. Fetch designations for the filter dropdown
  const { data: designations } = await supabase
    .from('designations')
    .select('id, name')
    .order('name')

  // 2. Build user query with join
  let query = supabase
    .from('users')
    .select(`
      id, 
      full_name, 
      phone, 
      role, 
      is_active, 
      created_at,
      avatar_url,
      designation_id,
      designation:designations(name)
    `)
    .order('created_at', { ascending: false })

  if (searchParams.designation) {
    query = query.eq('designation_id', searchParams.designation)
  }

  const { data: users } = await query.limit(50)

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Team Members</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your team's access and roles.</p>
          </div>
          <div className="flex items-center gap-3">
            {isAdminOrAbove(currentUser.role) && (
              <InviteUserModal currentUserRole={currentUser.role} />
            )}
          </div>
        </header>
        
        {/* Users Table Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <UsersTable
            initialUsers={(users as any[]) ?? []}
            currentUser={currentUser}
            designations={(designations as any[]) ?? []}
          />
        </div>
      </div>
    </div>
  )
}
