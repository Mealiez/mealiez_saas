"use client"

import { useState } from 'react'

interface FeatureToggleProps {
  tenantId: string
  featureKey: string
  initialEnabled: boolean
}

export default function FeatureToggle({ tenantId, featureKey, initialEnabled }: FeatureToggleProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleToggle = async () => {
    const newValue = !isEnabled
    setIsUpdating(true)

    try {
      const res = await fetch('/api/super/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          feature_key: featureKey,
          is_enabled: newValue
        })
      })

      if (res.ok) {
        setIsEnabled(newValue)
      } else {
        alert('Failed to update feature flag')
      }
    } catch (err) {
      console.error(err)
      alert('Error updating feature flag')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isUpdating}
      className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        isEnabled ? 'bg-indigo-600' : 'bg-gray-700'
      } ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          isEnabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
