"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface MessPlanBadgeProps {
  tenantId: string
  currentPlan: string
}

export default function MessPlanBadge({ tenantId, currentPlan }: MessPlanBadgeProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [plan, setPlan] = useState(currentPlan)

  const handlePlanChange = async (newPlan: string) => {
    if (newPlan === plan) return
    
    setIsUpdating(true)
    try {
      const res = await fetch('/api/super/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, plan: newPlan })
      })

      if (res.ok) {
        setPlan(newPlan)
        router.refresh()
      } else {
        alert('Failed to update plan')
      }
    } catch (err) {
      console.error(err)
      alert('Error updating plan')
    } finally {
      setIsUpdating(false)
    }
  }

  const getPlanColor = (p: string) => {
    switch (p) {
      case 'trial': return 'bg-gray-800 text-gray-400 border-gray-700'
      case 'starter': return 'bg-blue-900/30 text-blue-400 border-blue-800'
      case 'pro': return 'bg-indigo-900/30 text-indigo-400 border-indigo-800'
      case 'enterprise': return 'bg-purple-900/30 text-purple-400 border-purple-800'
      default: return 'bg-gray-800 text-gray-400 border-gray-700'
    }
  }

  return (
    <div className="relative inline-block">
      <select
        value={plan}
        disabled={isUpdating}
        onChange={(e) => handlePlanChange(e.target.value)}
        className={`appearance-none px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer focus:outline-none transition-all pr-8 capitalize ${getPlanColor(plan)} ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
      >
        <option value="trial">Trial</option>
        <option value="starter">Starter</option>
        <option value="pro">Pro</option>
        <option value="enterprise">Enterprise</option>
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        {isUpdating ? (
          <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
    </div>
  )
}
