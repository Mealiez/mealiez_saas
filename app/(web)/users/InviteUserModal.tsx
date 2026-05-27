"use client"

import { useState, useEffect } from 'react'
import { InviteUserSchema } from '@/lib/validations/users'
import { type UserRole, getAssignableRoles, ROLE_LABELS } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/client'
import { UserCircle, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Branch {
  id: string
  name: string
}

interface Designation {
  id: string
  name: string
}

interface InviteUserModalProps {
  currentUserRole: UserRole
}

export default function InviteUserModal({ currentUserRole }: InviteUserModalProps) {
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [designations, setDesignations] = useState<Designation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null)

  const assignableRoles = getAssignableRoles(currentUserRole)

  const [form, setForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: assignableRoles[0] || 'member' as UserRole,
    branch_id: '',
    designation_id: '',
    avatar_url: ''
  })

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatar')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatar')
        .getPublicUrl(filePath)

      setForm(prev => ({ ...prev, avatar_url: publicUrl }))
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload avatar')
    } finally {
      setIsUploading(false)
    }
  }

  // Fetch branches and designations
  useEffect(() => {
    if (isOpen) {
      // Branches
      fetch('/api/branches')
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            setBranches(data.data)
            if (data.data.length > 0 && !form.branch_id) {
              setForm(prev => ({ ...prev, branch_id: data.data[0].id }))
            }
          }
        })
        .catch(err => console.error('Failed to fetch branches', err))

      // Designations
      fetch('/api/settings/designations')
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            setDesignations(data.data)
          }
        })
        .catch(err => console.error('Failed to fetch designations', err))
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setFieldErrors(null)
    setSuccess(null)

    const result = InviteUserSchema.safeParse(form)
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors)
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          designation_id: form.designation_id || null,
          branch_id: form.branch_id || null
        })
      })

      const data = await res.json()

      if (res.status === 201) {
        setSuccess(`Invitation sent to ${form.email}`)
        setForm({ 
          email: '', 
          full_name: '', 
          phone: '', 
          role: assignableRoles[0] || 'member',
          branch_id: branches[0]?.id || '',
          designation_id: '',
          avatar_url: ''
        })
        setTimeout(() => {
          setIsOpen(false)
          setSuccess(null)
        }, 2000)
      } else if (res.status === 409) {
        setError('This user is already in your team')
      } else if (res.status === 403) {
        setError('You do not have permission')
      } else if (res.status === 400) {
        setFieldErrors(data.details?.fieldErrors || null)
        setError(data.error || 'Validation failed')
      } else {
        setError('Something went wrong. Try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all active:scale-95"
      >
        Invite Member
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200 relative">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Invite Member</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Add a new teammate to your organization</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors">&times;</button>
            </div>

            {error && (
              <div className="mb-6 p-4 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 text-xs font-bold text-green-600 bg-green-50 border border-green-100 rounded-xl">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Avatar Upload */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center overflow-hidden">
                    {form.avatar_url ? (
                      <img src={form.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle className="text-gray-200" size={40} />
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Loader2 className="animate-spin text-blue-600" size={16} />
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900 uppercase">Profile Photo</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mt-0.5">Click to upload avatar</p>
                  {form.avatar_url && (
                    <button 
                      type="button" 
                      onClick={() => setForm(prev => ({ ...prev, avatar_url: '' }))}
                      className="text-[10px] font-black text-red-500 uppercase mt-1 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                />
                {fieldErrors?.full_name && <p className="mt-1.5 text-[10px] font-bold text-red-500 ml-1">{fieldErrors.full_name[0]}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="member@organization.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                />
                {fieldErrors?.email && <p className="mt-1.5 text-[10px] font-bold text-red-500 ml-1">{fieldErrors.email[0]}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Role</label>
                  <select
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value as UserRole })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                  >
                    {assignableRoles.map(role => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                </div>

                {branches.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Branch</label>
                    <select
                      required
                      value={form.branch_id}
                      onChange={e => setForm({ ...form, branch_id: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                    >
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {designations.length > 0 && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Designation</label>
                  <select
                    value={form.designation_id}
                    onChange={e => setForm({ ...form, designation_id: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                  >
                    <option value="">Select Designation</option>
                    {designations.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || isUploading}
                  className="px-8 py-3 text-xs font-black uppercase tracking-widest text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
