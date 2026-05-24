/*
 * PRD: Attendance Session Scheduling
 * 1. Creates attendance_schedules table to store recurring patterns.
 * 2. Implements RLS for tenant and role-based access.
 */

-- ====================================================
-- SECTION 1 — ATTENDANCE SCHEDULES TABLE
-- ====================================================

CREATE TABLE public.attendance_schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  meal_type       text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  label           text NOT NULL, -- e.g. "Standard Lunch"
  start_time      time NOT NULL, -- "12:00:00"
  days_of_week    integer[] NOT NULL DEFAULT '{}', -- [0, 1, 2, 3, 4, 5, 6] where 0=Sunday
  scan_mode       text NOT NULL DEFAULT 'member' CHECK (scan_mode IN ('member', 'admin')),
  is_active       boolean NOT NULL DEFAULT true,
  branch_id       uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  created_by      uuid NOT NULL REFERENCES public.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_att_schedules_tenant ON public.attendance_schedules(tenant_id);
CREATE INDEX idx_att_schedules_active ON public.attendance_schedules(tenant_id, is_active);

-- ====================================================
-- SECTION 2 — RLS POLICIES
-- ====================================================

ALTER TABLE public.attendance_schedules ENABLE ROW LEVEL SECURITY;

-- SELECT: All tenant members can see schedules (transparency)
CREATE POLICY "att_schedules_select"
ON public.attendance_schedules FOR SELECT
USING (
  tenant_id = public.get_tenant_id()
  OR public.is_super_admin()
);

-- INSERT/UPDATE/DELETE: Only Manager+ can modify schedules
CREATE POLICY "att_schedules_modify"
ON public.attendance_schedules FOR ALL
USING (
  (
    tenant_id = public.get_tenant_id()
    AND public.get_role_rank(public.get_user_role()) >= 2 -- Manager+
  )
  OR public.is_super_admin()
)
WITH CHECK (
  (
    tenant_id = public.get_tenant_id()
    AND public.get_role_rank(public.get_user_role()) >= 2
  )
  OR public.is_super_admin()
);

-- ====================================================
-- SECTION 3 — UPDATED_AT TRIGGER
-- ====================================================

CREATE TRIGGER trigger_attendance_schedules_updated_at
  BEFORE UPDATE ON public.attendance_schedules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
