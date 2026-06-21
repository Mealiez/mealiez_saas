'use client'

import { useState, useEffect } from 'react'
import { X, Download, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const isPwa = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    setIsStandalone(isPwa)

    if (isPwa) return;

    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    const checkVisibility = () => {
      const dismissed = localStorage.getItem('pwa_prompt_dismissed')
      const isDev = process.env.NODE_ENV === 'development'
      const searchParams = new URLSearchParams(window.location.search)
      const forceShow = searchParams.get('pwa-force-prompt') === 'true'
      
      if (isDev || forceShow || !dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setIsVisible(true)
      }
    }

    const globalPrompt = (window as any).deferredBeforeInstallPrompt
    if (globalPrompt) {
      setDeferredPrompt(globalPrompt)
      checkVisibility()
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      checkVisibility()
    }

    const handleCustomPrompt = (e: Event) => {
      const customEvent = e as CustomEvent<BeforeInstallPromptEvent>
      if (customEvent.detail) {
        setDeferredPrompt(customEvent.detail)
        checkVisibility()
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('d-beforeinstallprompt', handleCustomPrompt)
    
    if (isIosDevice) {
      const dismissed = localStorage.getItem('pwa_prompt_dismissed')
      const isDev = process.env.NODE_ENV === 'development'
      if (isDev || !dismissed) {
        const timer = setTimeout(() => {
          setIsVisible(true)
        }, 3000)
        return () => {
          clearTimeout(timer)
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
          window.removeEventListener('d-beforeinstallprompt', handleCustomPrompt)
        }
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('d-beforeinstallprompt', handleCustomPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsVisible(false)
      }
      setDeferredPrompt(null)
    }
  }

  const dismiss = () => {
    setIsVisible(false)
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString())
  }

  if (!isVisible || isStandalone) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:w-96 bg-white border shadow-lg rounded-xl p-4 flex gap-4 items-start animate-in slide-in-from-bottom-5">
      <div className="flex-1">
        <h3 className="font-semibold text-sm text-gray-900">Install Mealiez App</h3>
        <p className="text-xs text-gray-500 mt-1">
          {deferredPrompt ? (
            'Install our app for faster access, offline support, and push notifications.'
          ) : isIOS ? (
            <>Tap <Share className="inline w-3 h-3 mx-1" /> then "Add to Home Screen" for a native experience.</>
          ) : (
            'Install our app for faster access, offline support, and push notifications.'
          )}
        </p>
        {deferredPrompt && (
          <Button size="sm" onClick={handleInstall} className="mt-3 w-full bg-gray-900 text-white">
            <Download className="w-4 h-4 mr-2" /> Install
          </Button>
        )}
      </div>
      <button onClick={dismiss} className="text-gray-400 hover:bg-gray-100 rounded-full p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
