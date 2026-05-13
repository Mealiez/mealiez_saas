import { z } from 'zod'

// Zod v4 — use { error: '...' } not { errorMap }

/**
 * SCHEMA 1 — CreateCategorySchema
 */
export const CreateCategorySchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 chars')
    .max(100)
    .trim(),
  description: z.string().max(500)
    .optional().nullable(),
  color: z.string()
    .regex(
      /^#[0-9A-Fa-f]{6}$/,
      'Color must be a valid hex code'
    )
    .default('#6366F1')
})

/**
 * SCHEMA 2 — UpdateCategorySchema
 */
export const UpdateCategorySchema = z.object({
  name: z.string().min(2).max(100).trim()
    .optional(),
  description: z.string().max(500)
    .optional().nullable(),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
})

/**
 * SCHEMA 3 — CreateItemSchema
 */
export const CreateItemSchema = z.object({
  name: z.string()
    .min(2, 'Item name required')
    .max(200)
    .trim(),
  description: z.string().max(500)
    .optional().nullable(),
  category_id: z.string().uuid()
    .optional().nullable(),
  unit: z.enum(
    ['kg', 'g', 'l', 'ml', 'pcs',
      'dozen', 'bag', 'box',
      'bottle', 'pack'],
    { error: 'Invalid unit' }
  ),
  min_stock_level: z.number()
    .min(0, 'Min stock must be >= 0')
    .default(0)
})

/**
 * SCHEMA 4 — UpdateItemSchema
 */
export const UpdateItemSchema = z.object({
  name: z.string().min(2).max(200).trim()
    .optional(),
  description: z.string().max(500)
    .optional().nullable(),
  category_id: z.string().uuid()
    .optional().nullable(),
  unit: z.enum([
    'kg', 'g', 'l', 'ml', 'pcs',
    'dozen', 'bag', 'box', 'bottle', 'pack'
  ]).optional(),
  min_stock_level: z.number().min(0).optional(),
  is_active: z.boolean().optional()
})

/**
 * SCHEMA 5 — CreateTransactionSchema
 */
export const CreateTransactionSchema = z.object({
  item_id: z.string()
    .uuid('Invalid item ID'),
  transaction_type: z.enum(
    ['purchase', 'consumption',
      'adjustment', 'wastage'],
    { error: 'Invalid transaction type' }
  ),
  quantity: z.number()
    .refine(v => v !== 0, {
      error: 'Quantity cannot be zero'
    }),
  // Note: quantity is signed. API validates direction:
  // purchase   → must be positive
  // consumption/wastage → must be negative
  // adjustment → can be either
  unit_cost: z.number()
    .min(0)
    .optional()
    .nullable(),
  notes: z.string()
    .max(500)
    .optional()
    .nullable()
})
  .refine(
    data => {
      if (data.transaction_type === 'purchase') {
        return data.quantity > 0
      }
      if (
        data.transaction_type === 'consumption' ||
        data.transaction_type === 'wastage'
      ) {
        return data.quantity < 0
      }
      return true // adjustment can be either
    },
    {
      error: 'Quantity direction does not match transaction type'
    }
  )

/**
 * SCHEMA 6 — DismissAlertSchema
 */
export const DismissAlertSchema = z.object({
  is_dismissed: z.literal(true)
  // can only set to true, never false
})

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>
export type CreateItemInput = z.infer<typeof CreateItemSchema>
export type UpdateItemInput = z.infer<typeof UpdateItemSchema>
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>
export type DismissAlertInput = z.infer<typeof DismissAlertSchema>

export type TransactionType = 'purchase' | 'consumption' | 'adjustment' | 'wastage'

export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  purchase: 'Purchase',
  consumption: 'Consumption',
  adjustment: 'Adjustment',
  wastage: 'Wastage'
}

export const TRANSACTION_COLORS: Record<TransactionType, string> = {
  purchase: 'text-green-700 bg-green-50',
  consumption: 'text-blue-700 bg-blue-50',
  adjustment: 'text-amber-700 bg-amber-50',
  wastage: 'text-red-700 bg-red-50'
}

export const UNIT_LABELS: Record<string, string> = {
  kg: 'kg', g: 'g', l: 'L', ml: 'ml',
  pcs: 'pcs', dozen: 'dozen', bag: 'bag',
  box: 'box', bottle: 'bottle', pack: 'pack'
}
