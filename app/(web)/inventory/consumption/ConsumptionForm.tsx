"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, AlertTriangle, Loader2, RefreshCcw, Save, Activity, Lock, Unlock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import RecipeAssignment from './RecipeAssignment'

export default function ConsumptionForm({ initialSession, inventoryItems, tenantId }: { initialSession: any, inventoryItems: any[], tenantId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [session, setSession] = useState(initialSession)
  const [isRealtime, setIsRealtime] = useState(false)
  
  const [requirements, setRequirements] = useState<any[]>([])
  const [loadingReqs, setLoadingReqs] = useState(false)
  const [actuals, setActuals] = useState<Record<string, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const actualAttendance = session?.actual_attendance || 0
  const expectedAttendance = session?.expected_attendance || 0
  const variance = actualAttendance - expectedAttendance
  const completionPct = expectedAttendance > 0 ? Math.round((actualAttendance / expectedAttendance) * 100) : 0

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
      
      // Update actuals with expected values only for new items
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

  // Realtime Attendance Sync
  useEffect(() => {
    if (!session?.id) return

    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendance_sessions',
          filter: `id=eq.${session.id}`
        },
        (payload) => {
          console.log('Session Update Received:', payload.new)
          setSession((prev: any) => ({ ...prev, ...payload.new }))
        }
      )
      .subscribe((status) => {
        setIsRealtime(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id])

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

  const handleFinalizeAttendance = async () => {
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('attendance_sessions')
        .update({ 
          status: 'finalized',
          is_active: false 
        })
        .eq('id', session.id)
      
      if (error) throw error
      await refreshSession()
    } catch (e: any) {
      alert("Failed to finalize attendance: " + e.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleActualChange = (id: string, val: string) => {
    setActuals(prev => ({ ...prev, [id]: parseFloat(val) || 0 }))
  }

  const handleConfirmDeduction = async () => {
    if (session.status !== 'finalized') {
      alert("Attendance must be finalized before processing deductions.")
      return
    }

    setIsSubmitting(true)
    try {
      // 1. Update session status
      await supabase
        .from('attendance_sessions')
        .update({ status: 'deduction_completed' })
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

  const isLocked = session.status === 'deduction_completed'
  const canDeduct = session.status === 'finalized'
  const isLive = session.status === 'attendance_live' || session.status === 'pending'

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Sidebar - Session Controls */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        <Card className="shadow-sm border-primary/20">
          <CardHeader className="pb-3 bg-muted/30 border-b flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Session Intelligence</CardTitle>
            {isRealtime ? (
              <div className="flex items-center gap-2">
                {!session.is_active ? (
                  <>
                    <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
                      <Lock className="h-3 w-3 mr-1" />
                      Session Closed
                    </Badge>
                    <Badge variant="outline" className="text-slate-400 bg-slate-50 border-slate-200 text-[10px]">
                      <Activity className="h-3 w-3 mr-1" />
                      Sync Idle
                    </Badge>
                  </>
                ) : (
                  <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 animate-pulse text-[10px]">
                    <Activity className="h-3 w-3 mr-1" />
                    Live Sync
                  </Badge>
                )}
              </div>
            ) : (
              <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200 text-[10px]">
                <RefreshCcw className="h-3 w-3 mr-1" />
                Connecting
              </Badge>
            )}
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1 font-bold uppercase text-[10px]">Meal Type</p>
                <p className="font-semibold capitalize">{session?.meal_type}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 font-bold uppercase text-[10px]">Date</p>
                <p className="font-semibold">{session?.session_date}</p>
              </div>
            </div>

            <div className="p-4 bg-muted/20 rounded-xl space-y-3">
               <div className="flex justify-between items-end">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Actual Attendance</p>
                      {!session.is_active && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">CLOSED</span>
                      )}
                    </div>
                    <p className="text-3xl font-black">{actualAttendance}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Expected</p>
                    <p className="text-lg font-semibold">{expectedAttendance}</p>
                  </div>
               </div>
               
               <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-500" 
                    style={{ width: `${Math.min(completionPct, 100)}%` }} 
                  />
               </div>

               <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className={variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {variance > 0 ? '+' : ''}{variance} Variance
                  </span>
                  <span className="text-muted-foreground">{completionPct}% Complete</span>
               </div>
            </div>

            {isLive && (
              <Button 
                variant="outline" 
                className="w-full border-primary/30 text-primary hover:bg-primary/5"
                onClick={handleFinalizeAttendance}
                disabled={isSubmitting || actualAttendance === 0}
              >
                <Lock className="h-4 w-4 mr-2" />
                Finalize Attendance
              </Button>
            )}

            {session.status === 'finalized' && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 text-xs flex gap-2">
                <Unlock className="h-4 w-4 shrink-0" />
                <p>Attendance finalized. Review ingredient variance and confirm inventory deduction below.</p>
              </div>
            )}

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
              <CardDescription>
                {isLocked 
                  ? "Deduction completed. Ledger events created." 
                  : "Review expected quantities derived from live attendance."}
              </CardDescription>
            </div>
            <Button 
              className="shadow-lg shadow-primary/20" 
              onClick={handleConfirmDeduction}
              disabled={isSubmitting || loadingReqs || requirements.length === 0 || !canDeduct || isLocked}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {isLocked ? 'Deduction Recorded' : 'Finalize Deductions'}
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
                          disabled={isLocked}
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
                      Assign recipes to calculate requirements.
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
        {requirements.some(r => !r.stock_sufficient) && !isLocked && (
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
