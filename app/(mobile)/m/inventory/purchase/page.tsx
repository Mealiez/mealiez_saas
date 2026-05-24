'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DualBarcodeScanner } from '@/components/inventory/DualBarcodeScanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Plus, Minus, Loader2 } from 'lucide-react'

type ScannedProduct = {
  id: string
  product_name: string
  brand: string | null
  package_size: number | null
  unit: string | null
  category: string | null
} | null

export default function MobilePurchaseEntryPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'manual' | 'barcode'>('barcode')
  
  const [qty, setQty] = useState(1)
  const [totalPrice, setTotalPrice] = useState<number | ''>('')
  const [expiryDate, setExpiryDate] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [vendorId, setVendorId] = useState('')
  
  const [isScanning, setIsScanning] = useState(false)
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // State for manual entry if product not found
  const [manualName, setManualName] = useState('')
  const [manualUnit, setManualUnit] = useState('kg')
  const [barcodeNotFound, setBarcodeNotFound] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState('')

  const handleScan = async (barcode: string) => {
    setIsScanning(false)
    setIsSearching(true)
    setScannedBarcode(barcode)
    
    // Look up in product catalog
    const { data, error } = await supabase
      .from('product_catalog')
      .select('id, product_name, brand, package_size, unit, category')
      .eq('barcode', barcode)
      .single()

    if (data) {
      setScannedProduct(data)
      setBarcodeNotFound(false)
    } else {
      setScannedProduct(null)
      setBarcodeNotFound(true)
      setActiveTab('manual') // Switch to manual to let them enter it
    }
    
    setIsSearching(false)
  }

  const handleConfirmIntake = async () => {
    if (!qty || !totalPrice) return alert("Please enter quantity and price.")
    
    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single()
      if (!profile?.tenant_id) throw new Error("No tenant found")

      // 1. Create Purchase Entry
      const { data: entry, error: entryErr } = await supabase
        .from('purchase_entries')
        .insert({
          tenant_id: profile.tenant_id,
          purchase_status: 'RECEIVED',
          total_amount: Number(totalPrice),
          invoice_date: new Date().toISOString().split('T')[0],
          created_by: user.id
        })
        .select()
        .single()
        
      if (entryErr) throw entryErr

      // 2. We need an inventory_item_id.
      // If we scanned a catalog item, we need to ensure it exists in tenant's inventory_items.
      // For simplicity in this demo, we'll try to find an active inventory_item with the same name, or create one.
      let inventoryItemId = ''
      const itemName = scannedProduct?.product_name || manualName
      const itemUnit = scannedProduct?.unit || manualUnit

      if (!itemName) throw new Error("Product name required")

      const { data: existingItem } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .ilike('name', itemName)
        .single()

      if (existingItem) {
        inventoryItemId = existingItem.id
      } else {
        const { data: newItem, error: newErr } = await supabase
          .from('inventory_items')
          .insert({
            tenant_id: profile.tenant_id,
            name: itemName,
            unit: itemUnit,
            category: scannedProduct?.category || 'General',
            min_stock_level: 5 // Default
          })
          .select()
          .single()
        if (newErr) throw newErr
        inventoryItemId = newItem.id
      }

      // 3. Create Purchase Entry Item
      const { error: itemErr } = await supabase
        .from('purchase_entry_items')
        .insert({
          purchase_entry_id: entry.id,
          inventory_item_id: inventoryItemId,
          quantity: qty,
          unit: itemUnit,
          purchase_price: Number(totalPrice) / qty, // price per unit
          batch_number: batchNumber || null,
          expiry_date: expiryDate || null
        })

      if (itemErr) throw itemErr

      // Note: Because status='RECEIVED', Supabase triggers/RPC might auto-create batches.
      // But for UI feedback:
      alert("Intake successful!")
      router.push('/inventory')

    } catch (e: any) {
      console.error(e)
      alert("Failed to confirm intake: " + e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
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
            {!isScanning && !scannedProduct && !isSearching && (
              <Button onClick={() => setIsScanning(true)} className="w-full h-32 flex flex-col items-center justify-center border-dashed border-2 bg-muted/30 hover:bg-muted/50 rounded-xl text-muted-foreground" variant="outline">
                <span className="mb-2">Tap to scan barcode</span>
              </Button>
            )}

            {isScanning && (
              <DualBarcodeScanner 
                onScan={handleScan} 
                onClose={() => setIsScanning(false)} 
              />
            )}

            {isSearching && (
              <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            )}

            {/* Found Product Data */}
            {scannedProduct && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 space-y-1">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Detected Product</p>
                    <button onClick={() => setScannedProduct(null)} className="text-xs text-muted-foreground underline">Clear</button>
                  </div>
                  <h3 className="font-semibold text-lg">{scannedProduct.product_name}</h3>
                  <div className="text-sm text-muted-foreground grid grid-cols-2 gap-1">
                    <span>Brand: {scannedProduct.brand || 'Unknown'}</span>
                    <span>Size: {scannedProduct.package_size} {scannedProduct.unit}</span>
                    <span className="col-span-2">Category: {scannedProduct.category}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Form Fields */}
        <div className="p-4 space-y-5">
          {activeTab === 'manual' && barcodeNotFound && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded-lg mb-4">
              Barcode {scannedBarcode} not found in catalog. Please enter product details manually.
            </div>
          )}

          {(!scannedProduct && activeTab === 'manual') && (
            <>
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input 
                  placeholder="e.g. Basmati Rice" 
                  value={manualName} 
                  onChange={e => setManualName(e.target.value)} 
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit of Measurement</Label>
                <Input 
                  placeholder="e.g. kg, L, pcs" 
                  value={manualUnit} 
                  onChange={e => setManualUnit(e.target.value)} 
                  className="h-12 rounded-xl"
                />
              </div>
            </>
          )}

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
            <Input 
              type="number" 
              placeholder="₹0.00" 
              value={totalPrice}
              onChange={e => setTotalPrice(parseFloat(e.target.value) || '')}
              className="h-12 text-lg rounded-xl" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input 
                type="date" 
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="h-12 rounded-xl" 
              />
            </div>
            <div className="space-y-2">
              <Label>Batch Number</Label>
              <Input 
                placeholder="Optional" 
                value={batchNumber}
                onChange={e => setBatchNumber(e.target.value)}
                className="h-12 rounded-xl" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <Button 
          className="w-full h-14 text-lg font-semibold rounded-xl" 
          size="lg"
          onClick={handleConfirmIntake}
          disabled={isSubmitting || (activeTab === 'manual' && !manualName && !scannedProduct)}
        >
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm Intake'}
        </Button>
      </div>
    </div>
  )
}
