import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ChevronLeft, User, Mail, Phone, Calendar, Shield, MapPin, Activity } from 'lucide-react'
import UserBadge from '@/components/web/UserBadge'
import UserAttendanceLogs from '@/components/web/UserAttendanceLogs'

async function UserDetails({ id }: { id: string }) {
  const supabase = await createClient()
  
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      *,
      tenants (name),
      branches (name)
    `)
    .eq('id', id)
    .single()

  if (error || !user) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">User not found or you don't have access.</p>
        <Button asChild className="mt-4">
          <Link href="/users">Back to Users</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-xl border border-gray-100 shadow-sm">
          <Link href="/users">
            <ChevronLeft size={20} />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase leading-none">User Profile</h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-2">Member Administration & Audit Trail</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Profile Card & Badge */}
        <div className="space-y-8 lg:col-span-1">
          <Card className="shadow-sm border-gray-100 overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
            <CardHeader className="pb-4">
              <div className="flex flex-col items-center text-center">
                <div className="h-24 w-24 rounded-full bg-blue-50 border-4 border-white shadow-md flex items-center justify-center text-blue-600 font-black text-3xl mb-4 uppercase">
                  {user.full_name.charAt(0)}
                </div>
                <CardTitle className="text-xl font-bold uppercase tracking-tight">{user.full_name}</CardTitle>
                <Badge variant="outline" className="mt-2 capitalize font-black text-[10px] tracking-widest px-3 py-1 bg-gray-50 border-gray-200">
                  {user.role}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 border-t border-gray-50 bg-gray-50/30">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-gray-400 uppercase tracking-widest">Status</span>
                <span className={user.is_active ? "text-green-700 font-black uppercase tracking-tighter" : "text-red-700 font-black uppercase tracking-tighter"}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-gray-400 uppercase tracking-widest">Mess</span>
                <span className="text-gray-900 font-black uppercase tracking-tighter">{user.tenants?.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-gray-400 uppercase tracking-widest">Branch</span>
                <span className="text-gray-900 font-black uppercase tracking-tighter">{user.branches?.name || 'Unassigned'}</span>
              </div>
            </CardContent>
          </Card>

          <UserBadge user={user} />
        </div>

        {/* Right Column: Detailed Info & Attendance Logs */}
        <div className="space-y-8 lg:col-span-2">
          <Card className="shadow-sm border-gray-100 overflow-hidden">
            <CardHeader className="border-b border-gray-50 bg-gray-50/50">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <User size={18} className="text-blue-600" />
                Member Information
              </CardTitle>
              <CardDescription className="text-xs font-black uppercase tracking-widest text-gray-400">Personal and technical details for internal records</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-8 p-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <Phone size={12} className="text-blue-500" />
                  Phone Number
                </div>
                <p className="text-sm font-bold text-gray-900">{user.phone || 'Not provided'}</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <Calendar size={12} className="text-blue-500" />
                  Joined Date
                </div>
                <p className="text-sm font-bold text-gray-900">{new Date(user.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <Shield size={12} className="text-blue-500" />
                  System ID
                </div>
                <p className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded select-all">{user.id}</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <Shield size={12} className="text-blue-500" />
                  Auth ID
                </div>
                <p className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded select-all">{user.auth_id}</p>
              </div>
            </CardContent>
          </Card>

          <UserAttendanceLogs userId={user.id} authId={user.auth_id} />
        </div>
      </div>
    </div>
  )
}

export default async function Page({ params }: { params: { id: string } }) {
  const currentUser = await getCurrentUser()
  if (!currentUser) redirect('/login')

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded-2xl" />}>
        <UserDetails id={params.id} />
      </Suspense>
    </div>
  )
}
