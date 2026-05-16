/*
 * PRD: ADR-005 Alignment for Meal Deductions
 * Ensuring 'admin' (formerly 'owner') and 'manager' roles have correct permissions.
 */

-- 1. Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "deductions_select" ON public.meal_deductions;
DROP POLICY IF EXISTS "deductions_insert" ON public.meal_deductions;
DROP POLICY IF EXISTS "deductions_update" ON public.meal_deductions;

-- 2. Create updated RBAC policies for 'meal_deductions'
CREATE POLICY "deductions_select"
ON public.meal_deductions FOR SELECT
USING (tenant_id = public.get_tenant_id());

CREATE POLICY "deductions_insert"
ON public.meal_deductions FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_role_rank(public.get_user_role()) >= 2 -- Manager or Admin
);

CREATE POLICY "deductions_update"
ON public.meal_deductions FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_role_rank(public.get_user_role()) >= 2
);
