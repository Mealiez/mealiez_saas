"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'

/**
 * FILE 4: app/(web)/inventory/LowStockAlerts.tsx
 */

export type AlertRow = {
  id: string
  alert_type: 'low_stock' | 'out_of_stock'
  current_stock: number
  min_stock_level: number
  created_at: string
  inventory_items: { name: string; unit: string }
}

interface LowStockAlertsProps {
  initialAlerts: AlertRow[]
}

export default function LowStockAlerts({ initialAlerts }: LowStockAlertsProps) {
  const [alerts, setAlerts] = useState<AlertRow[]>(initialAlerts)
  const [isDismissing, setIsDismissing] = useState<string | null>(null)

  const dismissAlert = async (alertId: string) => {
    setIsDismissing(alertId)
    try {
      await fetch(`/api/inventory/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_dismissed: true })
      })
      setAlerts(prev => prev.filter(a => a.id !== alertId))
    } catch (err) {
      console.error('Failed to dismiss alert:', err)
    } finally {
      setIsDismissing(null)
    }
  }

  if (alerts.length === 0) return null

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/30 overflow-hidden">
      <div className="bg-red-50 px-6 py-3 border-b border-red-200 flex items-center justify-between">
        <h2 className="text-sm font-bold text-red-800 flex items-center gap-2">
          <span>⚠️</span> Stock Alerts ({alerts.length})
        </h2>
      </div>

      <div className="divide-y divide-red-100">
        {alerts.map(alert => (
          <div key={alert.id} className="flex items-center justify-between px-6 py-4 hover:bg-red-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <span className="text-xl">
                {alert.alert_type === 'out_of_stock' ? '🚨' : '⚠️'}
              </span>
              <div className="space-y-0.5">
                <p className="font-semibold text-red-900">{alert.inventory_items.name}</p>
                <div className="flex gap-3 text-xs text-red-700">
                  <span>Current: <strong>{alert.current_stock} {alert.inventory_items.unit}</strong></span>
                  <span>Minimum: <strong>{alert.min_stock_level} {alert.inventory_items.unit}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                alert.alert_type === 'out_of_stock' 
                  ? 'bg-red-200 text-red-800' 
                  : 'bg-amber-200 text-amber-800'
              }`}>
                {alert.alert_type === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}
              </span>
              <Button
                size="xs"
                variant="outline"
                className="bg-white border-red-200 text-red-800 hover:bg-red-50"
                onClick={() => dismissAlert(alert.id)}
                disabled={isDismissing === alert.id}
              >
                {isDismissing === alert.id ? '...' : 'Dismiss'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
