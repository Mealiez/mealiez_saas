"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import AddTransactionModal from './AddTransactionModal'
import { TransactionType } from '@/lib/validations/inventory'

/**
 * FILE 2: app/(web)/inventory/StockOverview.tsx
 */

export type StockRow = {
  item_id: string
  item_name: string
  category_name: string
  category_color: string
  unit: string
  current_stock: number
  min_stock_level: number
  stock_status: 'ok' | 'low_stock' | 'out_of_stock'
  last_updated_at: string
}

interface StockOverviewProps {
  initialStock: StockRow[]
  canManage: boolean
}

export default function StockOverview({ initialStock, canManage }: StockOverviewProps) {
  const [stock, setStock] = useState<StockRow[]>(initialStock)
  const [filter, setFilter] = useState<'all' | 'low_stock' | 'out_of_stock' | 'ok'>('all')
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<StockRow | null>(null)
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)
  const [transactionType, setTransactionType] = useState<TransactionType>('purchase')

  // Derived filtered stock
  const filteredStock = stock.filter(item => {
    const matchesFilter = filter === 'all' || item.stock_status === filter
    const matchesSearch = item.item_name.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Tab count badges
  const counts = {
    all: stock.length,
    out_of_stock: stock.filter(i => i.stock_status === 'out_of_stock').length,
    low_stock: stock.filter(i => i.stock_status === 'low_stock').length,
    ok: stock.filter(i => i.stock_status === 'ok').length,
  }

  const handleTransactionAdded = async () => {
    const res = await fetch('/api/inventory/stock')
    const data = await res.json()
    setStock(data.data ?? [])
  }

  const openTransactionModal = (item: StockRow, type: TransactionType) => {
    setSelectedItem(item)
    setTransactionType(type)
    setIsTransactionModalOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/50 p-1">
          {(['all', 'out_of_stock', 'low_stock', 'ok'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
              }`}
            >
              {f === 'all' ? 'All' : f === 'out_of_stock' ? 'Out of Stock' : f === 'low_stock' ? 'Low Stock' : 'Healthy'}
              <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                filter === f ? 'bg-muted text-foreground' : 'bg-background/50'
              }`}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative max-w-sm flex-1">
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/50 transition-colors">
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Current Stock</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Min Level</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Last Updated</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredStock.map(item => (
                <tr key={item.item_id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4 font-medium">{item.item_name}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-2 w-2 rounded-full" 
                        style={{ backgroundColor: item.category_color }}
                      />
                      <span className="text-muted-foreground">{item.category_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 font-mono">
                        {item.current_stock} <span className="text-xs text-muted-foreground">{item.unit}</span>
                      </div>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div 
                          className={`h-full transition-all ${
                            item.stock_status === 'out_of_stock' ? 'bg-red-500 w-0' :
                            item.stock_status === 'low_stock' ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ 
                            width: item.current_stock === 0 ? '0%' : 
                                   item.min_stock_level > 0 
                                   ? `${Math.min((item.current_stock / item.min_stock_level) * 100, 100)}%`
                                   : '100%'
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-4 sm:table-cell text-muted-foreground">
                    {item.min_stock_level} {item.unit}
                  </td>
                  <td className="px-4 py-4">
                    {item.stock_status === 'out_of_stock' && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                        Out of Stock
                      </span>
                    )}
                    {item.stock_status === 'low_stock' && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Low Stock
                      </span>
                    )}
                    {item.stock_status === 'ok' && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Healthy
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-4 md:table-cell text-muted-foreground">
                    {item.last_updated_at ? new Date(item.last_updated_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {canManage && (
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openTransactionModal(item, 'purchase')}
                        >
                          Add Stock
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openTransactionModal(item, 'consumption')}
                        >
                          Use
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredStock.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No items found matching your filters.
          </div>
        )}
      </div>

      {isTransactionModalOpen && selectedItem && (
        <AddTransactionModal
          item={selectedItem}
          defaultType={transactionType}
          isOpen={isTransactionModalOpen}
          onClose={() => setIsTransactionModalOpen(false)}
          onSuccess={handleTransactionAdded}
        />
      )}
    </div>
  )
}
