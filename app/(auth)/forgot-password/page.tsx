import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import ForgotPasswordForm from './ForgotPasswordForm'
import Link from 'next/link'

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Forgot Password</h1>
        <p className="text-gray-600 mt-2">
          Enter your email to receive a password recovery code
        </p>
      </div>
      
      <ForgotPasswordForm />
      
      <div className="mt-6 text-center text-sm text-gray-600">
        Remembered your password?{' '}
        <Link href="/login" className="text-indigo-600 font-medium hover:underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  )
}
