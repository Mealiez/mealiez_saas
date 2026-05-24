"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CircleDollarSign } from 'lucide-react'

interface CostSummaryProps {
  totalCost: number
  costPerServing: number
  ingredientCount: number
}

export default function RecipeCostSummary({ totalCost, costPerServing, ingredientCount }: CostSummaryProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4" />
          Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-2xl font-bold">${costPerServing.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Estimated Cost Per Serving</p>
        </div>
        
        <div className="pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ingredients:</span>
            <span className="font-semibold">{ingredientCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Batch Cost:</span>
            <span className="font-semibold">${totalCost.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Operational Note</p>
          <p className="text-xs leading-relaxed">
            Costs are derived from Weighted Average Cost (WAC) of current inventory. 
            Actual costs may vary during session fulfillment.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
