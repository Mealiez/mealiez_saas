"use client"

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Mail, Phone as PhoneIcon, Loader2 } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isRegistered = searchParams.get('registered') === 'true'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    // Map phone to synthetic email if needed
    const authIdentifier = loginMethod === 'email'
      ? identifier
      : `${identifier.replace(/[^\d+]/g, '')}@mobile.mealiez.in`

    const { error } = await supabase.auth.signInWithPassword({
      email: authIdentifier,
      password,
    })

    if (error) {
      if (error.message.includes('Invalid login')) {
        setError(`Incorrect ${loginMethod === 'email' ? 'email' : 'mobile'} or password.`)
      } else if (error.message.includes('Email not confirmed')) {
        setError('Please verify your email first.')
      } else {
        setError('Sign in failed. Please try again.')
      }
      setIsLoading(false)
      return
    }

    // Success: Get user role and decide redirect
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) throw new Error('Auth failed')

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', authUser.id)
        .single()

      const isMobile = window.innerWidth < 768
      const role = profile?.role

      if (isMobile && role === 'admin') {
        setError('It is not accessible, use desktop')
        await supabase.auth.signOut()
        setIsLoading(false)
        return
      }

      if (isMobile && (role === 'member' || role === 'manager')) {
        router.push('/m/home')
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } catch (err) {
      // Fallback
      router.push('/dashboard')
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/5 border border-gray-100 p-10">
      <div className="flex flex-col items-center mb-10">
        <img src="/logo.png" alt="Mealiez" className="h-10 w-auto mb-4" />
        <div className="h-1 w-8 bg-blue-600 rounded-full mb-4"></div>
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.4em]">Secure Access</h2>
      </div>

      {isRegistered && (
        <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-700 rounded-lg text-sm font-bold uppercase tracking-tight">
          Account created! Please sign in.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
            {loginMethod === 'email' ? 'Email Address' : 'Mobile Number'}
          </label>
          <div className="relative">
            {loginMethod === 'email' ? (
              <>
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                  placeholder="you@example.com"
                />
              </>
            ) : (
              <>
                <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                  placeholder="e.g. +91 98765 43210"
                />
              </>
            )}
          </div>
          
          <button
            type="button"
            onClick={() => {
              setLoginMethod(prev => prev === 'email' ? 'phone' : 'email')
              setIdentifier('')
              setError(null)
            }}
            className="mt-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
          >
            {loginMethod === 'email' ? (
              <><PhoneIcon size={10} /> Use Mobile Login</>
            ) : (
              <><Mail size={10} /> Use Email Login</>
            )}
          </button>
        </div>

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
            Password
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
            placeholder="••••••••"
          />
        </div>

        <div className="flex items-center justify-end">
          <Link
            href="/forgot-password"
            className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
          >
            Forgot Password?
          </Link>
        </div>

        {error && (
          <div className="text-red-600 text-xs font-bold bg-red-50 p-4 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              <span>Signing in...</span>
            </div>
          ) : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
