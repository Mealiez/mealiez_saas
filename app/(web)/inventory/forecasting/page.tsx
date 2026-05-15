'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'
import { AlertTriangle, TrendingUp, PackageSearch } from 'lucide-react'

// --- MOCK DATA ---
const depletionData = [
  { day: 'Day 1', rice: 50, dal: 15, oil: 8 },
  { day: 'Day 3', rice: 40, dal: 12, oil: 7 },
  { day: 'Day 5', rice: 30, dal: 9, oil: 6 },
  { day: 'Day 7', rice: 20, dal: 6, oil: 5 },
  { day: 'Day 9', rice: 10, dal: 3, oil: 4 },
  { day: 'Day 11', rice: 0, dal: 0, oil: 2 },
]

const mealCostingData = [
  { date: '10/01', cost: 3200 },
  { date: '10/02', cost: 3400 },
  { date: '10/03', cost: 3100 },
  { date: '10/04', cost: 3800 },
  { date: '10/05', cost: 3600 },
  { date: '10/06', cost: 3900 },
  { date: '10/07', cost: 4100 },
]

const wastageData = [
  { name: 'Cooking', kg: 12 },
  { name: 'Plate', kg: 19 },
  { name: 'Spoilage', kg: 5 },
]

const contributionData = [
  { name: 'Produce', value: 400 },
  { name: 'Dairy', value: 300 },
  { name: 'Dry Goods', value: 300 },
  { name: 'Protein', value: 200 },
]

const forecastConfidenceData = [
  { day: 'Mon', high: 400, expected: 350, low: 300 },
  { day: 'Tue', high: 420, expected: 360, low: 310 },
  { day: 'Wed', high: 450, expected: 380, low: 320 },
  { day: 'Thu', high: 460, expected: 400, low: 330 },
  { day: 'Fri', high: 500, expected: 450, low: 380 },
]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export default function ForecastingDashboardPage() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory Forecasting</h1>
          <p className="text-muted-foreground">Proactive procurement and operational analytics.</p>
        </div>
        <Button>Generate PO</Button>
      </div>

      {/* Procurement Recommendation Panel */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <PackageSearch className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">Action Required: Procurement Recommendations</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Based on current consumption trends, the following items require immediate restocking:
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-3 py-1 bg-background rounded-full text-sm font-medium border shadow-sm">Rice → 350kg</span>
                <span className="px-3 py-1 bg-background rounded-full text-sm font-medium border shadow-sm">Milk → 120L</span>
                <span className="px-3 py-1 bg-background rounded-full text-sm font-medium border shadow-sm">Paneer → 25kg</span>
              </div>
            </div>
          </div>
          <Button variant="default" className="shrink-0">Review Purchase Order</Button>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Inventory Depletion (Line Chart) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projected Inventory Depletion</CardTitle>
            <CardDescription>Estimated days remaining for key staples</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={depletionData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Line type="monotone" dataKey="rice" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="dal" stroke="#82ca9d" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="oil" stroke="#ffc658" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Meal Costing (Area Chart) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meal Costing Trends</CardTitle>
            <CardDescription>Daily food cost over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mealCostingData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="cost" stroke="#1e3a8a" fillOpacity={1} fill="url(#colorCost)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Wastage (Bar Chart) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wastage Analysis</CardTitle>
            <CardDescription>Volume of waste by category (kg)</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wastageData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="kg" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ingredient Contribution (Donut Chart) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingredient Cost Contribution</CardTitle>
            <CardDescription>Distribution of expenses by category</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={contributionData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {contributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Forecast Confidence (Stacked Area Chart) */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Consumption Forecast Confidence</CardTitle>
            <CardDescription>Expected attendance range driving procurement decisions</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastConfidenceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="low" stackId="1" stroke="#82ca9d" fill="#82ca9d" opacity={0.3} />
                <Area type="monotone" dataKey="expected" stackId="1" stroke="#8884d8" fill="#8884d8" opacity={0.6} />
                <Area type="monotone" dataKey="high" stackId="1" stroke="#ffc658" fill="#ffc658" opacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
