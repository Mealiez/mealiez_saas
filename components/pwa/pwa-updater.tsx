'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'

export function PwaUpdater() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    let registration: ServiceWorkerRegistration | null = null

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      registration = reg

      // Check for update on initial registration
      reg.update().catch((err) => console.warn('[PWA] Initial update check failed:', err))

      const handleUpdateFound = () => {
        const newWorker = reg.installing
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
                duration: 15000,
              })
            }
          })
        }
      }

      reg.addEventListener('updatefound', handleUpdateFound)

      // If there is already a waiting worker, show the update toast immediately
      if (reg.waiting && navigator.serviceWorker.controller) {
        const waitingWorker = reg.waiting
        toast('New version available!', {
          description: 'A new update for Mealiez is waiting to be applied.',
          action: {
            label: 'Refresh',
            onClick: () => {
              waitingWorker.postMessage({ type: 'SKIP_WAITING' })
              window.location.reload()
            }
          },
          duration: 15000,
        })
      }
    })

    // Handle controller change (reload to apply new SW)
    let refreshing = false
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    }
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    // Check for updates when window gains focus
    const handleFocus = () => {
      if (registration) {
        registration.update().catch((err) => console.warn('[PWA] Focus update check failed:', err))
      }
    }
    window.addEventListener('focus', handleFocus)

    // Check for updates periodically (every 5 minutes)
    const intervalId = setInterval(() => {
      if (registration) {
        registration.update().catch((err) => console.warn('[PWA] Periodic update check failed:', err))
      }
    }, 1000 * 60 * 5)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      window.removeEventListener('focus', handleFocus)
      clearInterval(intervalId)
    }
  }, [])

  // Check for updates when the user navigates to a new page
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update().catch((err) => console.warn('[PWA] Route change update check failed:', err))
      })
    }
  }, [pathname])

  return null
}
