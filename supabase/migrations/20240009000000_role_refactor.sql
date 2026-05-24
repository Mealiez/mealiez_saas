/*
 * ADR-005: Super Admin Architecture Change
 *
 * The 'owner' role is being renamed to 'admin'.
 * Reason: 'owner' implied platform ownership.
 *   In reality it is a tenant-level role (mess admin).
 * 
 * A new SUPER ADMIN concept is introduced at the
 * platform level — stored in auth.users.app_metadata
 * as { is_super_admin: true } with NO tenant_id.
 * Super admin is NOT a row in public.users.
 * Super admin bypasses RLS via service_role API routes.
 *
 * TENANT ROLE HIERARCHY (new):
 *   admin(3) > manager(2) > member(1)
 *
 * PLATFORM LEVEL (new, separate domain):
 *   super_admin — Mealiez team only
 */

-- ====================================================
-- SECTION 1 — RENAME 'owner' → 'admin' IN EXISTING DATA
-- ====================================================

-- Step 1: Update existing rows in public.users
UPDATE public.users
SET role = 'admin'
WHERE role = 'owner';

-- Step 2: Drop old CHECK constraint on role column
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 3: Add new CHECK constraint without 'owner'
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'manager', 'member'));

-- VERIFY: no 'owner' rows remain
-- SELECT COUNT(*) FROM public.users WHERE role = 'owner';
-- Must return 0

-- ====================================================
-- SECTION 2 — UPDATE get_user_role() HELPER FUNCTION
-- ====================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT (
    auth.jwt() -> 'app_metadata' ->> 'role'
  )::text
$$;

-- ====================================================
-- SECTION 3 — ADD is_super_admin CHECK FUNCTION
-- ====================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean,
    false
  )
$$;

-- ====================================================
-- SECTION 4 — UPDATE RLS POLICIES TO ALLOW SUPER ADMIN
-- ====================================================

-- TENANTS
DROP POLICY IF EXISTS "tenants_select_own_tenant"
  ON public.tenants;

CREATE POLICY "tenants_select_own_tenant"
ON public.tenants FOR SELECT
USING (
  id = public.get_tenant_id()       -- normal tenant access
  OR public.is_super_admin()         -- super admin reads all
);

-- USERS
DROP POLICY IF EXISTS "users_select_own_tenant"
  ON public.users;

CREATE POLICY "users_select_own_tenant"
ON public.users FOR SELECT
USING (
  tenant_id = public.get_tenant_id()
  OR public.is_super_admin()
);

-- TENANT_FEATURES
DROP POLICY IF EXISTS "tenant_features_select_own_tenant"
  ON public.tenant_features;

CREATE POLICY "tenant_features_select_own_tenant"
ON public.tenant_features FOR SELECT
USING (
  tenant_id = public.get_tenant_id()
  OR public.is_super_admin()
);

-- ====================================================
-- SECTION 5 — UPDATE tenants_update_own_tenant POLICY
-- ====================================================

-- Handle both potential naming conventions for safety
DROP POLICY IF EXISTS "tenants_update_own_tenant"
  ON public.tenants;
DROP POLICY IF EXISTS "tenants_update_owner_only"
  ON public.tenants;

CREATE POLICY "tenants_update_admin_only"
ON public.tenants FOR UPDATE
USING (
  id = public.get_tenant_id()
  AND public.get_user_role() = 'admin'
)
WITH CHECK (
  id = public.get_tenant_id()
  AND public.get_user_role() = 'admin'
);

-- ====================================================
-- SECTION 6 — UPDATE onboard_new_tenant FUNCTION
-- ====================================================

CREATE OR REPLACE FUNCTION public.onboard_new_tenant(
  p_auth_id     uuid,
  p_full_name   text,
  p_org_name    text,
  p_plan        text DEFAULT 'trial'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id   uuid;
  v_user_id     uuid;
  v_slug        text;
BEGIN
  v_slug := lower(
    regexp_replace(p_org_name, '[^a-zA-Z0-9]', '-', 'g')
  );
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 6);

  INSERT INTO public.tenants (name, slug, plan)
  VALUES (p_org_name, v_slug, p_plan)
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.users
    (tenant_id, auth_id, full_name, role)
  VALUES
    (v_tenant_id, p_auth_id, p_full_name, 'admin')
  RETURNING id INTO v_user_id;

  PERFORM public.seed_tenant_features(v_tenant_id);

  RETURN jsonb_build_object(
    'tenant_id', v_tenant_id,
    'user_id',   v_user_id,
    'slug',      v_slug,
    'role',      'admin'
  );

EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Onboarding failed: %', SQLERRM;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.onboard_new_tenant
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.onboard_new_tenant
  TO service_role;
