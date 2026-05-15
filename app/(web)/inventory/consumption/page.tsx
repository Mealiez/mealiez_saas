import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import ConsumptionForm from './ConsumptionForm'

export default async function MealConsumptionPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // 1. Get today's attendance session (or create mock for UI purposes if none exists today)
  const today = new Date().toISOString().split('T')[0]
  let { data: sessions } = await supabase
    .from('attendance_sessions')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .eq('session_date', today)
    .limit(1)

  // 2. Fetch inventory items to deduct from
  const { data: inventoryItems } = await supabase
    .from('inventory_items')
    .select('id, name, unit, min_stock_level')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meal Session Consumption</h1>
          <p className="text-muted-foreground">Track actual ingredient usage and record wastage.</p>
        </div>
      </div>

      <ConsumptionForm 
        session={sessions && sessions.length > 0 ? sessions[0] : null}
        inventoryItems={inventoryItems || []}
        tenantId={user.tenant_id}
      />
    </div>
  )
}
