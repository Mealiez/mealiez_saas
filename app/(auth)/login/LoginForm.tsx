"use client"

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isRegistered = searchParams.get('registered') === 'true'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message.includes('Invalid login')) {
        setError('Incorrect email or password.')
      } else if (error.message.includes('Email not confirmed')) {
        setError('Please verify your email first.')
      } else {
        setError('Sign in failed. Please try again.')
      }
      setIsLoading(false)
      return
    }

    // Success: navigate to dashboard
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/5 border border-gray-100 p-10">
      <div className="flex flex-col items-center mb-10">
        <img src="/logo.png" alt="Mealiez" className="h-10 w-auto mb-4" />
        <div className="h-1 w-8 bg-blue-600 rounded-full mb-4"></div>
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.4em]">Secure Access</h2>
      </div>

      {isRegistered && (
        <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-700 rounded-lg text-sm">
          Account created! Please sign in.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            placeholder="••••••••"
          />
        </div>

        <div className="flex items-center justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-indigo-600 hover:underline font-medium"
          >
            Forgot Password?
          </Link>
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
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
