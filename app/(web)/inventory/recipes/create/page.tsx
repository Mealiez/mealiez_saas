import { requireAuth } from '@/lib/auth/session'
import RecipeComposer from '@/components/inventory/recipes/RecipeComposer'
import Link from 'next/link'

export default async function CreateRecipePage() {
  const user = await requireAuth()

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/inventory" className="hover:text-foreground">Inventory</Link>
        <span>/</span>
        <Link href="/inventory/recipes" className="hover:text-foreground">Recipes</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Create</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Recipe</h1>
          <p className="text-muted-foreground">Build a new operational recipe for meal sessions</p>
        </div>
      </div>

      <RecipeComposer tenantId={user.tenant_id} />
    </div>
  )
}
