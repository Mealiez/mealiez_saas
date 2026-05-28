"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KeyRound, Download, Loader2, Search, Smartphone } from 'lucide-react'
import { toast } from 'sonner'

interface UserWithPassword {
  id: string
  full_name: string
  phone: string | null
  invited_temp_password: string | null
  created_at: string
}

export default function UserPasswordSettings() {
  const supabase = createClient()
  const [users, setUsers] = useState<UserWithPassword[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, phone, invited_temp_password, created_at')
        .eq('invite_method', 'phone')
        .not('invited_temp_password', 'is', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Failed to fetch user passwords', err)
      toast.error('Failed to load user passwords')
    } finally {
      setIsLoading(false)
    }
  }

  const exportToCSV = () => {
    if (users.length === 0) return
    setIsExporting(true)
    
    try {
      const headers = ['Full Name', 'Mobile Number', 'Temporary Password', 'Invited On']
      const rows = users.map(u => [
        u.full_name,
        u.phone || 'N/A',
        u.invited_temp_password || '',
        new Date(u.created_at).toLocaleString()
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `User-Mobile-Passwords-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Passwords exported successfully')
    } catch (err) {
      toast.error('Failed to export CSV')
    } finally {
      setIsExporting(false)
    }
  }

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (u.phone && u.phone.includes(search))
  )

  return (
    <Card className="border-none shadow-2xl shadow-blue-500/5 rounded-[2rem] overflow-hidden">
      <CardHeader className="bg-gray-50/50 border-b border-gray-50 px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <KeyRound size={18} className="text-blue-600" />
              Mobile User Passwords
            </CardTitle>
            <CardDescription className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
              Export temporary passwords for members invited via mobile
            </CardDescription>
          </div>
          <Button
            onClick={exportToCSV}
            disabled={isExporting || users.length === 0}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl font-black uppercase text-[10px] tracking-widest px-6"
          >
            {isExporting ? <Loader2 className="animate-spin mr-2" size={14} /> : <Download size={14} className="mr-2" />}
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-6 border-b border-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Member</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Mobile</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Temp Password</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Invited</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center">
                    <Loader2 className="animate-spin text-blue-600 mx-auto" size={24} />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                    No mobile-invited users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-8 py-4">
                      <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{user.full_name}</p>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                        <Smartphone size={12} className="text-gray-400" />
                        {user.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <code className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono font-bold">
                        {user.invited_temp_password}
                      </code>
                    </td>
                    <td className="px-8 py-4">
                      <p className="text-[10px] font-bold text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
