'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'

interface ForecastingChartsProps {
  depletionData: any[]
  mealCostingData: any[]
  wastageData: any[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export default function ForecastingCharts({ depletionData, mealCostingData, wastageData }: ForecastingChartsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Inventory Depletion (Bar Chart) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Critical Stock Depletion</CardTitle>
          <CardDescription>Days remaining for lowest stock items</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={depletionData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="days" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Meal Costing (Area Chart) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meal Costing Trends</CardTitle>
          <CardDescription>Daily food cost based on actual deductions</CardDescription>
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

      {/* Wastage (Donut Chart) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage vs Wastage</CardTitle>
          <CardDescription>Proportion of total food usage (kg)</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={wastageData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="kg"
              >
                {wastageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.name === 'Wastage' ? '#ef4444' : '#10b981'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
