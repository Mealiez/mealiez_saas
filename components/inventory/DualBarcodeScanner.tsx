'use client'

import React, { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning'
import WebBarcodeScanner from 'react-qr-barcode-scanner'
import { Button } from '@/components/ui/button'
import { Camera, Flashlight, FlashlightOff, X } from 'lucide-react'

interface DualBarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose?: () => void
}

export function DualBarcodeScanner({ onScan, onClose }: DualBarcodeScannerProps) {
  const [isNative, setIsNative] = useState<boolean>(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  useEffect(() => {
    const isNativePlatform = Capacitor.isNativePlatform()
    setIsNative(isNativePlatform)

    if (isNativePlatform) {
      checkNativePermissions()
    } else {
      setHasPermission(true) // Assuming browser will ask
      setIsScanning(true)
    }

    return () => {
      if (isNativePlatform && isScanning) {
        stopNativeScan()
      }
    }
  }, [])

  const checkNativePermissions = async () => {
    try {
      const { camera } = await BarcodeScanner.checkPermissions()
      if (camera === 'granted') {
        setHasPermission(true)
        startNativeScan()
      } else {
        const { camera: newStatus } = await BarcodeScanner.requestPermissions()
        setHasPermission(newStatus === 'granted')
        if (newStatus === 'granted') {
          startNativeScan()
        }
      }
    } catch (e) {
      console.error('Error checking native permissions', e)
      setHasPermission(false)
    }
  }

  const startNativeScan = async () => {
    try {
      setIsScanning(true)
      document.body.classList.add('bg-transparent') // Important for native scanner
      
      const _listener = await BarcodeScanner.addListener('barcodesScanned', async result => {
        const barcode = result.barcodes[0]
        if (barcode?.displayValue) {
          await stopNativeScan()
          onScan(barcode.displayValue)
        }
      })

      await BarcodeScanner.startScan()
    } catch (e) {
      console.error('Error starting native scan', e)
    }
  }

  const stopNativeScan = async () => {
    try {
      document.body.classList.remove('bg-transparent')
      await BarcodeScanner.stopScan()
      await BarcodeScanner.removeAllListeners()
      setIsScanning(false)
    } catch (e) {
      console.error('Error stopping native scan', e)
    }
  }

  const toggleTorch = async () => {
    if (isNative) {
      await BarcodeScanner.toggleTorch()
      setTorchOn(!torchOn)
    }
  }

  if (hasPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-xl">
        <Camera className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold">Camera Access Denied</h3>
        <p className="text-sm text-muted-foreground text-center mt-2 mb-4">
          Please enable camera permissions in your settings to scan barcodes.
        </p>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    )
  }

  return (
    <div className="relative aspect-[4/5] sm:aspect-video bg-black rounded-xl overflow-hidden flex flex-col items-center justify-center">
      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
        <div className="w-64 h-48 sm:w-80 sm:h-64 border-2 border-primary/50 border-dashed rounded-xl relative">
           <div className="absolute top-1/2 left-0 right-0 border-b-2 border-red-500/50 animate-pulse"></div>
        </div>
        <div className="absolute bottom-6 text-center text-white/80 text-sm font-medium px-4 py-2 bg-black/40 rounded-full backdrop-blur-md">
          Align barcode within frame
        </div>
      </div>

      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        {isNative && (
          <button 
            onClick={toggleTorch}
            className="p-3 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-sm transition-colors"
          >
            {torchOn ? <FlashlightOff className="h-5 w-5" /> : <Flashlight className="h-5 w-5" />}
          </button>
        )}
        {onClose && (
          <button 
            onClick={() => {
              if (isNative) stopNativeScan()
              onClose()
            }}
            className="p-3 bg-black/40 hover:bg-black/60 rounded-full text-white backdrop-blur-sm transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Actual Scanner */}
      {!isNative && isScanning && (
         <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden">
           <WebBarcodeScanner
             onUpdate={(err: any, result: any) => {
               if (result) {
                 onScan(result.getText())
               }
             }}
             width="100%"
             height="100%"
           />
         </div>
      )}
      
      {/* Native Scanner Placeholder (The actual camera view renders behind the webview) */}
      {isNative && (
        <div className="absolute inset-0 bg-transparent"></div>
      )}
    </div>
  )
}
