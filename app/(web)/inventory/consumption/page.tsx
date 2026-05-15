'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react'

// Mock Data
const MOCK_SESSION = {
  mealType: 'Lunch',
  expectedAttendance: 450,
  menuItems: ['Steamed Rice', 'Dal Tadka', 'Paneer Butter Masala'],
  totalExpectedCost: 3450,
}

const MOCK_INGREDIENTS = [
  { id: 1, name: 'Rice', unit: 'kg', expected: 50 },
  { id: 2, name: 'Toor Dal', unit: 'kg', expected: 15 },
  { id: 3, name: 'Paneer', unit: 'kg', expected: 25 },
  { id: 4, name: 'Cooking Oil', unit: 'L', expected: 8 },
]

export default function MealConsumptionPage() {
  const [actualAttendance, setActualAttendance] = useState<number | ''>(450)
  const [actuals, setActuals] = useState<Record<number, number>>(
    MOCK_INGREDIENTS.reduce((acc, item) => ({ ...acc, [item.id]: item.expected }), {})
  )

  const handleActualChange = (id: number, val: string) => {
    setActuals(prev => ({ ...prev, [id]: parseFloat(val) || 0 }))
  }

  const getVariance = (expected: number, actual: number) => {
    const diff = actual - expected
    const pct = (diff / expected) * 100
    return { diff, pct }
  }

  const getVarianceColor = (pct: number) => {
    if (pct <= 5 && pct >= -5) return 'text-green-600 bg-green-50 border-green-200'
    if (pct > 5 && pct <= 10) return 'text-amber-600 bg-amber-50 border-amber-200'
    if (pct > 10) return 'text-red-600 bg-red-50 border-red-200'
    return 'text-muted-foreground bg-muted/50 border-border' // Under usage
  }

  const getVarianceIcon = (pct: number) => {
    if (pct <= 5 && pct >= -5) return <CheckCircle2 className="h-4 w-4" />
    if (pct > 5 && pct <= 10) return <AlertTriangle className="h-4 w-4" />
    if (pct > 10) return <AlertCircle className="h-4 w-4" />
    return <Info className="h-4 w-4" />
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meal Session Consumption</h1>
          <p className="text-muted-foreground">Track actual ingredient usage and record wastage.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">Save Draft</Button>
          <Button>Confirm Deduction</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Session Summary Panel */}
        <Card className="md:col-span-1 border-primary/20 shadow-sm">
          <CardHeader className="pb-3 bg-muted/30 border-b">
            <CardTitle className="text-lg">Session Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Meal Type</p>
                <p className="font-semibold">{MOCK_SESSION.mealType}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Expected Cost</p>
                <p className="font-semibold">₹{MOCK_SESSION.totalExpectedCost}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Expected Attendance</p>
                <p className="font-semibold text-lg">{MOCK_SESSION.expectedAttendance}</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Actual Attendance</label>
                <Input 
                  type="number" 
                  value={actualAttendance} 
                  onChange={(e) => setActualAttendance(parseInt(e.target.value) || '')} 
                  className="font-semibold"
                />
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-2">Menu Items</p>
              <div className="flex flex-wrap gap-2">
                {MOCK_SESSION.menuItems.map(item => (
                  <span key={item} className="px-2 py-1 bg-secondary/10 text-secondary-foreground rounded-md text-xs font-medium border">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ingredient Deduction Table */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg">Ingredient Deduction</CardTitle>
            <CardDescription>Enter the actual quantities used during this session.</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="w-32">Actual Usage</TableHead>
                  <TableHead>Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_INGREDIENTS.map((item) => {
                  const actual = actuals[item.id] ?? item.expected
                  const { diff, pct } = getVariance(item.expected, actual)
                  const vColor = getVarianceColor(pct)

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.expected} {item.unit}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            className="w-20 text-right"
                            value={actual}
                            onChange={(e) => handleActualChange(item.id, e.target.value)}
                          />
                          <span className="text-sm text-muted-foreground">{item.unit}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${vColor}`}>
                          {getVarianceIcon(pct)}
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)} {item.unit} ({diff > 0 ? '+' : ''}{pct.toFixed(1)}%)
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Wastage Entry Section */}
      <Card className="shadow-sm border-dashed">
        <CardHeader className="pb-3 border-b bg-muted/10">
          <CardTitle className="text-lg">Wastage Entry</CardTitle>
          <CardDescription>Record any significant food waste from this session.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cooking Waste (kg)</label>
              <Input type="number" placeholder="0.0" />
              <p className="text-xs text-muted-foreground">Spoilage during prep</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Leftover Disposal (kg)</label>
              <Input type="number" placeholder="0.0" />
              <p className="text-xs text-muted-foreground">Unserved cooked food</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Plate Waste (kg)</label>
              <Input type="number" placeholder="0.0" />
              <p className="text-xs text-muted-foreground">Returned on plates</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
