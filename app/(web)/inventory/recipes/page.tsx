import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import RecipesTable from './RecipesTable'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function RecipesPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Fetch recipes with metrics via RPC
  const { data: recipes } = await supabase
    .rpc('get_recipes_with_costs', {
      p_tenant_id: user.tenant_id
    })

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/inventory" className="hover:text-foreground">Inventory</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Recipes</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recipe Master List</h1>
          <p className="text-muted-foreground">Manage kitchen operational recipes and serving costs</p>
        </div>
        <Link href="/inventory/recipes/create">
          <Button className="shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" />
            Create Recipe
          </Button>
        </Link>
      </div>

      <RecipesTable initialRecipes={recipes || []} />
    </div>
  )
}
