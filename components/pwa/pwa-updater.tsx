'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export function PwaUpdater() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New update available (Vercel deployment)
                toast('New version available!', {
                  description: 'A new update for Mealiez has been installed.',
                  action: {
                    label: 'Refresh',
                    onClick: () => {
                      newWorker.postMessage({ type: 'SKIP_WAITING' })
                      window.location.reload()
                    }
                  },
                  duration: 10000,
                })
              }
            })
          }
        })
      })

      // Handle controller change (reload to apply new SW)
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true
          window.location.reload()
        }
      })
    }
  }, [])

  return null
}
