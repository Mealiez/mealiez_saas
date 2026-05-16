"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Scale } from 'lucide-react'

interface Ingredient {
  inventory_item_id: string
  name: string
  quantity_per_serving: number
  unit: string
  wastage_percentage: number
}

interface ScalingPreviewProps {
  ingredients: Ingredient[]
  baseServingSize: number
}

export default function RecipeScalingPreview({ ingredients, baseServingSize }: ScalingPreviewProps) {
  const [previewServings, setPreviewServings] = useState(100)
  
  const presets = [50, 100, 250, 500]

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">Scaling Preview</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Input 
              type="number" 
              className="h-8 w-20 text-right font-bold"
              value={previewServings}
              onChange={(e) => setPreviewServings(parseInt(e.target.value) || 0)}
            />
            <span className="text-xs text-muted-foreground">servings</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map(p => (
            <button
              key={p}
              onClick={() => setPreviewServings(p)}
              className={`px-2 py-1 text-[10px] font-bold rounded border transition-colors ${
                previewServings === p 
                ? 'bg-primary border-primary text-primary-foreground' 
                : 'hover:bg-muted'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {ingredients.map((ing) => {
            const totalQty = ing.quantity_per_serving * previewServings * (1 + ing.wastage_percentage / 100)
            return (
              <div key={ing.inventory_item_id} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{ing.name}</span>
                <span className="font-mono font-medium">
                  {totalQty.toFixed(2)} <span className="text-[10px] text-muted-foreground uppercase">{ing.unit}</span>
                </span>
              </div>
            )
          })}
          {ingredients.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-4 italic">
              Add ingredients to see scaling requirements
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
