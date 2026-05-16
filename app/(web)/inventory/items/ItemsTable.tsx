"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

/**
 * FILE 6: app/(web)/inventory/items/ItemsTable.tsx
 */

export type ItemRow = {
  id: string
  name: string
  description: string | null
  unit: string
  min_stock_level: number
  is_active: boolean
  created_at: string
  inventory_categories: { name: string; color: string } | null
  inventory_stock: { current_stock: number } | null
}

interface ItemsTableProps {
  initialItems: ItemRow[]
  categories: { id: string; name: string; color: string }[]
}

export default function ItemsTable({ initialItems }: ItemsTableProps) {
  const [items, setItems] = useState<ItemRow[]>(initialItems)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tempMinStock, setTempMinStock] = useState<string>('')

  const toggleStatus = async (item: ItemRow) => {
    setIsUpdating(item.id)
    try {
      const newStatus = !item.is_active
      const res = await fetch(`/api/inventory/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus })
      })

      if (res.ok) {
        setItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, is_active: newStatus } : i
        ))
      }
    } catch (err) {
      console.error('Failed to update status:', err)
    } finally {
      setIsUpdating(null)
    }
  }

  const startEditing = (item: ItemRow) => {
    setEditingId(item.id)
    setTempMinStock(item.min_stock_level.toString())
  }

  const saveMinStock = async (item: ItemRow) => {
    setIsUpdating(item.id)
    try {
      const val = parseFloat(tempMinStock)
      if (isNaN(val) || val < 0) return

      const res = await fetch(`/api/inventory/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ min_stock_level: val })
      })

      if (res.ok) {
        setItems(prev => prev.map(i => 
          i.id === item.id ? { ...i, min_stock_level: val } : i
        ))
        setEditingId(null)
      }
    } catch (err) {
      console.error('Failed to update min stock:', err)
    } finally {
      setIsUpdating(null)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium text-center">Unit</th>
              <th className="px-4 py-3 font-medium">Min Stock (Alert)</th>
              <th className="px-4 py-3 font-medium">Current Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map(item => (
              <tr 
                key={item.id} 
                className={`transition-colors ${!item.is_active ? 'bg-muted/30 opacity-60' : 'hover:bg-muted/30'}`}
              >
                <td className="px-4 py-4">
                  <Link href={`/inventory/items/${item.id}`} className="hover:underline">
                    <div className="font-medium">{item.name}</div>
                  </Link>
                  {item.description && (
                    <div className="text-xs text-muted-foreground line-clamp-1">{item.description}</div>
                  )}
                </td>
                <td className="px-4 py-4">
                  {item.inventory_categories ? (
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-2 w-2 rounded-full" 
                        style={{ backgroundColor: item.inventory_categories.color }}
                      />
                      <span>{item.inventory_categories.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic text-xs">Uncategorized</span>
                  )}
                </td>
                <td className="px-4 py-4 text-center font-mono text-xs uppercase text-muted-foreground">
                  {item.unit}
                </td>
                <td className="px-4 py-4">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={tempMinStock}
                        onChange={(e) => setTempMinStock(e.target.value)}
                        className="w-20 rounded border border-input bg-background px-2 py-1 text-xs outline-none ring-offset-background focus:ring-1 focus:ring-ring"
                        autoFocus
                      />
                      <Button size="xs" onClick={() => saveMinStock(item)}>Save</Button>
                      <Button size="xs" variant="ghost" onClick={() => setEditingId(null)}>×</Button>
                    </div>
                  ) : (
                    <div 
                      className="cursor-pointer hover:underline flex items-center gap-1"
                      onClick={() => startEditing(item)}
                    >
                      {item.min_stock_level}
                      <span className="text-[10px] text-muted-foreground">✎</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 font-mono font-medium">
                  {item.inventory_stock?.current_stock ?? 0}
                </td>
                <td className="px-4 py-4">
                  {item.is_active ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-800">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => toggleStatus(item)}
                    disabled={isUpdating === item.id}
                  >
                    {item.is_active ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && (
        <div className="p-8 text-center text-muted-foreground italic">
          No items created yet. Start by adding your first product.
        </div>
      )}
    </div>
  )
}
