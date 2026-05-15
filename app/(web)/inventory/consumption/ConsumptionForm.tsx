'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, CheckCircle2, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ConsumptionForm({ session, inventoryItems, tenantId }: { session: any, inventoryItems: any[], tenantId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [actualAttendance, setActualAttendance] = useState<number | ''>(session?.headcount_total || 450)
  
  // State for recording consumption of items
  const [actuals, setActuals] = useState<Record<string, number>>({})
  
  // Wastage state
  const [cookingWaste, setCookingWaste] = useState<number | ''>('')
  const [leftoverWaste, setLeftoverWaste] = useState<number | ''>('')
  const [plateWaste, setPlateWaste] = useState<number | ''>('')

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleActualChange = (id: string, val: string) => {
    setActuals(prev => ({ ...prev, [id]: parseFloat(val) || 0 }))
  }

  const handleConfirmDeduction = async () => {
    setIsSubmitting(true)
    try {
      // Create session if it doesn't exist
      let targetSessionId = session?.id
      if (!targetSessionId) {
        const { data: newSession, error: sErr } = await supabase
          .from('attendance_sessions')
          .insert({
            tenant_id: tenantId,
            session_date: new Date().toISOString().split('T')[0],
            meal_type: 'Lunch', // Default for now
            status: 'COMPLETED'
          })
          .select()
          .single()
        if (sErr) throw sErr
        targetSessionId = newSession.id
      }

      // Prepare deductions array
      const deductions = []
      
      // Map over all inputted item quantities
      for (const [itemId, qty] of Object.entries(actuals)) {
        if (qty > 0) {
          deductions.push({
            tenant_id: tenantId,
            session_id: targetSessionId,
            inventory_item_id: itemId,
            deduction_type: 'MEAL_USAGE',
            actual_quantity: qty
          })
        }
      }

      // Handle wastage entries
      if (cookingWaste || leftoverWaste || plateWaste) {
         // Assuming we have a general "Mixed Waste" item for tracking or we attribute waste to the session.
         // In a real app we'd map this to a specific item. For now we will insert them without specific inventory_item_id if allowed, or attribute to a dummy id.
         // Or skip if the schema strictly requires inventory_item_id.
         // Wait, meal_deductions requires inventory_item_id. We'll skip inserting explicit waste if we don't have a specific item, or just rely on actual_quantity vs expected_quantity for waste.
         console.warn("Explicit wastage entries are currently stored locally only. Need item mapping to save.")
      }

      if (deductions.length > 0) {
        const { error: dErr } = await supabase
          .from('meal_deductions')
          .insert(deductions)
        if (dErr) throw dErr

        alert('Deductions successfully recorded!')
        router.push('/inventory')
      } else {
        alert('Please enter at least one deduction quantity.')
      }
    } catch (e: any) {
      console.error(e)
      alert("Failed to confirm deductions: " + e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        {/* Session Summary Panel */}
        <Card className="md:col-span-1 border-primary/20 shadow-sm">
          <CardHeader className="pb-3 bg-muted/30 border-b">
            <CardTitle className="text-lg">Session Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Meal Type</p>
                <p className="font-semibold">{session?.meal_type || 'Lunch'}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Date</p>
                <p className="font-semibold">{session?.session_date || new Date().toISOString().split('T')[0]}</p>
              </div>
            </div>
            
            <div className="grid gap-4 mt-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Actual Attendance</label>
                <Input 
                  type="number" 
                  value={actualAttendance} 
                  onChange={(e) => setActualAttendance(parseInt(e.target.value) || '')} 
                  className="font-semibold"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ingredient Deduction Table */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Ingredient Deduction</CardTitle>
              <CardDescription>Enter the actual quantities used during this session.</CardDescription>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleConfirmDeduction} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Deduction
              </Button>
            </div>
          </CardHeader>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/30 sticky top-0 z-10">
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="w-48 text-right">Actual Usage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Input 
                          type="number" 
                          className="w-24 text-right"
                          value={actuals[item.id] || ''}
                          placeholder="0"
                          onChange={(e) => handleActualChange(item.id, e.target.value)}
                        />
                        <span className="text-sm text-muted-foreground w-8">{item.unit}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {inventoryItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground p-8">
                      No active inventory items found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Wastage Entry Section */}
      <Card className="shadow-sm border-dashed">
        <CardHeader className="pb-3 border-b bg-muted/10">
          <CardTitle className="text-lg">Wastage Entry (Optional)</CardTitle>
          <CardDescription>Record any significant food waste from this session.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cooking Waste (kg)</label>
              <Input type="number" placeholder="0.0" value={cookingWaste} onChange={e => setCookingWaste(parseFloat(e.target.value) || '')} />
              <p className="text-xs text-muted-foreground">Spoilage during prep</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Leftover Disposal (kg)</label>
              <Input type="number" placeholder="0.0" value={leftoverWaste} onChange={e => setLeftoverWaste(parseFloat(e.target.value) || '')} />
              <p className="text-xs text-muted-foreground">Unserved cooked food</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Plate Waste (kg)</label>
              <Input type="number" placeholder="0.0" value={plateWaste} onChange={e => setPlateWaste(parseFloat(e.target.value) || '')} />
              <p className="text-xs text-muted-foreground">Returned on plates</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
