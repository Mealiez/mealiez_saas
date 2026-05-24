"use client"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Filter, Calendar, Users, Calculator, CheckCircle2, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface ConsumptionHistoryProps {
  sessions: any[]
}

export default function ConsumptionHistory({ sessions }: ConsumptionHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'calculated' | 'deducted'>('all')

  const filteredSessions = sessions.filter(s => {
    if (filter === 'calculated') return s.status === 'finalized'
    if (filter === 'deducted') return s.status === 'deduction_completed'
    return true
  })

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border">
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground mr-2">Filter By:</span>
          <div className="flex gap-2">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilter('all')}
              className="h-8 rounded-full px-4"
            >
              All History
            </Button>
            <Button 
              variant={filter === 'calculated' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilter('calculated')}
              className="h-8 rounded-full px-4 flex items-center gap-2"
            >
              <Calculator className="h-3.5 w-3.5" />
              Calculated
            </Button>
            <Button 
              variant={filter === 'deducted' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setFilter('deducted')}
              className="h-8 rounded-full px-4 flex items-center gap-2"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Deducted
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          Showing {filteredSessions.length} records
        </div>
      </div>

      {/* History Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[180px]">Session Date</TableHead>
                <TableHead>Meal Type</TableHead>
                <TableHead className="text-center">Attendance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.map((session) => (
                <TableRow key={session.id} className="hover:bg-muted/20 transition-colors group">
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(session.session_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize bg-white shadow-sm font-bold">
                      {session.meal_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        {session.actual_attendance}
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                        {Math.round((session.actual_attendance / (session.expected_attendance || 1)) * 100)}% of expected
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {session.status === 'deduction_completed' ? (
                      <div className="flex items-center gap-2 text-green-600 font-bold text-xs">
                        <CheckCircle2 className="h-4 w-4" />
                        DEDUCTED
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
                        <Calculator className="h-4 w-4" />
                        CALCULATED
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/inventory/consumption/reports/${session.id}`}>
                      <Button variant="outline" size="sm" className="h-8 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary group-hover:border-primary group-hover:shadow-sm transition-all">
                        <FileText className="h-3.5 w-3.5 mr-2" />
                        View Report
                        <ChevronRight className="h-3.5 w-3.5 ml-1 opacity-50" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">
                    No historical sessions found for this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
