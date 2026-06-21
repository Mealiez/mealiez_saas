'use client'

import { useState, useEffect } from 'react'
import { X, Download, Share, PlusSquare } from 'lucide-react'
import { installManager, type PwaPlatform } from './install-manager'
import { cn } from '@/lib/utils'

export function InstallPrompt() {
  const [isVisible, setIsVisible] = useState(false)
  const [showIosModal, setShowIosModal] = useState(false)
  const [platform, setPlatform] = useState<PwaPlatform>('other')
  const [isPromptSupported, setIsPromptSupported] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    setIsInstalled(installManager.isInstalled())
    setPlatform(installManager.getPlatform())
    setIsPromptSupported(installManager.isPromptSupported())
    setIsVisible(installManager.shouldShowBanner())

    const unsubscribe = installManager.subscribe(() => {
      setIsInstalled(installManager.isInstalled())
      setPlatform(installManager.getPlatform())
      setIsPromptSupported(installManager.isPromptSupported())
      setIsVisible(installManager.shouldShowBanner())
    })

    return unsubscribe
  }, [])

  // Track banner impression when it becomes visible
  useEffect(() => {
    if (isVisible) {
      installManager.trackAnalytics('install_prompt_shown')
    }
  }, [isVisible])

  const handleInstallClick = async () => {
    if (platform === 'ios') {
      setShowIosModal(true)
      installManager.trackAnalytics('ios_install_instructions_opened')
    } else {
      await installManager.triggerInstall()
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    installManager.dismiss()
  }

  if (isInstalled) return null
  if (!isVisible && !showIosModal) return null

  return (
    <>
      {/* Slide-up Banner */}
      {isVisible && (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-[360px] z-40 bg-white/95 backdrop-blur-md border border-gray-100 shadow-2xl rounded-[2rem] p-5 animate-in slide-in-from-bottom-8 duration-300 pb-safe">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <Download size={16} />
                </div>
                <h3 className="font-black text-xs uppercase tracking-widest text-gray-900">Install Mealiez App</h3>
              </div>
              <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                Add Mealiez to your home screen for instant access, live tracking, and offline support.
              </p>
            </div>
            <button 
              onClick={handleDismiss}
              className="text-gray-400 hover:bg-gray-50 active:scale-90 rounded-full p-1.5 transition-all shrink-0"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex gap-3 mt-4">
            <button 
              onClick={handleDismiss}
              className="flex-1 py-3 border border-gray-100 hover:bg-gray-50 text-gray-500 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
            >
              Later
            </button>
            <button 
              onClick={handleInstallClick}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-600/10 active:scale-95 transition-all"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {/* iOS Sharing Instruction Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div 
            className="w-full max-w-sm bg-white rounded-[2.5rem] p-6 shadow-2xl space-y-6 pb-8 animate-in slide-in-from-bottom-10 duration-300 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowIosModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:bg-gray-50 active:scale-90 rounded-full p-1.5 transition-all"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-2 pt-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mx-auto">
                <Share size={24} className="animate-bounce" />
              </div>
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Add to Home Screen</h3>
              <p className="text-[10px] text-gray-500 font-bold px-4 uppercase tracking-wider">
                Follow these simple steps to install Mealiez on your iOS device
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <p className="text-xs text-gray-700 font-bold leading-relaxed">
                  Tap the <span className="inline-flex items-center justify-center p-1 bg-white border border-gray-100 rounded-md mx-1 shadow-sm shrink-0"><Share size={12} className="text-blue-600" /></span> Share button in your Safari toolbar.
                </p>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <p className="text-xs text-gray-700 font-bold leading-relaxed">
                  Scroll down the share menu and select <span className="font-extrabold uppercase text-blue-600 tracking-tight flex items-center gap-1 inline-flex"><PlusSquare size={12} /> "Add to Home Screen"</span>.
                </p>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <p className="text-xs text-gray-700 font-bold leading-relaxed">
                  Tap <span className="font-extrabold uppercase text-blue-600 tracking-tight">"Add"</span> in the top-right corner to complete the installation.
                </p>
              </div>
            </div>

            <button 
              onClick={() => setShowIosModal(false)}
              className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all mt-4"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
