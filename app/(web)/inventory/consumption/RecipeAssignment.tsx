"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Plus, Trash2, Utensils } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Recipe {
  id: string
  name: string
  meal_category: string
}

interface RecipeAssignmentProps {
  sessionId: string
  tenantId: string
  assignedRecipes: any[]
  onUpdate: () => void
  disabled?: boolean
}

export default function RecipeAssignment({ sessionId, tenantId, assignedRecipes, onUpdate, disabled = false }: RecipeAssignmentProps) {
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchRecipes = async () => {
      const { data } = await supabase
        .from('recipes')
        .select('id, name, meal_category')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
      setAvailableRecipes(data || [])
    }
    fetchRecipes()
  }, [tenantId])

  const assignRecipe = async (recipeId: string) => {
    if (disabled) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('session_recipes')
        .insert({
          tenant_id: tenantId,
          session_id: sessionId,
          recipe_id: recipeId
        })
      if (error) throw error
      onUpdate()
    } catch (err: any) {
      alert('Failed to assign recipe: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const removeRecipe = async (id: string) => {
    if (disabled) return
    try {
      const { error } = await supabase
        .from('session_recipes')
        .delete()
        .eq('id', id)
      if (error) throw error
      onUpdate()
    } catch (err: any) {
      alert('Failed to remove: ' + err.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
          <Utensils className="h-4 w-4" />
          Assigned Recipes
        </h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {assignedRecipes.map((sr) => (
          <div key={sr.id} className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium">
            <span>{sr.recipes.name}</span>
            {!disabled && (
              <button onClick={() => removeRecipe(sr.id)} className="hover:text-primary/70">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {assignedRecipes.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No recipes assigned to this session.</p>
        )}
      </div>

      {!disabled && (
        <div className="pt-2">
          <p className="text-xs font-medium mb-2">Assign Dish:</p>
          <div className="grid grid-cols-2 gap-2">
            {availableRecipes
              .filter(r => !assignedRecipes.find(sr => sr.recipe_id === r.id))
              .map(recipe => (
                <Button 
                  key={recipe.id} 
                  variant="outline" 
                  size="sm" 
                  className="justify-start text-xs h-8"
                  onClick={() => assignRecipe(recipe.id)}
                  disabled={loading}
                >
                  <Plus className="h-3 w-3 mr-2" />
                  {recipe.name}
                </Button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
