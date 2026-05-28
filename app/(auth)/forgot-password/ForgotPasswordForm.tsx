"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Phone as PhoneIcon, Loader2 } from 'lucide-react'

export default function ForgotPasswordForm() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [method, setMethod] = useState<'email' | 'phone'>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [recoveryType, setRecoveryType] = useState<'link' | 'code' | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSend = async (selectedType: 'link' | 'code') => {
    if (!identifier) {
      setMessage({ type: 'error', text: `Please enter your ${method === 'email' ? 'email' : 'mobile number'} first.` })
      return
    }

    setIsLoading(true)
    setMessage(null)
    setRecoveryType(selectedType)

    // Map phone to synthetic email if needed
    const authEmail = method === 'email'
      ? identifier
      : `${identifier.replace(/[^\d+]/g, '')}@mobile.mealiez.in`

    const endpoint = selectedType === 'link' 
      ? '/api/auth/send-reset-link' 
      : '/api/auth/send-otp'

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: authEmail }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send recovery information')
      }

      if (selectedType === 'link') {
        setMessage({ 
          type: 'success', 
          text: `A reset link has been sent to your ${method === 'email' ? 'email' : 'registered account'}. Please check to reset your password.` 
        })
        setIsLoading(false)
      } else {
        setMessage({ 
          type: 'success', 
          text: `A recovery code has been sent. Redirecting you to enter the code...` 
        })
        setIsLoading(false)
        
        setTimeout(() => {
          router.push(`/reset-password?email=${encodeURIComponent(authEmail)}`)
        }, 2000)
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
            {method === 'email' ? 'Email Address' : 'Mobile Number'}
          </label>
          <div className="relative">
            {method === 'email' ? (
              <>
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                <input
                  type="email"
                  required
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
              setMethod(prev => prev === 'email' ? 'phone' : 'email')
              setIdentifier('')
              setMessage(null)
            }}
            className="mt-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
          >
            {method === 'email' ? (
              <><PhoneIcon size={10} /> Use Mobile Recovery</>
            ) : (
              <><Mail size={10} /> Use Email Recovery</>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Verification Method:</div>
          
          <button
            onClick={() => handleSend('link')}
            disabled={isLoading}
            className="flex flex-col items-start p-4 border border-gray-100 bg-gray-50/50 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left group disabled:opacity-50"
          >
            <span className="text-xs font-black text-gray-900 uppercase tracking-tight group-hover:text-blue-700 flex items-center gap-2">
              Automatic Link-based
              {isLoading && recoveryType === 'link' && <Loader2 className="animate-spin" size={12} />}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mt-1 group-hover:text-blue-600">We'll send a secure link to reset your password instantly.</span>
          </button>

          <button
            onClick={() => handleSend('code')}
            disabled={isLoading}
            className="flex flex-col items-start p-4 border border-gray-100 bg-gray-50/50 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left group disabled:opacity-50"
          >
            <span className="text-xs font-black text-gray-900 uppercase tracking-tight group-hover:text-blue-700 flex items-center gap-2">
              Manual Code-based
              {isLoading && recoveryType === 'code' && <Loader2 className="animate-spin" size={12} />}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mt-1 group-hover:text-blue-600">Receive a recovery code to enter manually.</span>
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-xs font-bold border ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border-green-100' 
              : 'bg-red-50 text-red-600 border-red-100'
          }`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}
