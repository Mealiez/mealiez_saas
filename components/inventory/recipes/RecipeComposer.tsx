"use client"

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Save, ArrowLeft, UtensilsCrossed } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import IngredientSearchSelect from './IngredientSearchSelect'
import RecipeIngredientRow from './RecipeIngredientRow'
import RecipeCostSummary from './RecipeCostSummary'
import RecipeScalingPreview from './RecipeScalingPreview'
import Link from 'next/link'

interface RecipeComposerProps {
  initialData?: any
  tenantId: string
}

export default function RecipeComposer({ initialData, tenantId }: RecipeComposerProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Recipe Metadata
  const [name, setName] = useState(initialData?.name || '')
  const [mealCategory, setMealCategory] = useState(initialData?.meal_category || 'LUNCH')
  const [servingSize, setServingSize] = useState(initialData?.serving_size || 1)
  const [description, setDescription] = useState(initialData?.description || '')
  
  // Ingredients State
  const [ingredients, setIngredients] = useState<any[]>(initialData?.recipe_ingredients?.map((ri: any) => ({
    inventory_item_id: ri.inventory_item_id,
    name: ri.inventory_items.name,
    unit: ri.unit,
    quantity_per_serving: ri.quantity_per_serving,
    wastage_percentage: ri.wastage_percentage,
    cost_per_unit: ri.inventory_items.avg_cost || 0 // Assuming we have this
  })) || [])

  const addIngredient = (item: any) => {
    if (ingredients.find(ing => ing.inventory_item_id === item.id)) return
    setIngredients(prev => [...prev, {
      inventory_item_id: item.id,
      name: item.name,
      unit: item.unit,
      quantity_per_serving: 0.1, // default
      wastage_percentage: 0,
      cost_per_unit: 0 // Will fetch or pass if possible
    }])
  }

  const updateIngredient = (index: number, updates: any) => {
    setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, ...updates } : ing))
  }

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index))
  }

  // Financial Calculations
  const totals = useMemo(() => {
    const totalBatchCost = ingredients.reduce((acc, ing) => {
      const effectiveQty = ing.quantity_per_serving * (1 + ing.wastage_percentage / 100)
      return acc + (effectiveQty * (ing.cost_per_unit || 0))
    }, 0)
    
    return {
      totalCost: totalBatchCost * servingSize,
      costPerServing: totalBatchCost,
      ingredientCount: ingredients.length
    }
  }, [ingredients, servingSize])

  const handleSave = async () => {
    if (!name || ingredients.length === 0) {
      alert('Please provide a recipe name and at least one ingredient.')
      return
    }

    setIsSubmitting(true)
    try {
      const recipePayload = {
        tenant_id: tenantId,
        name,
        meal_category: mealCategory,
        serving_size: servingSize,
        description,
        is_active: true
      }

      let recipeId = initialData?.id
      
      if (recipeId) {
        // Update
        const { error: rErr } = await supabase
          .from('recipes')
          .update(recipePayload)
          .eq('id', recipeId)
        if (rErr) throw rErr
      } else {
        // Create
        const { data: newRecipe, error: rErr } = await supabase
          .from('recipes')
          .insert(recipePayload)
          .select()
          .single()
        if (rErr) throw rErr
        recipeId = newRecipe.id
      }

      // Sync Ingredients (Delete all and re-insert for simplicity in this version)
      const { error: dErr } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', recipeId)
      if (dErr) throw dErr

      const ingredientsPayload = ingredients.map(ing => ({
        tenant_id: tenantId,
        recipe_id: recipeId,
        inventory_item_id: ing.inventory_item_id,
        quantity_per_serving: ing.quantity_per_serving,
        unit: ing.unit,
        wastage_percentage: ing.wastage_percentage
      }))

      const { error: iErr } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientsPayload)
      if (iErr) throw iErr

      router.push('/inventory/recipes')
      router.refresh()
    } catch (err: any) {
      console.error(err)
      alert('Failed to save recipe: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-12 gap-6 pb-20">
      {/* Sidebar - Metadata */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-3 bg-muted/30 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              Recipe Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">Recipe Name</label>
              <Input 
                placeholder="e.g. Traditional Dal Fry" 
                value={name} 
                onChange={e => setName(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Category</label>
                <Select value={mealCategory} onValueChange={setMealCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER', 'ANY'].map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">Base Serving</label>
                <Input 
                  type="number" 
                  value={servingSize} 
                  onChange={e => setServingSize(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-muted-foreground">Prep Notes</label>
              <textarea 
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                placeholder="Cooking instructions or notes..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <RecipeCostSummary 
          totalCost={totals.totalCost}
          costPerServing={totals.costPerServing}
          ingredientCount={totals.ingredientCount}
        />

        <RecipeScalingPreview 
          ingredients={ingredients}
          baseServingSize={servingSize}
        />
      </div>

      {/* Main Area - Ingredient Builder */}
      <div className="col-span-12 lg:col-span-8 space-y-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Ingredient Builder</CardTitle>
              <CardDescription>Define ingredient quantities required for ONE serving.</CardDescription>
            </div>
            <div className="w-64">
              <IngredientSearchSelect 
                onSelect={addIngredient} 
                excludeIds={ingredients.map(i => i.inventory_item_id)}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-2">
              {ingredients.map((ing, idx) => (
                <RecipeIngredientRow 
                  key={ing.inventory_item_id}
                  ingredient={ing}
                  onUpdate={(updates) => updateIngredient(idx, updates)}
                  onRemove={() => removeIngredient(idx)}
                />
              ))}
              {ingredients.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                  <Plus className="h-10 w-10 text-muted-foreground mb-2 opacity-30" />
                  <p className="text-muted-foreground text-sm">Use the search box above to add ingredients</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t flex justify-center z-50">
        <div className="max-w-6xl w-full flex justify-between items-center px-6">
          <Link href="/inventory/recipes">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Button>
          </Link>
          <Button 
            className="px-8 shadow-lg shadow-primary/20" 
            onClick={handleSave} 
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Recipe
          </Button>
        </div>
      </div>
    </div>
  )
}
