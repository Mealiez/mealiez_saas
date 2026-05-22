import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  TRANSACTION_LABELS, 
  TRANSACTION_COLORS, 
  TransactionType 
} from '@/lib/validations/inventory'
import { StockRow } from './StockOverview'

interface Branch {
  id: string
  name: string
}

interface AddTransactionModalProps {
  item: StockRow | null
  defaultType: TransactionType
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AddTransactionModal({
  item,
  defaultType,
  isOpen,
  onClose,
  onSuccess
}: AddTransactionModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    transaction_type: defaultType,
    quantity: '',
    unit_cost: '',
    branch_id: '',
    notes: ''
  })

  // Fetch branches
  useEffect(() => {
    if (isOpen) {
      fetch('/api/branches')
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            setBranches(data.data)
            if (data.data.length > 0) {
              setForm(prev => ({ ...prev, branch_id: data.data[0].id }))
            }
          }
        })
        .catch(err => console.error('Failed to fetch branches', err))
    }
  }, [isOpen])

  if (!isOpen || !item) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const qty = parseFloat(form.quantity)
      if (isNaN(qty) || qty <= 0) {
        throw new Error('Please enter a valid positive quantity')
      }

      // Quantity sign logic: consumption and wastage are negative
      const signedQty = ['consumption', 'wastage'].includes(form.transaction_type)
        ? -Math.abs(qty)
        : qty

      const response = await fetch('/api/inventory/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.item_id,
          transaction_type: form.transaction_type,
          quantity: signedQty,
          unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : null,
          branch_id: form.branch_id || null,
          notes: form.notes || null
        })
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 422) {
          setError(`Insufficient stock. Available: ${item.current_stock} ${item.unit}`)
        } else {
          setError(result.error || 'Failed to add transaction')
        }
        return
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl border bg-background shadow-lg animate-in fade-in zoom-in duration-200">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Add Transaction</h2>
          <p className="text-sm text-muted-foreground">{item.item_name}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="text-sm font-medium text-muted-foreground">Current Stock</span>
            <span className="font-mono font-bold">
              {item.current_stock} {item.unit}
            </span>
          </div>

          {/* Transaction Type Selector */}
          <div className="grid grid-cols-2 gap-2">
            {(['purchase', 'consumption', 'wastage', 'adjustment'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setForm({ ...form, transaction_type: type })}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  form.transaction_type === type
                    ? TRANSACTION_COLORS[type] + ' border-current ring-1 ring-current'
                    : 'border-input bg-background hover:bg-muted'
                }`}
              >
                {TRANSACTION_LABELS[type]}
              </button>
            ))}
          </div>

          {/* Branch Selector */}
          {branches.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Branch Location</label>
              <select
                value={form.branch_id}
                onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Global</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Quantity Input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Quantity ({item.unit})
              {['consumption', 'wastage'].includes(form.transaction_type) && (
                <span className="ml-1 text-[10px] text-muted-foreground uppercase">(Will be deducted)</span>
              )}
            </label>
            <input
              type="number"
              required
              min="0.001"
              step="0.001"
              placeholder="0.000"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Unit Cost (only for purchase) */}
          {form.transaction_type === 'purchase' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unit Cost (optional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.unit_cost}
                onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes (optional)</label>
            <textarea
              placeholder="Reason for adjustment, invoice number, etc."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Add Transaction'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
