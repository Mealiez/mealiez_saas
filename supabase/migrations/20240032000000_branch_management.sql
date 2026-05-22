/*
 * PRD: Branch Management Module
 * Enterprise-grade multi-location support for Mealiez.
 */

-- ====================================================
-- SECTION 1 — UPDATE ALLOWED FEATURES
-- ====================================================

ALTER TABLE public.tenant_features
  DROP CONSTRAINT IF EXISTS feature_key_allowed_values;

ALTER TABLE public.tenant_features
  ADD CONSTRAINT feature_key_allowed_values CHECK (feature_key IN (
    'meal_management', 'attendance_tracking', 
    'inventory_management', 'pre_meal_requests',
    'custom_reports', 'billing', 'branch_management'
  ));

-- ====================================================
-- SECTION 2 — BRANCHES TABLE
-- ====================================================

CREATE TABLE public.branches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name            text NOT NULL,
  code            text NOT NULL, -- unique per tenant
  address         text,
  city            text,
  state           text,
  pincode         text,
  manager_name    text,
  manager_phone   text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Unique branch code within a tenant
  CONSTRAINT unique_branch_code_per_tenant UNIQUE (tenant_id, code),
  CONSTRAINT branch_name_length CHECK (char_length(name) >= 2)
);

CREATE INDEX idx_branches_tenant ON public.branches(tenant_id);
CREATE INDEX idx_branches_is_active ON public.branches(tenant_id, is_active);

-- Trigger for updated_at
CREATE TRIGGER trigger_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================
-- SECTION 3 — EXTEND EXISTING TABLES
-- ====================================================

-- 1. Users
ALTER TABLE public.users
  ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX idx_users_branch ON public.users(branch_id);

-- 2. Attendance Sessions
ALTER TABLE public.attendance_sessions
  ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX idx_att_sessions_branch ON public.attendance_sessions(branch_id);

-- 3. Inventory Transactions
ALTER TABLE public.inventory_transactions
  ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX idx_inv_tx_branch ON public.inventory_transactions(branch_id);

-- ====================================================
-- SECTION 4 — RLS POLICIES
-- ====================================================

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches_select"
ON public.branches FOR SELECT
USING (tenant_id = public.get_tenant_id());

CREATE POLICY "branches_insert"
ON public.branches FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('owner', 'admin')
);

CREATE POLICY "branches_update"
ON public.branches FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('owner', 'admin')
);

CREATE POLICY "branches_delete"
ON public.branches FOR DELETE
USING (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('owner', 'admin')
);

-- ====================================================
-- SECTION 5 — ANALYTICS HELPERS
-- ====================================================

CREATE OR REPLACE FUNCTION public.get_branch_stats(
  p_branch_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_count bigint;
  v_today_att    bigint;
  v_result       jsonb;
BEGIN
  -- 1. Member count
  SELECT count(*) INTO v_member_count
  FROM public.users
  WHERE branch_id = p_branch_id;

  -- 2. Today's attendance
  SELECT count(*) INTO v_today_att
  FROM public.attendance_records r
  JOIN public.attendance_sessions s ON s.id = r.session_id
  WHERE s.branch_id = p_branch_id
    AND s.session_date = current_date;

  v_result := jsonb_build_object(
    'member_count', v_member_count,
    'today_attendance', v_today_att
  );

  RETURN v_result;
END;
$$;

-- ====================================================
-- SECTION 6 — UPDATE SEEDING LOGIC
-- ====================================================

CREATE OR REPLACE FUNCTION public.seed_tenant_features(
  p_tenant_id uuid
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.tenant_features 
    (tenant_id, feature_key, is_enabled)
  VALUES
    (p_tenant_id, 'meal_management',      true),
    (p_tenant_id, 'attendance_tracking',  true),
    (p_tenant_id, 'inventory_management', false),
    (p_tenant_id, 'pre_meal_requests',    false),
    (p_tenant_id, 'custom_reports',       false),
    (p_tenant_id, 'billing',              true),
    (p_tenant_id, 'branch_management',    false)
  ON CONFLICT (tenant_id, feature_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_branch_stats(uuid) TO authenticated;

-- ====================================================
-- SECTION 7 — BACKFILL EXISTING TENANTS
-- ====================================================

INSERT INTO public.tenant_features (tenant_id, feature_key, is_enabled)
SELECT id, 'branch_management', false
FROM public.tenants
ON CONFLICT (tenant_id, feature_key) DO NOTHING;
