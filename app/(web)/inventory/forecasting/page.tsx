import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import ForecastingCharts from './ForecastingCharts'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PackageSearch } from 'lucide-react'

export default async function ForecastingDashboardPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Fetch proactive shortage forecast
  const { data: shortageData, error } = await supabase
    .rpc('run_shortage_forecast', {
      p_tenant_id: user.tenant_id,
      p_days: 30
    })

  // Fetch recent meal deductions for costing and wastage trends
  const { data: recentDeductions } = await supabase
    .from('meal_deductions')
    .select(`
      id, deduction_type, actual_quantity, cost_amount,
      attendance_sessions ( session_date )
    `)
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })
    .limit(500)

  // Process data for charts
  const depletionData = (shortageData || [])
    .filter((d: any) => d.days_remaining !== 999) // exclude infinite
    .slice(0, 5) // top 5 critical
    .map((d: any) => ({
      name: d.item_name,
      days: d.days_remaining,
      stock: d.current_stock
    }))

  // Aggregate cost by date
  const costingMap: Record<string, number> = {}
  let totalWastage = 0
  let totalUsage = 0

  if (recentDeductions) {
    recentDeductions.forEach((d: any) => {
      const date = d.attendance_sessions?.session_date || 'Unknown'
      if (d.deduction_type === 'MEAL_USAGE') {
        costingMap[date] = (costingMap[date] || 0) + (d.cost_amount || 0)
        totalUsage += d.actual_quantity || 0
      } else if (d.deduction_type === 'WASTAGE') {
        totalWastage += d.actual_quantity || 0
      }
    })
  }

  const mealCostingData = Object.keys(costingMap)
    .sort()
    .map(date => ({ date, cost: costingMap[date] }))

  const wastageData = [
    { name: 'Usage', kg: totalUsage },
    { name: 'Wastage', kg: totalWastage },
  ]

  const actionsRequired = (shortageData || []).filter((d: any) => d.alert_level === 'CRITICAL' || d.alert_level === 'WARNING')

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory Forecasting</h1>
          <p className="text-muted-foreground">Proactive procurement and operational analytics.</p>
        </div>
        <Button>Generate PO</Button>
      </div>

      {/* Procurement Recommendation Panel */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <PackageSearch className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">Action Required: Procurement Recommendations</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Based on current consumption trends, the following items require immediate restocking:
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {actionsRequired.length > 0 ? (
                  actionsRequired.map((item: any) => (
                     <span key={item.inventory_item_id} className={`px-3 py-1 bg-background rounded-full text-sm font-medium border shadow-sm ${item.alert_level === 'CRITICAL' ? 'border-red-300 text-red-700' : 'border-amber-300 text-amber-700'}`}>
                        {item.item_name} → {item.recommended_purchase}{item.unit}
                     </span>
                  ))
                ) : (
                  <span className="text-sm font-medium text-green-700">All inventory levels are healthy.</span>
                )}
              </div>
            </div>
          </div>
          {actionsRequired.length > 0 && <Button variant="default" className="shrink-0">Review Purchase Order</Button>}
        </CardContent>
      </Card>

      {/* Charts Grid - Rendered on Client */}
      <ForecastingCharts 
        depletionData={depletionData} 
        mealCostingData={mealCostingData.length ? mealCostingData : [{ date: 'Today', cost: 0 }]}
        wastageData={wastageData}
      />
    </div>
  )
}
