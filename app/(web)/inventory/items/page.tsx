import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ItemsTable from './ItemsTable'
import CreateItemModal from './CreateItemModal'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * FILE 5: app/(web)/inventory/items/page.tsx
 */
export default async function InventoryItemsPage() {
  const user = await requireAuth()

  // Role check — admin+ only can access items page
  if (!['admin'].includes(user.role)) {
    redirect('/inventory')
  }

  const supabase = await createClient()

  // Fetch items with stock
  const { data: items } = await supabase
    .from('inventory_items')
    .select(`
      id, name, description, unit,
      min_stock_level, is_active, created_at,
      inventory_categories (id, name, color),
      inventory_stock (current_stock)
    `)
    .order('name', { ascending: true })

  // Fetch categories for the create modal
  const { data: categories } = await supabase
    .from('inventory_categories')
    .select('id, name, color')
    .order('name', { ascending: true })

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb & Title */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/inventory" className="hover:text-foreground">Inventory</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Items</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Item Master List</h1>
          <p className="text-muted-foreground">Define products, units, and alert thresholds</p>
        </div>
        <CreateItemModal categories={categories ?? []} />
      </div>

      <ItemsTable 
        initialItems={items as any[] ?? []} 
        categories={categories ?? []} 
      />
    </div>
  )
}

