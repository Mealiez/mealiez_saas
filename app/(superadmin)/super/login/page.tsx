import { getSuperAdminUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import SuperLoginForm from './SuperLoginForm'

export default async function SuperLoginPage() {

  // If already logged in as super admin, redirect to dashboard
  const superUser = await getSuperAdminUser()
  if (superUser) redirect('/super/dashboard')

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">
            MEALIEZ PLATFORM
          </p>
          <h1 className="text-3xl font-bold text-white">
            Super Admin
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            Restricted access. Authorized personnel only.
          </p>
        </div>
        <SuperLoginForm />
      </div>
    </div>
  )
}
