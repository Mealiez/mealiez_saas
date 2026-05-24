/*
 * PRD: Meal Request Module Schema
 * 1. Creates meal_requests table for advance booking.
 * 2. Implements RLS for tenant and role-based access.
 * 3. Adds uniqueness constraint for user + date + meal_type.
 */

-- ====================================================
-- SECTION 1 — MEAL REQUESTS TABLE
-- ====================================================

CREATE TABLE public.meal_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  meal_type    text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  status       text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'cancelled')),
  requested_at timestamptz NOT NULL DEFAULT now(),

  -- Constraint: One request per user per meal slot
  CONSTRAINT meal_requests_unique_slot UNIQUE (user_id, session_date, meal_type)
);

-- Indexes
CREATE INDEX idx_meal_requests_tenant ON public.meal_requests(tenant_id);
CREATE INDEX idx_meal_requests_user   ON public.meal_requests(user_id);
CREATE INDEX idx_meal_requests_date   ON public.meal_requests(session_date);

-- ====================================================
-- SECTION 2 — RLS POLICIES
-- ====================================================

ALTER TABLE public.meal_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: Members see their own, Managers+ see all in tenant
CREATE POLICY "meal_requests_select"
ON public.meal_requests FOR SELECT
USING (
  (
    tenant_id = public.get_tenant_id()
    AND (
      user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
      OR public.get_role_rank(public.get_user_role()) >= 2 -- Manager+
    )
  )
  OR public.is_super_admin()
);

-- INSERT: Members can request for themselves, Manager+ can request for anyone in tenant
CREATE POLICY "meal_requests_insert"
ON public.meal_requests FOR INSERT
WITH CHECK (
  (
    tenant_id = public.get_tenant_id()
    AND (
      user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
      OR public.get_role_rank(public.get_user_role()) >= 2 -- Manager+
    )
  )
  OR public.is_super_admin()
);

-- UPDATE: Members can cancel their own, Manager+ can update any in tenant
CREATE POLICY "meal_requests_update"
ON public.meal_requests FOR UPDATE
USING (
  (
    tenant_id = public.get_tenant_id()
    AND (
      user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
      OR public.get_role_rank(public.get_user_role()) >= 2 -- Manager+
    )
  )
  OR public.is_super_admin()
)
WITH CHECK (
  (
    tenant_id = public.get_tenant_id()
    AND (
      user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
      OR public.get_role_rank(public.get_user_role()) >= 2 -- Manager+
    )
  )
  OR public.is_super_admin()
);

-- DELETE: Admin only (for cleanup)
CREATE POLICY "meal_requests_delete"
ON public.meal_requests FOR DELETE
USING (
  (
    tenant_id = public.get_tenant_id()
    AND public.get_role_rank(public.get_user_role()) >= 3 -- Admin only
  )
  OR public.is_super_admin()
);
