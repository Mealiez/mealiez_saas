import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import StockOverview from './StockOverview'
import LowStockAlerts from './LowStockAlerts'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * FILE 1: app/(web)/inventory/page.tsx
 */
export default async function InventoryPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Fetch stock overview via RPC
  const { data: stockData } = await supabase
    .rpc('get_stock_overview', {
      p_tenant_id: user.tenant_id
    })

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

  // Build summary counts
  const summary = {
    total: stockData?.length ?? 0,
    out_of_stock: stockData?.filter(
      (r: any) => r.stock_status === 'out_of_stock'
    ).length ?? 0,
    low_stock: stockData?.filter(
      (r: any) => r.stock_status === 'low_stock'
    ).length ?? 0,
    ok: stockData?.filter(
      (r: any) => r.stock_status === 'ok'
    ).length ?? 0,
  }

  const canManage = ['admin', 'manager'].includes(user.role) // ← UPDATED: owner removed
  const canAdmin = user.role === 'admin' // ← UPDATED: owner removed

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">Track stock levels and movements</p>
        </div>
        {canAdmin && (
          <Link href="/inventory/items">
            <Button variant="outline">Manage Items</Button>
          </Link>
        )}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Total Items</p>
          <p className="text-2xl font-bold">{summary.total}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm border-red-100 bg-red-50/50">
          <p className="text-sm font-medium text-red-600">Out of Stock</p>
          <p className="text-2xl font-bold text-red-700">{summary.out_of_stock}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm border-amber-100 bg-amber-50/50">
          <p className="text-sm font-medium text-amber-600">Low Stock</p>
          <p className="text-2xl font-bold text-amber-700">{summary.low_stock}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm border-green-100 bg-green-50/50">
          <p className="text-sm font-medium text-green-600">Healthy</p>
          <p className="text-2xl font-bold text-green-700">{summary.ok}</p>
        </div>
      </div>

      {alerts && alerts.length > 0 && (
        <LowStockAlerts initialAlerts={alerts as any[]} />
      )}

      <StockOverview 
        initialStock={stockData ?? []} 
        canManage={canManage} 
      />
    </div>
  )
}
