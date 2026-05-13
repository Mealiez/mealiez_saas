"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [method, setMethod] = useState<'link' | 'code' | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSend = async (selectedMethod: 'link' | 'code') => {
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email address first.' })
      return
    }

    setIsLoading(true)
    setMessage(null)
    setMethod(selectedMethod)

    const supabase = createClient()

    // Both methods use the same Supabase function, but we handle the UI differently
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setIsLoading(false)
    } else {
      if (selectedMethod === 'link') {
        setMessage({ 
          type: 'success', 
          text: 'A reset link has been sent to your email. Please click the link to reset your password.' 
        })
        setIsLoading(false)
      } else {
        setMessage({ 
          type: 'success', 
          text: 'A recovery code has been sent to your email. Redirecting you to enter the code...' 
        })
        setIsLoading(false)
        
        setTimeout(() => {
          router.push(`/reset-password?email=${encodeURIComponent(email)}`)
        }, 2000)
      }
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="space-y-6">
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

        <div className="grid grid-cols-1 gap-4">
          <div className="text-sm font-medium text-gray-700">Select Verification Method:</div>
          
          <button
            onClick={() => handleSend('link')}
            disabled={isLoading}
            className="flex flex-col items-start p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group disabled:opacity-50"
          >
            <span className="font-semibold text-gray-900 group-hover:text-indigo-700">Automatic Link-based</span>
            <span className="text-xs text-gray-500 mt-1">We'll email you a secure link to reset your password instantly.</span>
          </button>

          <button
            onClick={() => handleSend('code')}
            disabled={isLoading}
            className="flex flex-col items-start p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group disabled:opacity-50"
          >
            <span className="font-semibold text-gray-900 group-hover:text-indigo-700">Manual Code-based</span>
            <span className="text-xs text-gray-500 mt-1">Receive a recovery code via email to enter manually.</span>
          </button>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm border ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border-green-100' 
              : 'bg-red-50 text-red-600 border-red-100'
          }`}>
            {message.text}
          </div>
        )}

        {isLoading && (
          <div className="text-center text-sm text-gray-500 italic">
            Processing your request...
          </div>
        )}
      </div>
    </div>
  )
}
