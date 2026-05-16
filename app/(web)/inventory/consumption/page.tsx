import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import ConsumptionForm from './ConsumptionForm'
import ConsumptionHistory from './ConsumptionHistory'
import { Card, CardContent } from '@/components/ui/card'
import { Info, Utensils, History } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function MealConsumptionPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Fetch all relevant sessions for categorization
  // Ordered by date descending
  const { data: allSessions } = await supabase
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
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false })

  // Categorize sessions
  const activeSessions = allSessions?.filter(s => 
    s.status === 'pending' || s.status === 'attendance_live'
  ) || []

  const historySessions = allSessions?.filter(s => 
    s.status === 'finalized' || s.status === 'deduction_completed'
  ) || []

  // Fetch inventory items for manual addition if needed
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
          <p className="text-muted-foreground">Monitor live attendance and manage ingredient deductions.</p>
        </div>
      </div>

      <Tabs defaultValue="present" className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2 mb-8">
          <TabsTrigger value="present" className="flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            Present
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="present" className="space-y-6 animate-in fade-in duration-500">
          {activeSessions.length > 0 ? (
            activeSessions.map(session => (
              <ConsumptionForm 
                key={session.id}
                initialSession={session}
                inventoryItems={inventoryItems || []}
                tenantId={user.tenant_id}
              />
            ))
          ) : (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6 flex gap-3 text-amber-800">
                <Info className="h-5 w-5 shrink-0" />
                <div className="text-sm">
                  <p className="font-bold">No live sessions found.</p>
                  <p>Start a new attendance session to begin tracking consumption in real-time.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="animate-in fade-in duration-500">
          <ConsumptionHistory sessions={historySessions} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
