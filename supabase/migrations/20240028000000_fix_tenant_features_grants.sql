/*
 * PRD: Fix tenant_features Permissions
 * 1. Explicitly grant SELECT to authenticated users.
 * 2. Re-assert RLS policy using robust get_tenant_id() helper.
 */

-- Ensure baseline permissions
GRANT SELECT ON public.tenant_features TO authenticated, service_role;

-- Re-create the policy to ensure it uses the latest get_tenant_id() logic
DROP POLICY IF EXISTS "tenant_features_select_own_tenant" ON public.tenant_features;

CREATE POLICY "tenant_features_select_own_tenant"
ON public.tenant_features FOR SELECT
USING (
  tenant_id = public.get_tenant_id()
  OR public.is_super_admin()
);

-- Also ensure the function is executable
GRANT EXECUTE ON FUNCTION public.get_tenant_id TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin TO authenticated, service_role;
