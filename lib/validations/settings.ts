import { z } from 'zod'

/**
 * Schema for updating tenant profile information.
 */
export const UpdateTenantProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  contact_email: z.string().email('Invalid email address').optional(),
  contact_phone: z.string().max(20).optional().nullable(),
  timezone: z.string().optional(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  // Extended for super admin to include plan
  plan: z.enum(['trial', 'starter', 'pro', 'enterprise']).optional()
})

export type UpdateTenantProfileInput = z.infer<typeof UpdateTenantProfileSchema>
