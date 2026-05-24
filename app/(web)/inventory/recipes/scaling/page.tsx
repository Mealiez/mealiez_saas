"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Scale, Users, ChefHat, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function RecipeScalingPage() {
  const supabase = createClient()
  const [recipes, setRecipes] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [servings, setServings] = useState<number>(100)
  const [loading, setLoading] = useState(false)
  const [recipeData, setRecipeData] = useState<any>(null)

  useEffect(() => {
    const fetchRecipes = async () => {
      const { data } = await supabase.from('recipes').select('id, name, serving_size').eq('is_active', true)
      setRecipes(data || [])
    }
    fetchRecipes()
  }, [])

  const fetchDetails = async (id: string) => {
    if (!id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
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
      if (error) throw error
      setRecipeData(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedId) fetchDetails(selectedId)
  }, [selectedId])

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Recipe Scaling Simulator</h1>
        <p className="text-sm text-slate-500 font-medium">Dynamically adjust ingredient requirements based on production volume.</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Simulator Controls */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <Card className="shadow-sm border-blue-100 ring-1 ring-blue-50/50">
            <CardHeader className="bg-slate-50/50 border-b pb-4">
              <CardTitle className="text-sm font-bold uppercase text-slate-600 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Scaling Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Recipe</label>
                <Select value={selectedId} onValueChange={(val) => setSelectedId(val)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Choose a recipe..." />
                  </SelectTrigger>
                  <SelectContent>
                    {recipes.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Servings</label>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    value={servings} 
                    onChange={e => setServings(parseInt(e.target.value) || 0)}
                    className="font-bold text-lg h-11 border-blue-100 focus:ring-blue-500"
                  />
                  <div className="h-11 w-11 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 shrink-0">
                    <Scale className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[50, 100, 250, 500].map(p => (
                  <Button 
                    key={p} 
                    variant="outline" 
                    size="sm" 
                    className={cn(
                      "h-9 font-bold text-[10px] uppercase transition-all",
                      servings === p ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700" : "hover:bg-blue-50"
                    )}
                    onClick={() => setServings(p)}
                  >
                    {p} Servings
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {recipeData && (
            <Card className="bg-slate-900 text-white shadow-xl shadow-slate-200">
               <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <ChefHat className="h-6 w-6" />
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Current Selection</p>
                        <h3 className="font-bold text-lg leading-none">{recipeData.name}</h3>
                     </div>
                  </div>
                  <div className="pt-4 border-t border-slate-800 space-y-2">
                     <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-500">Base Yield:</span>
                        <span className="text-slate-100">{recipeData.serving_size} Servings</span>
                     </div>
                     <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-500">Scale Factor:</span>
                        <span className="text-blue-400">{(servings / (recipeData.serving_size || 1)).toFixed(2)}x</span>
                     </div>
                  </div>
               </CardContent>
            </Card>
          )}
        </div>

        {/* Results Area */}
        <div className="col-span-12 lg:col-span-8">
           <Card className="shadow-sm min-h-[500px]">
              <CardHeader className="border-b bg-slate-50/30">
                 <CardTitle className="text-lg">Production Requirement List</CardTitle>
                 <CardDescription>Scaled ingredient quantities for {servings} servings.</CardDescription>
              </CardHeader>
              <div className="p-0">
                 {loading ? (
                    <div className="flex flex-col items-center justify-center py-40 text-slate-400 gap-3">
                       <Loader2 className="h-8 w-8 animate-spin opacity-20" />
                       <p className="text-sm font-medium italic">Calculating scaled requirements...</p>
                    </div>
                 ) : recipeData ? (
                    <Table>
                       <TableHeader className="bg-slate-50/50">
                          <TableRow>
                             <TableHead>Ingredient</TableHead>
                             <TableHead className="text-right">Per Serving</TableHead>
                             <TableHead className="text-right">Total Required</TableHead>
                             <TableHead className="text-right text-blue-600">Incl. Waste (%)</TableHead>
                          </TableRow>
                       </TableHeader>
                       <TableBody>
                          {recipeData.recipe_ingredients.map((ing: any) => {
                             const perServing = ing.quantity_per_serving
                             const totalBase = perServing * servings
                             const totalWithWaste = totalBase * (1 + (ing.wastage_percentage || 0) / 100)
                             
                             return (
                                <TableRow key={ing.id}>
                                   <TableCell className="font-bold text-slate-900">{ing.inventory_items.name}</TableCell>
                                   <TableCell className="text-right font-mono text-xs text-slate-500">
                                      {perServing} <span className="uppercase text-[9px] font-bold">{ing.unit}</span>
                                   </TableCell>
                                   <TableCell className="text-right font-mono font-medium">
                                      {totalBase.toFixed(2)} <span className="uppercase text-[9px] text-slate-400">{ing.unit}</span>
                                   </TableCell>
                                   <TableCell className="text-right font-mono font-bold text-blue-700">
                                      {totalWithWaste.toFixed(2)} <span className="uppercase text-[9px] opacity-70">{ing.unit}</span>
                                      <span className="block text-[9px] text-slate-400 font-medium">
                                         +{ing.wastage_percentage}% waste
                                      </span>
                                   </TableCell>
                                </TableRow>
                             )
                          })}
                       </TableBody>
                    </Table>
                 ) : (
                    <div className="flex flex-col items-center justify-center py-40 text-slate-300 gap-2">
                       <AlertCircle className="h-10 w-10 opacity-20" />
                       <p className="text-sm font-medium">Select a recipe to view production requirements.</p>
                    </div>
                 )}
              </div>
           </Card>
        </div>
      </div>
    </div>
  )
}
