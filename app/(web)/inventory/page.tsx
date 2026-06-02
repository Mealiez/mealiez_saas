import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StockOverview from './StockOverview'
import LowStockAlerts from './LowStockAlerts'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Barcode, ClipboardList, AlertCircle, PackageOpen, History } from 'lucide-react'

/**
 * FILE 1: app/(web)/inventory/page.tsx
 */
export default async function InventoryPage() {
  const user = await requireAuth()

  // ROLE-BASED AUTH: Only manager+ can access inventory
  if (user.role === 'member') {
    redirect('/dashboard');
  }

  const supabase = await createClient()

  // Fetch stock overview via RPC
  const { data: stockData } = await supabase
    .rpc('get_stock_overview', {
      p_tenant_id: user.tenant_id
    })

  // Fetch inventory summary via new RPC
  const { data: summaryData } = await supabase
    .rpc('get_inventory_summary', {
      p_tenant_id: user.tenant_id
    })
  
  const invSummary = summaryData?.[0] || {
    total_value: 0,
    out_of_stock_count: 0,
    low_stock_count: 0,
    expiring_soon_count: 0
  }

  // Fetch active alerts
  const { data: alerts } = await supabase
    .from('inventory_alerts')
    .select(`
      id, alert_type, current_stock,
      min_stock_level, created_at,
      inventory_items ( name, unit )
    `)
    .eq('is_dismissed', false)
    .order('created_at', { ascending: false })
    .limit(10)

  // Fetch proactive shortage forecast
  const { data: shortageData } = await supabase
    .rpc('run_shortage_forecast', {
      p_tenant_id: user.tenant_id,
      p_days: 30
    })

  // Fetch today's meal cost
  const today = new Date().toISOString().split('T')[0]
  const { data: todayDeductions } = await supabase
    .from('meal_deductions')
    .select('cost_amount, attendance_sessions!inner(session_date)')
    .eq('tenant_id', user.tenant_id)
    .eq('attendance_sessions.session_date', today)

  const mealCost = todayDeductions?.reduce((acc: number, val: any) => acc + (val.cost_amount || 0), 0) || 0

  const canManage = ['admin', 'manager'].includes(user.role)
  const canAdmin = user.role === 'admin'
  const hasInventory = stockData && stockData.length > 0;

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory Operations Dashboard</h1>
          <p className="text-muted-foreground">Kitchen operations intelligence</p>
        </div>
        {canAdmin && (
          <Link href="/inventory/items">
            <Button variant="outline">Manage Catalog</Button>
          </Link>
        )}
      </div>

      {/* Top Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${invSummary.total_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Estimated across all items</p>
          </CardContent>
        </Card>
        
        <Card className="border-amber-100 bg-amber-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              {invSummary.low_stock_count + invSummary.out_of_stock_count}
            </div>
            <p className="text-xs text-amber-600">Action recommended</p>
          </CardContent>
        </Card>

        <Card className="border-red-100 bg-red-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Expiring Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{invSummary.expiring_soon_count}</div>
            <p className="text-xs text-red-600">Within next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Meal Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${mealCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Based on consumption</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Link href="/m/inventory/purchase" className="flex flex-col items-center justify-center p-6 bg-primary/5 border hover:bg-primary/10 transition-colors rounded-xl gap-2 text-primary font-medium">
            <Plus className="h-6 w-6" />
            <span>Add Purchase</span>
          </Link>
          <Link href="/m/inventory/purchase" className="flex flex-col items-center justify-center p-6 bg-card border hover:bg-accent transition-colors rounded-xl gap-2 font-medium">
            <Barcode className="h-6 w-6 text-muted-foreground" />
            <span>Scan Barcode</span>
          </Link>
          <Link href="/inventory/consumption" className="flex flex-col items-center justify-center p-6 bg-card border hover:bg-accent transition-colors rounded-xl gap-2 font-medium">
            <ClipboardList className="h-6 w-6 text-muted-foreground" />
            <span>Record Usage</span>
          </Link>
          <Link href="/inventory" className="flex flex-col items-center justify-center p-6 bg-card border hover:bg-accent transition-colors rounded-xl gap-2 font-medium">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <span>View Expiry</span>
          </Link>
          <Link href="/inventory/purchases" className="flex flex-col items-center justify-center p-6 bg-card border hover:bg-accent transition-colors rounded-xl gap-2 font-medium">
            <History className="h-6 w-6 text-muted-foreground" />
            <span>Tx History</span>
          </Link>
        </div>
      </div>

      {/* Forecast Summary */}
      {hasInventory && shortageData && shortageData.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Forecast Summary</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {shortageData.slice(0, 3).map((item: any) => {
              const isHealthy = item.alert_level === 'HEALTHY'
              const isWarning = item.alert_level === 'WARNING'
              const isCritical = item.alert_level === 'CRITICAL'
              
              const borderClass = isCritical ? 'border-l-red-500' : isWarning ? 'border-l-amber-500' : 'border-l-green-500'
              const badgeClass = isCritical ? 'bg-red-100 text-red-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
              
              const stockoutText = item.days_remaining > 990 
                ? 'Sufficient' 
                : `${item.days_remaining} days left`

              return (
                <Card key={item.inventory_item_id} className={`border-l-4 ${borderClass}`}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{item.item_name}</h3>
                        <p className="text-sm text-muted-foreground">{item.current_stock} {item.unit} current</p>
                      </div>
                      <span className={`${badgeClass} text-xs px-2 py-1 rounded-full font-medium capitalize`}>
                        {item.alert_level.toLowerCase()}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm mt-4">
                      <div className="flex justify-between"><span>Avg Usage:</span> <span className="font-medium">{item.avg_daily_consumption.toFixed(2)} {item.unit}/day</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>Stockout:</span> <span>{stockoutText}</span></div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {alerts && alerts.length > 0 && (
        <LowStockAlerts initialAlerts={alerts as any[]} />
      )}

      {hasInventory ? (
        <StockOverview 
          initialStock={stockData ?? []} 
          canManage={canManage} 
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 border rounded-xl border-dashed bg-muted/30">
          <PackageOpen className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-semibold">No Inventory Found</h3>
          <p className="text-muted-foreground max-w-sm text-center mt-2 mb-6">
            Your inventory is currently empty. Start by adding a purchase or scanning a barcode to build your catalog.
          </p>
          <div className="flex gap-4">
            <Link href="/m/inventory/purchase">
              <Button>Add First Purchase</Button>
            </Link>
            {canAdmin && (
              <Link href="/inventory/items">
                <Button variant="outline">Set Up Catalog First</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
