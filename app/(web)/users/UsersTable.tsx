"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { type UserRole, isAdminOrAbove, type AuthUser } from '@/lib/auth/roles'
import RoleUpdateDropdown from './RoleUpdateDropdown'
import { MoreVertical, User, Trash2, Eye, ShieldAlert, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button'

type UserRow = {
  id: string
  full_name: string
  enrollment_no: string | null
  phone: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  avatar_url?: string | null
  designation?: { name: string } | null
}

interface UsersTableProps {
  initialUsers: UserRow[]
  currentUser: AuthUser
  designations: { id: string, name: string }[]
  totalCount: number
  currentPage: number
  pageSize: number
}

export default function UsersTable({ 
  initialUsers, 
  currentUser, 
  designations,
  totalCount,
  currentPage,
  pageSize
}: UsersTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')

  const totalPages = Math.ceil(totalCount / pageSize)

  // SYNC: Update internal state when server-side props change (e.g. after search/filter)
  useEffect(() => {
    setUsers(initialUsers)
  }, [initialUsers])

  // SYNC: Update search input when URL changes (e.g. back button)
  useEffect(() => {
    setSearchInput(searchParams.get('search') || '')
  }, [searchParams])

  const currentDesignationFilter = searchParams.get('designation') || ''

  const updateQueryParams = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    router.push(`/users?${params.toString()}`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateQueryParams({
      search: searchInput.trim() || null,
      page: '1' // Reset to first page on search
    })
  }

  const handleDesignationFilter = (id: string) => {
    updateQueryParams({
      designation: id || null,
      page: '1' // Reset to first page on filter change
    })
  }

  const handlePageChange = (newPage: number) => {
    updateQueryParams({
      page: newPage.toString()
    })
  }

  const toggleStatus = async (userId: string, currentStatus: boolean) => {
    setIsLoading(userId)
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
        toast.success(currentStatus ? 'User deactivated' : 'User activated')
      } else {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to update status')
      }
    } catch (err) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!userToDelete) return
    setIsLoading(userToDelete)
    try {
      const res = await fetch(`/api/users/${userToDelete}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userToDelete))
        toast.success('User permanently deleted')
      } else {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to delete user')
      }
    } catch (err) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(null)
      setUserToDelete(null)
    }
  }

  const handleRoleUpdate = (userId: string, newRole: UserRole) => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, role: newRole } : u
    ))
  }

  return (
    <>
      {/* Table Filters */}
      <div className="p-4 border-b border-gray-200 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by name or enrollment no..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
        </form>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <span className="text-xs font-black uppercase text-gray-400 tracking-widest whitespace-nowrap">Filter By Designation:</span>
          </div>
          <select
            value={currentDesignationFilter}
            onChange={(e) => handleDesignationFilter(e.target.value)}
            className="h-10 px-4 rounded-xl border border-gray-200 text-xs font-bold focus:ring-2 focus:ring-blue-100 outline-none bg-gray-50/50 min-w-[200px]"
          >
            <option value="">All Designations</option>
            {designations.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Enrollment</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Designation</th>
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
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs border border-gray-200 overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
                      ) : (
                        user.full_name.charAt(0)
                      )}
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
                  <span className="text-sm font-black text-blue-600 uppercase tracking-tighter">
                    {user.enrollment_no || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {isAdminOrAbove(currentUser.role) && user.id !== currentUser.id && user.role !== 'admin' ? (
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
                  <span className="text-sm font-bold text-gray-700">
                    {user.designation?.name || '-'}
                  </span>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                        <MoreVertical size={16} className="text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/users/${user.id}`} className="flex items-center gap-2 cursor-pointer">
                          <Eye size={14} />
                          <span>View Details</span>
                        </Link>
                      </DropdownMenuItem>
                      
                      {isAdminOrAbove(currentUser.role) && user.id !== currentUser.id && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => toggleStatus(user.id, user.is_active)}
                            disabled={isLoading === user.id}
                            className={user.is_active ? 'text-orange-600' : 'text-green-600'}
                          >
                            <User size={14} className="mr-2" />
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setUserToDelete(user.id)}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 size={14} className="mr-2" />
                            Delete Permanently
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="text-xs font-black uppercase text-gray-400 tracking-widest">
          Total: {totalCount} members
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white"
            >
              <ChevronLeft size={16} className="mr-1" /> Prev
            </Button>
            
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white"
            >
              Next <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <ShieldAlert size={24} />
              <AlertDialogTitle>Permanent Deletion</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone. 
              The user will be removed from both the database and authentication system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
