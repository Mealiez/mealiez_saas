/*
 * PRD: Fix Meal Settings RLS
 * Adds missing INSERT policy for meal_settings table.
 */

-- 1. Allow Admins to insert their own tenant settings
-- (Necessary for upsert operations if seed row was deleted)
CREATE POLICY "meal_settings_insert"
ON public.meal_settings FOR INSERT
WITH CHECK (
  (
    tenant_id = public.get_tenant_id()
    AND public.get_role_rank(public.get_user_role()) >= 3 -- Admin+
  )
  OR public.is_super_admin()
);
