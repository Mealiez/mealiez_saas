/*
 * PRD: ADR-005 Alignment & Final RLS Fix
 * 1. Renames all 'owner' references to 'admin' in policies.
 * 2. Implements rank-based checks for robustness.
 * 3. Ensures tenant isolation is strictly enforced via get_tenant_id().
 */

DO $$ 
DECLARE 
  r RECORD;
BEGIN
  -- Drop all policies on the affected tables to ensure no conflicts
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('recipes', 'recipe_ingredients', 'session_recipes')) 
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
  END LOOP;
END $$;

-- 1. RECIPES POLICIES
CREATE POLICY "recipes_select"
ON public.recipes FOR SELECT
USING (tenant_id = public.get_tenant_id());

CREATE POLICY "recipes_insert"
ON public.recipes FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_role_rank(public.get_user_role()) >= 2 -- Manager or Admin
);

CREATE POLICY "recipes_update"
ON public.recipes FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_role_rank(public.get_user_role()) >= 2
);

CREATE POLICY "recipes_delete"
ON public.recipes FOR DELETE
USING (
  tenant_id = public.get_tenant_id()
  AND public.get_role_rank(public.get_user_role()) >= 3 -- Admin only
);

-- 2. RECIPE_INGREDIENTS POLICIES
CREATE POLICY "recipe_ingredients_select"
ON public.recipe_ingredients FOR SELECT
USING (tenant_id = public.get_tenant_id());

CREATE POLICY "recipe_ingredients_insert"
ON public.recipe_ingredients FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_role_rank(public.get_user_role()) >= 2
);

CREATE POLICY "recipe_ingredients_update"
ON public.recipe_ingredients FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_role_rank(public.get_user_role()) >= 2
);

CREATE POLICY "recipe_ingredients_delete"
ON public.recipe_ingredients FOR DELETE
USING (
  tenant_id = public.get_tenant_id()
  AND public.get_role_rank(public.get_user_role()) >= 2
);

-- 3. SESSION_RECIPES POLICIES
CREATE POLICY "session_recipes_select"
ON public.session_recipes FOR SELECT
USING (tenant_id = public.get_tenant_id());

CREATE POLICY "session_recipes_insert"
ON public.session_recipes FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_role_rank(public.get_user_role()) >= 2
);

CREATE POLICY "session_recipes_delete"
ON public.session_recipes FOR DELETE
USING (
  tenant_id = public.get_tenant_id()
  AND public.get_role_rank(public.get_user_role()) >= 2
);
