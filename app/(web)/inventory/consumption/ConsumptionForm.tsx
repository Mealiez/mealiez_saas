"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, CheckCircle2, AlertTriangle, Loader2, RefreshCcw, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import RecipeAssignment from './RecipeAssignment'

export default function ConsumptionForm({ initialSession, inventoryItems, tenantId }: { initialSession: any, inventoryItems: any[], tenantId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [session, setSession] = useState(initialSession)
  const [actualAttendance, setActualAttendance] = useState<number>(session?.actual_attendance || session?.expected_attendance || 0)
  
  const [requirements, setRequirements] = useState<any[]>([])
  const [loadingReqs, setLoadingReqs] = useState(false)
  const [actuals, setActuals] = useState<Record<string, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchRequirements = async () => {
    if (!session?.id) return
    setLoadingReqs(true)
    try {
      const { data, error } = await supabase.rpc('calculate_session_requirements', {
        p_session_id: session.id,
        p_servings: actualAttendance
      })
      if (error) throw error
      setRequirements(data || [])
      
      // Initialize actuals with expected values if not already set
      const newActuals = { ...actuals }
      data?.forEach((req: any) => {
        if (newActuals[req.inventory_item_id] === undefined) {
          newActuals[req.inventory_item_id] = req.total_with_waste
        }
      })
      setActuals(newActuals)
    } catch (err) {
      console.error('Failed to fetch requirements:', err)
    } finally {
      setLoadingReqs(false)
    }
  }

  useEffect(() => {
    fetchRequirements()
  }, [session.id, actualAttendance])

  const refreshSession = async () => {
    const { data } = await supabase
      .from('attendance_sessions')
      .select('*, session_recipes(*, recipes(*))')
      .eq('id', session.id)
      .single()
    if (data) setSession(data)
  }

  const handleActualChange = (id: string, val: string) => {
    setActuals(prev => ({ ...prev, [id]: parseFloat(val) || 0 }))
  }

  const handleConfirmDeduction = async () => {
    setIsSubmitting(true)
    try {
      // 1. Update actual attendance in session
      await supabase
        .from('attendance_sessions')
        .update({ actual_attendance: actualAttendance, status: 'COMPLETED' })
        .eq('id', session.id)

      // 2. Prepare deductions
      const deductions = requirements.map(req => ({
        tenant_id: tenantId,
        session_id: session.id,
        inventory_item_id: req.inventory_item_id,
        expected_quantity: req.total_with_waste,
        actual_quantity: actuals[req.inventory_item_id] || 0,
        unit: req.unit,
        deduction_type: 'MEAL_USAGE'
      }))

      if (deductions.length > 0) {
        const { error: dErr } = await supabase
          .from('meal_deductions')
          .insert(deductions)
        if (dErr) throw dErr

        alert('Deductions successfully recorded!')
        router.push('/inventory')
      } else {
        alert('No ingredients to deduct.')
      }
    } catch (e: any) {
      console.error(e)
      alert("Failed to confirm deductions: " + e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Sidebar - Session Controls */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        <Card className="shadow-sm border-primary/20">
          <CardHeader className="pb-3 bg-muted/30 border-b">
            <CardTitle className="text-lg">Session Intelligence</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1 font-bold uppercase text-[10px]">Meal Type</p>
                <p className="font-semibold">{session?.meal_type}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 font-bold uppercase text-[10px]">Date</p>
                <p className="font-semibold">{session?.session_date}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Actual Attendance</label>
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  value={actualAttendance} 
                  onChange={(e) => setActualAttendance(parseInt(e.target.value) || 0)} 
                  className="font-bold text-lg h-12"
                />
                <Button variant="outline" className="h-12" onClick={fetchRequirements}>
                  <RefreshCcw className={`h-4 w-4 ${loadingReqs ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                * Expected: {session?.expected_attendance || 0}
              </p>
            </div>

            <hr />

            <RecipeAssignment 
              sessionId={session.id} 
              tenantId={tenantId} 
              assignedRecipes={session.session_recipes || []}
              onUpdate={refreshSession}
            />
          </CardContent>
        </Card>

        {/* Totals Summary */}
        <Card className="bg-primary/5 border-primary/10 shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Ingredients</span>
                <span className="text-xl font-bold">{requirements.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Shortages</span>
                <span className={`text-xl font-bold ${requirements.some(r => !r.stock_sufficient) ? 'text-red-500' : 'text-green-500'}`}>
                  {requirements.filter(r => !r.stock_sufficient).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Area - Expected Consumption */}
      <div className="col-span-12 lg:col-span-8 space-y-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between bg-muted/10">
            <div>
              <CardTitle className="text-lg">Operational Review</CardTitle>
              <CardDescription>Review expected quantities and adjust based on actual kitchen usage.</CardDescription>
            </div>
            <Button 
              className="shadow-lg shadow-primary/20" 
              onClick={handleConfirmDeduction}
              disabled={isSubmitting || loadingReqs || requirements.length === 0}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Finalize Deductions
            </Button>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="text-right">Expected (+Waste)</TableHead>
                  <TableHead className="w-32 text-right">Actual Usage</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Stock Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requirements.map((req) => {
                  const actual = actuals[req.inventory_item_id] || 0
                  const variance = actual - req.total_with_waste
                  const isShortage = !req.stock_sufficient

                  return (
                    <TableRow key={req.inventory_item_id} className={isShortage ? 'bg-red-50/30' : ''}>
                      <TableCell>
                        <div className="font-medium">{req.item_name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{req.unit}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {req.total_with_waste.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          step="0.001"
                          className="h-8 text-right font-bold"
                          value={actual}
                          onChange={(e) => handleActualChange(req.inventory_item_id, e.target.value)}
                        />
                      </TableCell>
                      <TableCell className={`text-right font-mono font-medium ${variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {variance > 0 ? '+' : ''}{variance.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className={`text-xs font-bold ${isShortage ? 'text-red-600' : 'text-green-600'}`}>
                            {isShortage ? 'Insufficient' : 'In Stock'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Avail: {req.current_stock.toFixed(1)} {req.unit}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {requirements.length === 0 && !loadingReqs && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">
                      Assign recipes and set attendance to calculate requirements.
                    </TableCell>
                  </TableRow>
                )}
                {loadingReqs && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 opacity-20" />
                      Recalculating engine...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Warning Indicators */}
        {requirements.some(r => !r.stock_sufficient) && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 flex gap-3 text-red-800">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="text-sm">
                <p className="font-bold">Inventory Shortage Detected</p>
                <p>Some ingredients required for this session exceed current stock levels. Deductions will result in negative stock if confirmed.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
