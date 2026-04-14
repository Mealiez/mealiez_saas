"use client"

import { useState } from 'react'
import type { AuthUser } from '@/lib/auth/session'
import { type UserRole, isAdminOrAbove } from '@/lib/auth/roles'
import RoleUpdateDropdown from './RoleUpdateDropdown'

type UserRow = {
  id: string
  full_name: string
  phone: string | null
  role: UserRole
  is_active: boolean
  created_at: string
}

interface UsersTableProps {
  initialUsers: UserRow[]
  currentUser: AuthUser
}

export default function UsersTable({ initialUsers, currentUser }: UsersTableProps) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggleStatus = async (userId: string, currentStatus: boolean) => {
    setIsLoading(userId)
    setError(null)

    try {
      const res = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      })

      if (res.ok) {
        setUsers(prev => prev.map(u =>
          u.id === userId ? { ...u, is_active: !currentStatus } : u
        ))
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to update status')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(null)
    }
  }

  const handleRoleUpdate = (userId: string, newRole: UserRole) => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, role: newRole } : u
    ))
  }

  return (
    <div className="overflow-x-auto">
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-100 flex items-center gap-2">
          <span className="text-red-500">⚠️</span>
          <span className="text-sm text-red-600 font-medium">{error}</span>
        </div>
      )}
      
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
            <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr 
              key={user.id} 
              className={`hover:bg-gray-50 transition-colors ${user.id === currentUser.id ? 'bg-blue-50/20' : ''}`}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs border border-gray-200">
                    {user.full_name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      {user.full_name}
                      {user.id === currentUser.id && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">You</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{user.phone || 'No phone'}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {isAdminOrAbove(currentUser.role) && user.id !== currentUser.id && user.role !== 'owner' ? (
                  <RoleUpdateDropdown
                    userId={user.id}
                    currentRole={user.role}
                    currentUserRole={currentUser.role}
                    onRoleUpdate={handleRoleUpdate}
                  />
                ) : (
                  <span className="text-sm text-gray-700 capitalize font-medium">{user.role}</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2.5 py-1 inline-flex text-xs leading-4 font-bold rounded-full ${
                  user.is_active 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(user.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {isAdminOrAbove(currentUser.role) && user.id !== currentUser.id && (
                  <button
                    onClick={() => toggleStatus(user.id, user.is_active)}
                    disabled={isLoading === user.id}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      user.is_active 
                        ? 'text-red-600 hover:bg-red-50' 
                        : 'text-blue-600 hover:bg-blue-50'
                    } disabled:opacity-50`}
                  >
                    {isLoading === user.id ? '...' : (user.is_active ? 'Deactivate' : 'Activate')}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
