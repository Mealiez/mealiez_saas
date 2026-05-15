'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Camera, Flashlight, Plus, Minus } from 'lucide-react'

export default function MobilePurchaseEntryPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'manual' | 'barcode'>('barcode')
  const [qty, setQty] = useState(1)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1">Stock Intake</h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b px-4 pt-2">
        <button 
          className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'manual' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
          onClick={() => setActiveTab('manual')}
        >
          Manual Entry
        </button>
        <button 
          className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'barcode' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
          onClick={() => setActiveTab('barcode')}
        >
          Barcode Scan
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'barcode' && (
          <div className="p-4 space-y-4">
            {/* Barcode Scanner Overlay Shell */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
              <div className="absolute inset-4 border-2 border-primary/50 border-dashed rounded-lg"></div>
              <Camera className="h-12 w-12 text-white/50" />
              <button className="absolute top-4 right-4 p-2 bg-black/40 rounded-full text-white backdrop-blur-sm">
                <Flashlight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-sm animate-pulse">
                Align barcode within frame
              </div>
            </div>

            {/* Auto-filled mock data */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 space-y-1">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Detected Product</p>
                <h3 className="font-semibold text-lg">Aashirvaad Whole Wheat Atta</h3>
                <div className="text-sm text-muted-foreground grid grid-cols-2 gap-1">
                  <span>Brand: Aashirvaad</span>
                  <span>Size: 10 kg</span>
                  <span className="col-span-2">Category: Staples</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Form Fields */}
        <div className="p-4 space-y-5">
          <div className="space-y-2">
            <Label>Quantity Purchased</Label>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setQty(Math.max(1, qty - 1))} className="h-12 w-12 rounded-xl">
                <Minus className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <Input 
                  type="number" 
                  value={qty} 
                  onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                  className="h-12 text-center text-lg font-semibold rounded-xl"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => setQty(qty + 1)} className="h-12 w-12 rounded-xl">
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Purchase Price (Total)</Label>
            <Input type="number" placeholder="₹0.00" className="h-12 text-lg rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Batch Number</Label>
              <Input placeholder="Optional" className="h-12 rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vendor</Label>
            <Input placeholder="Select Vendor..." className="h-12 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <Button className="w-full h-14 text-lg font-semibold rounded-xl" size="lg">
          Confirm Intake
        </Button>
      </div>
    </div>
  )
}
