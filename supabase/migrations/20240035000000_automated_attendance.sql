/*
 * PRD: Automated Attendance Module (Fixed QR)
 * Extends the existing dynamic attendance system to support permanent, 
 * auto-detecting QR codes for fixed branch locations.
 */

-- ====================================================
-- SECTION 1 — EXTEND EXISTING RECORDS
-- ====================================================

-- 1. Add attendance source enum/check
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS attendance_source text NOT NULL DEFAULT 'quick'
  CHECK (attendance_source IN ('quick', 'automated'));

-- 2. Modify records to make session_id nullable
-- Automated attendance records won't have a specific "session" record
ALTER TABLE public.attendance_records
  ALTER COLUMN session_id DROP NOT NULL;

-- 3. Add meal_type to records directly (required since session_id can be null)
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS meal_type text
  CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack'));

-- Backfill meal_type for existing records from their sessions
UPDATE public.attendance_records r
SET meal_type = s.meal_type
FROM public.attendance_sessions s
WHERE r.session_id = s.id AND r.meal_type IS NULL;

-- 4. Add branch_id to records (important for automated tracking)
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Backfill branch_id for existing records from their sessions
UPDATE public.attendance_records r
SET branch_id = s.branch_id
FROM public.attendance_sessions s
WHERE r.session_id = s.id AND r.branch_id IS NULL;

-- 5. Update Uniqueness Constraint
-- We need to prevent duplicate attendance per user, per meal_type, per day.
ALTER TABLE public.attendance_records
  DROP CONSTRAINT IF EXISTS attendance_records_unique_per_session;

-- New Constraint: One record per user per meal type per day
-- Note: We use an index for this to handle the date casting correctly
DROP INDEX IF EXISTS idx_att_records_one_per_meal_day;
CREATE UNIQUE INDEX idx_att_records_one_per_meal_day
  ON public.attendance_records(
    tenant_id, user_id, meal_type, (marked_at::date)
  );

-- ====================================================
-- SECTION 2 — AUTOMATED CONFIGURATION TABLE
-- ====================================================

CREATE TABLE IF NOT EXISTS public.attendance_fixed_configs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  is_enabled      boolean NOT NULL DEFAULT true,
  static_qr_token text NOT NULL UNIQUE,
  
  -- Time windows (stored as time type: 'HH:MM:SS')
  breakfast_start time NOT NULL DEFAULT '07:00:00',
  breakfast_end   time NOT NULL DEFAULT '10:30:00',
  lunch_start     time NOT NULL DEFAULT '12:00:00',
  lunch_end       time NOT NULL DEFAULT '15:30:00',
  dinner_start    time NOT NULL DEFAULT '19:00:00',
  dinner_end      time NOT NULL DEFAULT '22:30:00',
  
  created_by      uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Only one config per branch
  CONSTRAINT unique_config_per_branch UNIQUE (tenant_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_att_fixed_configs_tenant ON public.attendance_fixed_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_att_fixed_configs_token ON public.attendance_fixed_configs(static_qr_token);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_att_fixed_configs_updated_at ON public.attendance_fixed_configs;
CREATE TRIGGER trigger_att_fixed_configs_updated_at
  BEFORE UPDATE ON public.attendance_fixed_configs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================
-- SECTION 3 — RLS POLICIES FOR CONFIG
-- ====================================================

ALTER TABLE public.attendance_fixed_configs ENABLE ROW LEVEL SECURITY;

-- SELECT: All members can view configs
DROP POLICY IF EXISTS "fixed_configs_select" ON public.attendance_fixed_configs;
CREATE POLICY "fixed_configs_select"
ON public.attendance_fixed_configs FOR SELECT
USING (
  tenant_id = public.get_tenant_id()
  OR public.is_super_admin()
);

-- INSERT: Admin only
DROP POLICY IF EXISTS "fixed_configs_insert" ON public.attendance_fixed_configs;
CREATE POLICY "fixed_configs_insert"
ON public.attendance_fixed_configs FOR INSERT
WITH CHECK (
  (
    tenant_id = public.get_tenant_id()
    AND public.get_role_rank(public.get_user_role()) >= 3 -- Admin
  )
  OR public.is_super_admin()
);

-- UPDATE: Admin only
DROP POLICY IF EXISTS "fixed_configs_update" ON public.attendance_fixed_configs;
CREATE POLICY "fixed_configs_update"
ON public.attendance_fixed_configs FOR UPDATE
USING (
  tenant_id = public.get_tenant_id()
  OR public.is_super_admin()
)
WITH CHECK (
  (
    tenant_id = public.get_tenant_id()
    AND public.get_role_rank(public.get_user_role()) >= 3
  )
  OR public.is_super_admin()
);

-- DELETE: Admin only
DROP POLICY IF EXISTS "fixed_configs_delete" ON public.attendance_fixed_configs;
CREATE POLICY "fixed_configs_delete"
ON public.attendance_fixed_configs FOR DELETE
USING (
  (
    tenant_id = public.get_tenant_id()
    AND public.get_role_rank(public.get_user_role()) >= 3
  )
  OR public.is_super_admin()
);

-- ====================================================
-- SECTION 4 — UPDATE FEATURE FLAGS
-- ====================================================

ALTER TABLE public.tenant_features
  DROP CONSTRAINT IF EXISTS feature_key_allowed_values;

ALTER TABLE public.tenant_features
  ADD CONSTRAINT feature_key_allowed_values CHECK (feature_key IN (
    'meal_management', 'attendance_tracking', 
    'inventory_management', 'pre_meal_requests',
    'custom_reports', 'billing', 'branch_management',
    'attendance_quick_mode', 'attendance_automated_mode'
  ));

-- Backfill flags for existing tenants (default to quick enabled, automated disabled)
INSERT INTO public.tenant_features (tenant_id, feature_key, is_enabled)
SELECT id, 'attendance_quick_mode', true FROM public.tenants
ON CONFLICT (tenant_id, feature_key) DO NOTHING;

INSERT INTO public.tenant_features (tenant_id, feature_key, is_enabled)
SELECT id, 'attendance_automated_mode', false FROM public.tenants
ON CONFLICT (tenant_id, feature_key) DO NOTHING;
