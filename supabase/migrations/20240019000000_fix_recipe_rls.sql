/*
 * PRD: Fix RLS Policies for Recipe Management
 * Ensuring 'admin' role has correct permissions for recipes and ingredients.
 * Also added 'manager' role for common operations.
 */

-- 1. Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "recipes_insert" ON public.recipes;
DROP POLICY IF EXISTS "recipes_update" ON public.recipes;
DROP POLICY IF EXISTS "recipe_ingredients_insert" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "recipe_ingredients_update" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "recipe_ingredients_delete" ON public.recipe_ingredients;

-- 2. Create updated RBAC policies for 'recipes'
CREATE POLICY "recipes_insert"
ON public.recipes FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('owner', 'admin', 'manager')
);

CREATE POLICY "recipes_update"
ON public.recipes FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('owner', 'admin', 'manager')
);

-- 3. Create updated RBAC policies for 'recipe_ingredients'
CREATE POLICY "recipe_ingredients_insert"
ON public.recipe_ingredients FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('owner', 'admin', 'manager')
);

CREATE POLICY "recipe_ingredients_update"
ON public.recipe_ingredients FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('owner', 'admin', 'manager')
);

CREATE POLICY "recipe_ingredients_delete"
ON public.recipe_ingredients FOR DELETE
USING (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('owner', 'admin', 'manager')
);
