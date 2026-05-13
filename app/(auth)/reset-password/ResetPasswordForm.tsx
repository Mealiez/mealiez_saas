"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEmail = searchParams.get('email') || ''
  const initialCode = searchParams.get('code') || '' // Sometimes provided in links
  
  const [email, setEmail] = useState(initialEmail)
  const [otp, setOtp] = useState(initialCode)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSessionValid, setIsSessionValid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    // Check if the user is already authenticated via a reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsSessionValid(true)
      }
    }
    checkSession()
  }, [supabase.auth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      setIsLoading(false)
      return
    }

    // 1. If we don't have a valid session yet, we must verify the OTP first
    if (!isSessionValid) {
      if (!email) {
        setError('Email is required for code verification.')
        setIsLoading(false)
        return
      }
      
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery',
      })

      if (verifyError) {
        setError(verifyError.message)
        setIsLoading(false)
        return
      }
    }

    // 2. Update the password (works if session is valid from verifyOtp or from link)
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      setError(updateError.message)
      setIsLoading(false)
      return
    }

    setSuccess(true)
    setIsLoading(false)
    
    // Sign out to force clean login with new password
    await supabase.auth.signOut()
    
    setTimeout(() => {
      router.push('/login')
    }, 3000)
  }

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-green-600 font-medium mb-4">
          Password updated successfully!
        </div>
        <p className="text-sm text-gray-600">
          Redirecting you to the login page...
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        {isSessionValid ? (
          <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100 mb-4">
            Session verified via link. You can now set your new password.
          </div>
        ) : (
          <>
            {!initialEmail && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                current password (OTP Code)
              </label>
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="Enter the code from your email"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            new passwprd
          </label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            confirm password
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-50"
        >
          {isLoading ? 'Updating...' : 'Reset Password'}
        </button>
      </form>
    </div>
  )
}
