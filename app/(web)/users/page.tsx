import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { isAdminOrAbove } from '@/lib/auth/roles'
import UsersTable from './UsersTable'
import InviteUserModal from './InviteUserModal'

export default async function UsersPage() {
  const currentUser = await requireAuth()

  const supabase = await createClient()
  const { data: users } = await supabase
    .from('users')
    .select(`
      id, 
      full_name, 
      phone, 
      role, 
      is_active, 
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Team Members</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your team's access and roles.</p>
        </div>
        {isAdminOrAbove(currentUser.role) && (
          <div className="flex-shrink-0">
            <InviteUserModal currentUserRole={currentUser.role} />
          </div>
        )}
      </header>
      
      {/* Users Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <UsersTable
          initialUsers={(users as any[]) ?? []}
          currentUser={currentUser}
        />
      </div>
    </div>
  )
}
