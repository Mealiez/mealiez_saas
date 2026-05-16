import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Utensils, History, Package, AlertTriangle } from 'lucide-react'

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const user = await requireAuth()
  const supabase = await createClient()

  // 1. Fetch item details with stock and category
  const { data: item } = await supabase
    .from('inventory_items')
    .select(`
      *,
      inventory_categories (name, color),
      inventory_stock (current_stock)
    `)
    .eq('id', params.id)
    .single()

  if (!item) notFound()

  // 2. Fetch recipe dependencies
  const { data: dependencies } = await supabase
    .from('recipe_ingredients')
    .select(`
      quantity_per_serving,
      unit,
      wastage_percentage,
      recipes (
        id,
        name,
        meal_category,
        is_active
      )
    `)
    .eq('inventory_item_id', params.id)

  // 3. Fetch recent transactions
  const { data: transactions } = await supabase
    .from('inventory_transactions')
    .select('*')
    .eq('item_id', params.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/inventory" className="hover:text-foreground">Inventory</Link>
        <span>/</span>
        <Link href="/inventory/items" className="hover:text-foreground">Items</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{item.name}</span>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Item Header & Summary */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <CardTitle className="text-2xl font-bold">{item.name}</CardTitle>
                  {item.inventory_categories && (
                    <Badge style={{ backgroundColor: item.inventory_categories.color + '20', color: item.inventory_categories.color, borderColor: item.inventory_categories.color }}>
                      {item.inventory_categories.name}
                    </Badge>
                  )}
                </div>
                <CardDescription>{item.description || 'No description provided.'}</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{item.inventory_stock?.current_stock || 0} {item.unit}</p>
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Current Stock</p>
              </div>
            </CardHeader>
          </Card>

          {/* Recipe Dependency Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Utensils className="h-5 w-5 text-primary" />
                Recipe Dependencies
              </CardTitle>
              <CardDescription>Recipes that use this ingredient for consumption calculation.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipe Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty/Serving</TableHead>
                    <TableHead className="text-right">Waste %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dependencies?.map((dep: any) => (
                    <TableRow key={dep.recipes.id}>
                      <TableCell>
                        <Link href={`/inventory/recipes/${dep.recipes.id}/edit`} className="font-medium hover:underline text-primary">
                          {dep.recipes.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{dep.recipes.meal_category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{dep.quantity_per_serving} {dep.unit}</TableCell>
                      <TableCell className="text-right">{dep.wastage_percentage}%</TableCell>
                    </TableRow>
                  ))}
                  {(!dependencies || dependencies.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground italic text-sm">
                        This item is not used in any recipes.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                Recent Ledger Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions?.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium capitalize">{tx.transaction_type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${tx.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.quantity > 0 ? '+' : ''}{tx.quantity} {item.unit}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Stock: {tx.stock_after}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Metrics */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Stock Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Min Threshold:</span>
                <span className="font-mono">{item.min_stock_level} {item.unit}</span>
              </div>
              {item.inventory_stock?.current_stock <= item.min_stock_level && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p className="text-xs">Stock is below the minimum threshold. Reordering recommended.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Batch Info</CardTitle>
            </CardHeader>
            <CardContent>
               <p className="text-xs text-muted-foreground">Detailed batch tracking and FIFO status available in the Batches module.</p>
               <Link href="/inventory/batches">
                 <Button variant="link" className="px-0 text-xs text-primary">View Active Batches →</Button>
               </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
