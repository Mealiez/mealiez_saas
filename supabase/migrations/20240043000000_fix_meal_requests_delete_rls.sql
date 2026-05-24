/*
 * PRD: Fix Meal Request Cancellation RLS
 * 1. Allows members to delete their own meal requests (for cancellation).
 * 2. Allows managers to delete requests in their tenant.
 */

-- Drop the old restrictive delete policy
DROP POLICY IF EXISTS "meal_requests_delete" ON public.meal_requests;

-- CREATE NEW DELETE POLICY:
-- Members can delete their OWN requests.
-- Managers+ can delete ANY request in their tenant.
CREATE POLICY "meal_requests_delete"
ON public.meal_requests FOR DELETE
USING (
  (
    tenant_id = public.get_tenant_id()
    AND (
      user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
      OR public.get_role_rank(public.get_user_role()) >= 2 -- Manager+
    )
  )
  OR public.is_super_admin()
);
