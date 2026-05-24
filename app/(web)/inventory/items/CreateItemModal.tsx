"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UNIT_LABELS } from '@/lib/validations/inventory'
import { useRouter } from 'next/navigation'

/**
 * FILE 7: app/(web)/inventory/items/CreateItemModal.tsx
 */

interface CategoryOption {
  id: string
  name: string
  color: string
}

interface CreateItemModalProps {
  categories: CategoryOption[]
}

export default function CreateItemModal({ categories }: CreateItemModalProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    category_id: '',
    unit: 'pcs',
    min_stock_level: '0'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          category_id: form.category_id || null,
          unit: form.unit,
          min_stock_level: parseFloat(form.min_stock_level) || 0
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          setError('Item name already exists')
        } else {
          setError(data.error || 'Failed to create item')
        }
        return
      }

      setIsOpen(false)
      setForm({
        name: '',
        description: '',
        category_id: '',
        unit: 'pcs',
        min_stock_level: '0'
      })
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Add New Item
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-xl border bg-background shadow-lg animate-in fade-in zoom-in duration-200">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Create New Item</h2>
              <p className="text-sm text-muted-foreground">Add a product to your inventory tracking</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tomato Sauce"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description (optional)</label>
                <input
                  type="text"
                  placeholder="Brand, size, or usage notes"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Category</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Unit</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                  >
                    {Object.entries(UNIT_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Min Stock Level (Alert Threshold)</label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.min_stock_level}
                  onChange={(e) => setForm({ ...form, min_stock_level: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-[10px] text-muted-foreground uppercase tracking-tight font-medium">
                  We'll alert you when stock falls below this level
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Item'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
