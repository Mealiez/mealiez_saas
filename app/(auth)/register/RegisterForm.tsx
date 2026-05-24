"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, ImageIcon, Mail, Loader2, Monitor, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function RegisterForm() {
  const router = useRouter()
  const supabase = createClient()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const [email, setEmail] = useState('')
  // ... rest
  // ... rest of state
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null)
  const [step, setStep] = useState<'details' | 'otp'>('details')
  const [otp, setOtp] = useState('')

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `logos/${fileName}`

      const { error: uploadError, data } = await supabase.storage
        .from('avatar')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatar')
        .getPublicUrl(filePath)

      setLogoUrl(publicUrl)
    } catch (err: any) {
      setError(err.message || 'Failed to upload logo')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setFieldErrors(null)

    try {
      const res = await fetch('/api/onboarding/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          org_name: orgName,
          logo_url: logoUrl
        }),
      })

      if (res.ok) {
        setStep('otp')
        return
      }

      if (res.status === 409) {
        setError('This email is already registered.')
      } else if (res.status === 400) {
        const data = await res.json()
        setFieldErrors(data.details?.fieldErrors ?? null)
        setError('Please fix the errors below.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/onboarding/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      })

      if (res.ok) {
        router.push('/login?registered=true')
        return
      }

      const data = await res.json()
      setError(data.error || 'Verification failed')
    } catch (err) {
      setError('Verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (isMobile) {
    return (
      <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/5 border border-gray-100 p-10 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center">
          <img src="/logo.png" alt="Mealiez" className="h-10 w-auto mb-6" />
          <div className="h-20 w-20 rounded-3xl bg-red-50 flex items-center justify-center text-red-600 shadow-inner mb-6">
            <Monitor size={40} />
          </div>
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Desktop Required</h2>
          <p className="text-xs font-bold text-gray-500 leading-relaxed uppercase tracking-tight mt-4">
            New organization setup and onboarding can only be completed on a desktop browser.
          </p>
        </div>

        <Link href="/login" className="flex items-center justify-center gap-2 text-blue-600 font-black uppercase text-[10px] tracking-widest hover:underline transition-all">
          <ArrowLeft size={14} /> Back to Login
        </Link>
      </div>
    )
  }

  if (step === 'otp') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
         <div className="mb-6">
            <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <Mail size={32} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Verify Email</h2>
            <p className="text-sm text-gray-500 mt-2">
              We've sent a 6-digit code to <strong>{email}</strong>
            </p>
         </div>

         {error && (
            <div className="mb-6 p-4 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
               {error}
            </div>
         )}

         <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
               <input 
                 type="text" 
                 required
                 maxLength={6}
                 placeholder="000000"
                 value={otp}
                 onChange={e => setOtp(e.target.value)}
                 className="w-full text-center text-3xl font-black tracking-[0.5em] py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
               />
            </div>
            <Button 
               type="submit" 
               disabled={isLoading}
               className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20"
            >
               {isLoading ? <Loader2 className="animate-spin" size={24} /> : 'Verify & Create Account'}
            </Button>
            <button 
              type="button" 
              onClick={() => setStep('details')}
              className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors"
            >
               Wrong email? Go back
            </button>
         </form>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/5 border border-gray-100 p-10">
      <div className="flex flex-col items-center mb-10">
        <img src="/logo.png" alt="Mealiez" className="h-10 w-auto mb-4" />
        <div className="h-1 w-8 bg-blue-600 rounded-full mb-4"></div>
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.4em]">Onboarding</h2>
      </div>

      {error && (
        <div className="mb-6 p-4 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Logo Upload Section */}
        <div className="flex flex-col items-center mb-6">
          <label className="block text-sm font-black text-gray-400 uppercase tracking-widest mb-4 w-full">
            Organization Logo
          </label>
          <div className="relative group">
            <div className="h-24 w-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-300">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo Preview" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="text-gray-300" size={32} />
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            {logoUrl && (
              <button
                type="button"
                onClick={() => setLogoUrl(null)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-sm hover:bg-red-600 transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-tight">Click to upload logo (optional)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            placeholder="John Doe"
          />
          {fieldErrors?.full_name && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.full_name[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Organization / Mess Name
          </label>
          <input
            type="text"
            required
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            placeholder="My Awesome Mess"
          />
          {fieldErrors?.org_name && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.org_name[0]}</p>
          )}
        </div>

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
          {fieldErrors?.email && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.email[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            placeholder="••••••••"
          />
          {fieldErrors?.password && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.password[0]}</p>
          )}
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
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-600 font-medium hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  )
}
