/*
 * PRD: Designations System
 * 1. Creates designations table.
 * 2. Adds designation_id to users table.
 * 3. Implements RLS for designations.
 */

-- ====================================================
-- SECTION 1 — DESIGNATIONS TABLE
-- ====================================================

CREATE TABLE public.designations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- ====================================================
-- SECTION 2 — UPDATE USERS TABLE
-- ====================================================

ALTER TABLE public.users
ADD COLUMN designation_id uuid REFERENCES public.designations(id) ON DELETE SET NULL;

-- ====================================================
-- SECTION 3 — RLS POLICIES
-- ====================================================

ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;

-- SELECT: All tenant members can see designations
CREATE POLICY "designations_select"
ON public.designations FOR SELECT
USING (
  tenant_id = public.get_tenant_id()
  OR public.is_super_admin()
);

-- ALL: Only Admins can manage designations
CREATE POLICY "designations_admin_all"
ON public.designations FOR ALL
USING (
  (
    tenant_id = public.get_tenant_id()
    AND public.get_role_rank(public.get_user_role()) >= 3 -- Admin+
  )
  OR public.is_super_admin()
)
WITH CHECK (
  (
    tenant_id = public.get_tenant_id()
    AND public.get_role_rank(public.get_user_role()) >= 3
  )
  OR public.is_super_admin()
);

-- ====================================================
-- SECTION 4 — UPDATED_AT TRIGGER
-- ====================================================

CREATE TRIGGER trigger_designations_updated_at
  BEFORE UPDATE ON public.designations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
