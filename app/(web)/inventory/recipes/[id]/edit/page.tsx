import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import RecipeComposer from '@/components/inventory/recipes/RecipeComposer'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function EditRecipePage({ params }: { params: { id: string } }) {
  const user = await requireAuth()
  const supabase = await createClient()

  // Fetch recipe with ingredients and their item names
  const { data: recipe } = await supabase
    .from('recipes')
    .select(`
      *,
      recipe_ingredients (
        *,
        inventory_items (
          name,
          avg_cost
        )
      )
    `)
    .eq('id', params.id)
    .single()

  if (!recipe) notFound()

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/inventory" className="hover:text-foreground">Inventory</Link>
        <span>/</span>
        <Link href="/inventory/recipes" className="hover:text-foreground">Recipes</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Edit</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Recipe</h1>
          <p className="text-muted-foreground">Modify recipe structure and ingredient parameters</p>
        </div>
      </div>

      <RecipeComposer initialData={recipe} tenantId={user.tenant_id} />
    </div>
  )
}
