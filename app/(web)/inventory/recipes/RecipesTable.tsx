"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Edit2, Copy, Trash2, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function RecipesTable({ initialRecipes }: { initialRecipes: any[] }) {
  const [recipes, setRecipes] = useState(initialRecipes)
  const router = useRouter()
  const supabase = createClient()

  const handleDuplicate = async (recipe: any) => {
    try {
      const { data: newRecipe, error: rErr } = await supabase
        .from('recipes')
        .insert({
          tenant_id: recipe.tenant_id,
          name: `${recipe.name} (Copy)`,
          meal_category: recipe.meal_category,
          serving_size: recipe.serving_size,
          description: recipe.description
        })
        .select()
        .single()
      if (rErr) throw rErr

      const { data: ingredients, error: iGetErr } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipe.id)
      if (iGetErr) throw iGetErr

      if (ingredients && ingredients.length > 0) {
        const ingredientsPayload = ingredients.map(ing => ({
          tenant_id: recipe.tenant_id,
          recipe_id: newRecipe.id,
          inventory_item_id: ing.inventory_item_id,
          quantity_per_serving: ing.quantity_per_serving,
          unit: ing.unit,
          wastage_percentage: ing.wastage_percentage
        }))
        const { error: iInsErr } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientsPayload)
        if (iInsErr) throw iInsErr
      }

      router.refresh()
      alert('Recipe duplicated successfully!')
    } catch (err: any) {
      alert('Failed to duplicate: ' + err.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id)
      if (error) throw error
      setRecipes(prev => prev.filter(r => r.id !== id))
    } catch (err: any) {
      alert('Failed to delete: ' + err.message)
    }
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 font-medium">Recipe Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium text-center">Ingredients</th>
              <th className="px-4 py-3 font-medium text-right">Cost/Serving</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {recipes.map((recipe) => (
              <tr key={recipe.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-4">
                  <div className="font-medium">{recipe.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{recipe.description}</div>
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                    {recipe.meal_category}
                  </span>
                </td>
                <td className="px-4 py-4 text-center font-mono">
                  {recipe.ingredient_count || 0}
                </td>
                <td className="px-4 py-4 text-right font-semibold">
                  ${(recipe.estimated_cost || 0).toFixed(2)}
                </td>
                <td className="px-4 py-4">
                  {recipe.is_active ? (
                    <span className="text-green-600 text-[10px] font-bold uppercase">Active</span>
                  ) : (
                    <span className="text-muted-foreground text-[10px] font-bold uppercase">Archived</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right space-x-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(recipe)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Link href={`/inventory/recipes/${recipe.id}/edit`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(recipe.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {recipes.length === 0 && (
        <div className="p-12 text-center text-muted-foreground italic">
          No recipes found. Create your first operational recipe to get started.
        </div>
      )}
    </div>
  )
}
