import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import TransactionsTable from './TransactionsTable'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus, ShoppingCart, History } from 'lucide-react'

export default async function PurchaseHistoryPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Fetch all transactions for the tenant
  // We join with inventory_items to get the name and unit
  const { data: transactions } = await supabase
    .from('inventory_transactions')
    .select(`
      *,
      inventory_items (
        name,
        unit
      )
    `)
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/inventory" className="hover:text-foreground">Inventory</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Purchases & Transactions</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <History className="h-6 w-6 text-primary" />
            Transaction Audit Trail
          </h1>
          <p className="text-muted-foreground">Detailed history of all stock movements and procurement</p>
        </div>
        <div className="flex gap-3">
          <Link href="/m/inventory/purchase">
            <Button className="shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" />
              Log Purchase
            </Button>
          </Link>
        </div>
      </div>

      <TransactionsTable initialTransactions={transactions as any[] ?? []} />
    </div>
  )
}
