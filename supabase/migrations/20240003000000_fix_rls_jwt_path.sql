-- ================================================
-- SECTION 1: DROP ALL BROKEN POLICIES
-- ================================================

-- TENANTS
DROP POLICY IF EXISTS "tenants_select_own_tenant" 
  ON public.tenants;
DROP POLICY IF EXISTS "tenants_update_own_tenant" 
  ON public.tenants;

-- USERS
DROP POLICY IF EXISTS "users_select_own_tenant" 
  ON public.users;
DROP POLICY IF EXISTS "users_insert_own_tenant" 
  ON public.users;
DROP POLICY IF EXISTS "users_update_own_tenant" 
  ON public.users;
DROP POLICY IF EXISTS "users_delete_own_tenant" 
  ON public.users;

-- TENANT_FEATURES
DROP POLICY IF EXISTS "tenant_features_select_own_tenant" 
  ON public.tenant_features;
DROP POLICY IF EXISTS "tenant_features_insert_own_tenant" 
  ON public.tenant_features;
DROP POLICY IF EXISTS "tenant_features_update_own_tenant" 
  ON public.tenant_features;
DROP POLICY IF EXISTS "tenant_features_delete_own_tenant" 
  ON public.tenant_features;

-- ================================================
-- SECTION 2: HELPER FUNCTION
-- ================================================

CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT (
    auth.jwt() -> 'app_metadata' ->> 'tenant_id'
  )::uuid
$$;

-- ================================================
-- SECTION 3: RECREATE TENANTS POLICIES
-- ================================================

CREATE POLICY "tenants_select_own_tenant"
ON public.tenants FOR SELECT
USING (id = public.get_tenant_id());

CREATE POLICY "tenants_update_own_tenant"
ON public.tenants FOR UPDATE
USING (id = public.get_tenant_id())
WITH CHECK (id = public.get_tenant_id());

-- ================================================
-- SECTION 4: RECREATE USERS POLICIES
-- ================================================

-- See Fix 2 below — these are replaced with RBAC-aware
-- policies in the same migration (do not create 
-- simple tenant-only policies for users table here,
-- wait for STEP in Fix 2 section)

-- ================================================
-- SECTION 5: RECREATE TENANT_FEATURES POLICIES
-- ================================================

CREATE POLICY "tenant_features_select_own_tenant"
ON public.tenant_features FOR SELECT
USING (tenant_id = public.get_tenant_id());

CREATE POLICY "tenant_features_insert_own_tenant"
ON public.tenant_features FOR INSERT
WITH CHECK (tenant_id = public.get_tenant_id());

CREATE POLICY "tenant_features_update_own_tenant"
ON public.tenant_features FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (tenant_id = public.get_tenant_id());

CREATE POLICY "tenant_features_delete_own_tenant"
ON public.tenant_features FOR DELETE
USING (tenant_id = public.get_tenant_id());
