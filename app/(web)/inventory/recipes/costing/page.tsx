"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CircleDollarSign, TrendingUp, Receipt, Loader2, AlertCircle, Info, PieChart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'

export default function RecipeCostingPage() {
  const supabase = createClient()
  const [recipes, setRecipes] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [costData, setCostData] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    const fetchRecipes = async () => {
      const { data } = await supabase.from('recipes').select('id, name, serving_size').eq('is_active', true)
      setRecipes(data || [])
    }
    fetchRecipes()
  }, [])

  const fetchCostDetails = async (id: string) => {
    if (!id) return
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('calculate_session_cost_for_recipe', {
        p_recipe_id: id
      })
      
      // Since calculate_session_cost is designed for sessions, I might need a specific one for recipes
      // Or I can just fetch ingredients and manually calculate using WAC
      const { data: recipe } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (
            *,
            inventory_items ( name, unit )
          )
        `)
        .eq('id', id)
        .single()

      if (recipe) {
        // Fetch WAC for each ingredient manually for accuracy
        const detailedIngredients = await Promise.all(recipe.recipe_ingredients.map(async (ri: any) => {
          const { data: wac } = await supabase.rpc('get_weighted_avg_cost', {
            p_tenant_id: recipe.tenant_id,
            p_item_id: ri.inventory_item_id
          })
          
          const effectiveQty = ri.quantity_per_serving * (1 + (ri.wastage_percentage || 0) / 100)
          const lineCost = effectiveQty * (wac || 0)
          
          return {
            ...ri,
            wac: wac || 0,
            effective_qty: effectiveQty,
            line_cost: lineCost
          }
        }))

        const totalCost = detailedIngredients.reduce((acc, curr) => acc + curr.line_cost, 0)
        setCostData(detailedIngredients)
        setSummary({
          totalCost,
          servingSize: recipe.serving_size,
          costPerServing: totalCost / (recipe.serving_size || 1),
          recipeName: recipe.name
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedId) fetchCostDetails(selectedId)
  }, [selectedId])

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cost Analysis & Pricing</h1>
        <p className="text-sm text-slate-500 font-medium">Detailed financial breakdown of culinary production costs.</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Analysis Controls */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b pb-4">
              <CardTitle className="text-sm font-bold uppercase text-slate-600 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Recipe</label>
                <Select value={selectedId} onValueChange={(val) => setSelectedId(val)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select recipe for analysis..." />
                  </SelectTrigger>
                  <SelectContent>
                    {recipes.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {summary && (
            <div className="space-y-4">
              <Card className="bg-primary text-white shadow-lg border-none overflow-hidden relative">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                    <PieChart className="h-24 w-24" />
                 </div>
                 <CardContent className="pt-8 pb-8">
                    <p className="text-xs font-bold text-blue-100 uppercase tracking-widest mb-1 opacity-80">Cost Per Serving</p>
                    <p className="text-4xl font-black mb-6">${summary.costPerServing.toFixed(2)}</p>
                    
                    <div className="space-y-3 pt-6 border-t border-white/10">
                       <div className="flex justify-between text-xs font-medium">
                          <span className="text-blue-100/70">Total Production Cost:</span>
                          <span className="font-bold">${summary.totalCost.toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between text-xs font-medium">
                          <span className="text-blue-100/70">Yield Quantity:</span>
                          <span className="font-bold">{summary.servingSize} Units</span>
                       </div>
                    </div>
                 </CardContent>
              </Card>

              <Card className="bg-amber-50 border-amber-100">
                 <CardContent className="pt-4 flex gap-3 text-amber-800">
                    <Info className="h-5 w-5 shrink-0" />
                    <div className="text-xs leading-relaxed font-medium">
                       Pricing is calculated using <strong>Weighted Average Cost (WAC)</strong>. 
                       Manual adjustments in recipes can significantly impact margins.
                    </div>
                 </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Pricing Breakdown */}
        <div className="col-span-12 lg:col-span-8">
           <Card className="shadow-sm min-h-[500px]">
              <CardHeader className="border-b bg-slate-50/30">
                 <CardTitle className="text-lg">Ingredient Pricing Breakdown</CardTitle>
                 <CardDescription>Component-level cost contribution analysis.</CardDescription>
              </CardHeader>
              <div className="p-0">
                 {loading ? (
                    <div className="flex flex-col items-center justify-center py-40 text-slate-400 gap-3">
                       <Loader2 className="h-8 w-8 animate-spin opacity-20" />
                       <p className="text-sm font-medium italic">Running cost engine...</p>
                    </div>
                 ) : costData.length > 0 ? (
                    <Table>
                       <TableHeader className="bg-slate-50/50">
                          <TableRow>
                             <TableHead>Ingredient</TableHead>
                             <TableHead className="text-right">Unit WAC</TableHead>
                             <TableHead className="text-right">Effective Qty</TableHead>
                             <TableHead className="text-right">Line Cost</TableHead>
                             <TableHead className="text-right">% Share</TableHead>
                          </TableRow>
                       </TableHeader>
                       <TableBody>
                          {costData.map((item) => {
                             const sharePct = (item.line_cost / summary.totalCost) * 100
                             return (
                                <TableRow key={item.id}>
                                   <TableCell className="font-bold text-slate-900">{item.inventory_items.name}</TableCell>
                                   <TableCell className="text-right font-mono text-xs text-slate-500">
                                      ${item.wac.toFixed(4)}
                                   </TableCell>
                                   <TableCell className="text-right font-mono text-xs font-medium">
                                      {item.effective_qty.toFixed(3)} <span className="uppercase text-[9px] text-slate-400">{item.unit}</span>
                                   </TableCell>
                                   <TableCell className="text-right font-mono font-bold text-slate-900">
                                      ${item.line_cost.toFixed(2)}
                                   </TableCell>
                                   <TableCell className="text-right">
                                      <div className="flex flex-col items-end gap-1">
                                         <span className="text-xs font-bold">{sharePct.toFixed(1)}%</span>
                                         <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden">
                                            <div className="bg-blue-500 h-full" style={{ width: `${sharePct}%` }} />
                                         </div>
                                      </div>
                                   </TableCell>
                                </TableRow>
                             )
                          })}
                       </TableBody>
                    </Table>
                 ) : (
                    <div className="flex flex-col items-center justify-center py-40 text-slate-300 gap-2">
                       <AlertCircle className="h-10 w-10 opacity-20" />
                       <p className="text-sm font-medium">Select a recipe to view pricing breakdown.</p>
                    </div>
                 )}
              </div>
           </Card>
        </div>
      </div>
    </div>
  )
}
