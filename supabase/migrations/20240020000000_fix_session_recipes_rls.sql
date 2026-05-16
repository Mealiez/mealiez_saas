/*
 * PRD: Fix RLS Policies for Session Recipes
 * Ensuring 'admin', 'owner', and 'manager' roles have correct permissions for assigning recipes to sessions.
 */

-- 1. Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "session_recipes_insert" ON public.session_recipes;
DROP POLICY IF EXISTS "session_recipes_delete" ON public.session_recipes;

-- 2. Create updated RBAC policies for 'session_recipes'
CREATE POLICY "session_recipes_insert"
ON public.session_recipes FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('owner', 'admin', 'manager')
);

CREATE POLICY "session_recipes_delete"
ON public.session_recipes FOR DELETE
USING (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('owner', 'admin', 'manager')
);
