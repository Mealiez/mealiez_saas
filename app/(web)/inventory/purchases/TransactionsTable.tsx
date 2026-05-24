"use client"

import { useState } from 'react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  ShoppingCart, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  AlertTriangle,
  Search,
  Filter
} from 'lucide-react'
import { TRANSACTION_LABELS, TRANSACTION_COLORS } from '@/lib/validations/inventory'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export type TransactionRow = {
  id: string
  item_id: string
  transaction_type: 'purchase' | 'consumption' | 'adjustment' | 'wastage'
  quantity: number
  unit_cost: number | null
  notes: string | null
  stock_before: number
  stock_after: number
  created_at: string
  inventory_items: {
    name: string
    unit: string
  }
}

interface TransactionsTableProps {
  initialTransactions: TransactionRow[]
}

export default function TransactionsTable({ initialTransactions }: TransactionsTableProps) {
  const [searchTerm, setSearchText] = useState('')
  const [typeFilter, setFilter] = useState<string>('all')

  const filtered = initialTransactions.filter(tx => {
    const matchesSearch = tx.inventory_items.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (tx.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    const matchesType = typeFilter === 'all' || tx.transaction_type === typeFilter
    return matchesSearch && matchesType
  })

  const getIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <ShoppingCart className="h-4 w-4" />
      case 'consumption': return <ArrowDownCircle className="h-4 w-4" />
      case 'adjustment': return <ArrowUpCircle className="h-4 w-4" />
      case 'wastage': return <AlertTriangle className="h-4 w-4" />
      default: return null
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/20 p-4 rounded-xl border">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search item or notes..." 
            value={searchTerm}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Button 
            variant={typeFilter === 'all' ? 'default' : 'outline'} 
            size="xs" 
            onClick={() => setFilter('all')}
            className="rounded-full px-4 h-8"
          >
            All
          </Button>
          {Object.entries(TRANSACTION_LABELS).map(([val, label]) => (
            <Button 
              key={val}
              variant={typeFilter === val ? 'default' : 'outline'} 
              size="xs" 
              onClick={() => setFilter(val)}
              className="rounded-full px-4 h-8 capitalize"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[180px]">Date & Time</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Stock (Bef → Aft)</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tx) => (
                <TableRow key={tx.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {tx.inventory_items.name}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`flex items-center gap-1.5 w-fit border-none shadow-none font-bold text-[10px] uppercase ${TRANSACTION_COLORS[tx.transaction_type]}`}
                    >
                      {getIcon(tx.transaction_type)}
                      {TRANSACTION_LABELS[tx.transaction_type]}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-mono font-bold ${tx.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.quantity > 0 ? '+' : ''}{tx.quantity} <span className="text-[10px] text-muted-foreground uppercase">{tx.inventory_items.unit}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {tx.unit_cost ? `$${tx.unit_cost.toFixed(2)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[10px] text-muted-foreground">
                    {tx.stock_before} → {tx.stock_after}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs italic text-muted-foreground">
                    {tx.notes || '—'}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
                    No transactions found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
