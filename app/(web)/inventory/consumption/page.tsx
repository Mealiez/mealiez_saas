import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import ConsumptionForm from './ConsumptionForm'
import { Card, CardContent } from '@/components/ui/card'
import { Info } from 'lucide-react'

export default async function MealConsumptionPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // 1. Get today's attendance session
  const today = new Date().toISOString().split('T')[0]
  let { data: sessions } = await supabase
    .from('attendance_sessions')
    .select(`
      *,
      session_recipes (
        id,
        recipe_id,
        recipes (
          id,
          name
        )
      )
    `)
    .eq('tenant_id', user.tenant_id)
    .eq('session_date', today)
    .limit(1)

  const session = sessions && sessions.length > 0 ? sessions[0] : null

  // 2. Fetch inventory items for manual addition if needed
  const { data: inventoryItems } = await supabase
    .from('inventory_items')
    .select('id, name, unit')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meal Session Consumption</h1>
          <p className="text-muted-foreground">Track actual ingredient usage and record wastage.</p>
        </div>
      </div>

      {!session && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6 flex gap-3 text-amber-800">
            <Info className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <p className="font-bold">No active session found for today.</p>
              <p>Please create or start a meal session in the Meals section before recording consumption.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {session && (
        <ConsumptionForm 
          initialSession={session}
          inventoryItems={inventoryItems || []}
          tenantId={user.tenant_id}
        />
      )}
    </div>
  )
}
