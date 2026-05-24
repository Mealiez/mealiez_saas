import { requireAuth } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Users, Utensils, Receipt, TrendingDown, TrendingUp, CheckCircle2, Clock } from 'lucide-react'

export default async function SessionReportPage({ params }: { params: { id: string } }) {
  const user = await requireAuth()
  const supabase = await createClient()

  // 1. Fetch Session Info
  const { data: session } = await supabase
    .from('attendance_sessions')
    .select(`
      *,
      session_recipes (
        recipes (name)
      )
    `)
    .eq('id', params.id)
    .single()

  if (!session) notFound()

  // 2. Fetch Attendance Summary
  const { data: attendanceSummary } = await supabase.rpc('get_session_attendance_summary', {
    p_session_id: params.id
  })

  const attendance = attendanceSummary?.[0] || { total_count: 0, records: [] }

  // 3. Fetch Variance Analysis
  const { data: varianceData } = await supabase.rpc('get_variance_analysis', {
    p_tenant_id: user.tenant_id,
    p_session_id: params.id
  })

  // 4. Fetch Cost Calculation
  const { data: costData } = await supabase.rpc('calculate_session_cost', {
    p_session_id: params.id
  })

  const totalCost = costData?.reduce((acc: number, item: any) => acc + item.line_cost, 0) || 0
  const costPerPlate = session.actual_attendance > 0 ? totalCost / session.actual_attendance : 0

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link href="/inventory/consumption" className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Consumption
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Session Report</h1>
            <Badge variant={session.status === 'deduction_completed' ? 'success' : 'warning' as any} className="font-bold">
              {session.status === 'deduction_completed' ? 'DEDUCTED' : 'CALCULATED'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Detailed breakdown for {session.meal_type} on {new Date(session.session_date).toLocaleDateString('en-US', { dateStyle: 'full' })}
          </p>
        </div>
        <Button variant="outline" className="shadow-sm">
          <Receipt className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Key Metrics */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <Card className="shadow-sm border-primary/10">
            <CardHeader className="pb-2 bg-muted/20 border-b">
              <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-3xl font-black">{session.actual_attendance}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Present Users</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-muted-foreground">{session.expected_attendance}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Expected</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Variance:</span>
                  <span className={session.actual_attendance >= session.expected_attendance ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                    {session.actual_attendance - session.expected_attendance > 0 ? '+' : ''}{session.actual_attendance - session.expected_attendance}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Turnout %:</span>
                  <span className="font-bold">
                    {Math.round((session.actual_attendance / (session.expected_attendance || 1)) * 100)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-primary/10">
            <CardHeader className="pb-2 bg-muted/20 border-b">
              <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Financial Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <p className="text-3xl font-black text-primary">${totalCost.toFixed(2)}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Session Cost</p>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  <p className="text-xl font-bold">${costPerPlate.toFixed(2)}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Cost Per Serving</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
             <CardHeader className="pb-2 border-b">
                <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                   <Utensils className="h-4 w-4" />
                   Menu Selection
                </CardTitle>
             </CardHeader>
             <CardContent className="pt-4">
                <div className="flex flex-wrap gap-2">
                   {session.session_recipes?.map((sr: any) => (
                      <Badge key={sr.recipes.name} variant="outline" className="bg-primary/5 text-primary border-primary/20">
                         {sr.recipes.name}
                      </Badge>
                   ))}
                </div>
             </CardContent>
          </Card>
        </div>

        {/* Detailed Tables */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="text-lg">Ingredient Variance Analysis</CardTitle>
              <CardDescription>Comparison of system expected quantities vs actual reported usage.</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Cost Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {varianceData?.map((v: any) => {
                    const costItem = costData?.find((c: any) => c.inventory_item_id === v.inventory_item_id)
                    return (
                      <TableRow key={v.inventory_item_id}>
                        <TableCell>
                          <p className="font-bold">{v.item_name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{v.unit}</p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">{v.expected_qty.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{v.actual_qty.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">
                           <span className={v.variance_qty > 0 ? 'text-red-600' : v.variance_qty < 0 ? 'text-green-600' : ''}>
                              {v.variance_qty > 0 ? '+' : ''}{v.variance_qty.toFixed(2)}
                           </span>
                        </TableCell>
                        <TableCell className="text-right">
                           <div className="flex flex-col items-end">
                              <span className="font-bold">${costItem?.line_cost.toFixed(2)}</span>
                              <span className="text-[10px] text-muted-foreground">{costItem?.cost_share_pct}%</span>
                           </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {(!varianceData || varianceData.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">
                        No consumption data recorded for this session.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="text-lg">Presence Log</CardTitle>
              <CardDescription>Individual attendance records for this session.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-muted/30 sticky top-0 z-10">
                    <TableRow>
                      <TableHead>Member Name</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.records.map((record: any) => (
                      <TableRow key={record.record_id}>
                        <TableCell className="font-medium">{record.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-2">
                             <Clock className="h-3 w-3" />
                             {new Date(record.marked_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            {record.method}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {attendance.records.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-20 text-muted-foreground italic">
                          No presence records found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
