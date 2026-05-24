import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import ResetPasswordForm from './ResetPasswordForm'
import { Suspense } from 'react'

export default async function ResetPasswordPage() {
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reset Password</h1>
        <p className="text-gray-600 mt-2">
          Enter the recovery code sent to your email and your new password
        </p>
      </div>
      
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
