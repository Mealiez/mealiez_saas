// Zod v4 — use { error: '...' } not { errorMap: ... }
// Zod v4 — use z.string().min(n, 'msg') for field errors
// Zod v4 — errorMap was removed in v4
// Zod version check: 4.3.6

import { z } from 'zod'

/**
 * Schema for inviting a new user to a tenant.
 */
export const InviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string()
    .min(2, 'Name must be at least 2 chars')
    .max(100)
    .trim(),
  phone: z.string()
    .max(20)
    .optional()
    .nullable(),
  role: z.enum(['manager', 'member'], { // ← UPDATED: admin removed
    error: 'Role must be manager or member'
  }),
  branch_id: z.string().uuid('Invalid branch').optional().nullable(),
  designation_id: z.string().uuid('Invalid designation').optional().nullable(),
  avatar_url: z.string().url().optional().nullable()
})

/**
 * Schema for updating a user's role.
 */
export const UpdateRoleSchema = z.object({
  role: z.enum(['manager', 'member'], { // ← UPDATED: admin removed
    error: 'Role must be manager or member'
  })
})

/**
 * Schema for updating a user's active status.
 */
export const UpdateStatusSchema = z.object({
  is_active: z.boolean()
})

export type InviteUserInput = z.infer<typeof InviteUserSchema>
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>
