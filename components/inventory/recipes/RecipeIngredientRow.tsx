"use client"

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { UNIT_LABELS } from '@/lib/validations/inventory'

interface IngredientRowProps {
  ingredient: {
    inventory_item_id: string
    name: string
    quantity_per_serving: number
    unit: string
    wastage_percentage: number
    cost_per_unit?: number
  }
  onUpdate: (updates: Partial<{ quantity_per_serving: number, wastage_percentage: number }>) => void
  onRemove: () => void
}

export default function RecipeIngredientRow({ ingredient, onUpdate, onRemove }: IngredientRowProps) {
  const effectiveQty = ingredient.quantity_per_serving * (1 + ingredient.wastage_percentage / 100)
  const estimatedCost = ingredient.cost_per_unit ? (effectiveQty * ingredient.cost_per_unit) : 0

  return (
    <div className="grid grid-cols-12 gap-4 items-center p-3 hover:bg-muted/30 transition-colors rounded-lg border border-transparent hover:border-border">
      <div className="col-span-4">
        <p className="font-medium text-sm">{ingredient.name}</p>
        <p className="text-xs text-muted-foreground uppercase">{ingredient.unit}</p>
      </div>

      <div className="col-span-2">
        <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Qty/Serving</label>
        <Input
          type="number"
          step="0.001"
          value={ingredient.quantity_per_serving}
          onChange={(e) => onUpdate({ quantity_per_serving: parseFloat(e.target.value) || 0 })}
          className="h-8 text-sm"
        />
      </div>

      <div className="col-span-2">
        <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Waste %</label>
        <Input
          type="number"
          value={ingredient.wastage_percentage}
          onChange={(e) => onUpdate({ wastage_percentage: parseFloat(e.target.value) || 0 })}
          className="h-8 text-sm"
        />
      </div>

      <div className="col-span-3 text-right">
        <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Est. Cost</label>
        <p className="text-sm font-semibold">
          {estimatedCost > 0 ? `$${estimatedCost.toFixed(4)}` : '—'}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {effectiveQty.toFixed(3)} {ingredient.unit} effective
        </p>
      </div>

      <div className="col-span-1 flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
