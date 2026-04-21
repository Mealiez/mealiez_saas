-- ====================================================
-- SECTION 1 — ATTENDANCE SESSIONS TABLE
-- ====================================================

CREATE TABLE public.attendance_sessions (
  id              uuid PRIMARY KEY
                    DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL
                    REFERENCES public.tenants(id)
                    ON DELETE CASCADE,
  meal_plan_item_id uuid
                    REFERENCES public.meal_plan_items(id)
                    ON DELETE SET NULL,
  -- nullable: session can exist without a plan item
  -- (ad-hoc sessions)
  session_date    date NOT NULL,
  meal_type       text NOT NULL
                    CHECK (meal_type IN (
                      'breakfast','lunch',
                      'dinner','snack'
                    )),
  label           text NOT NULL,
  -- human readable: "Lunch - 5 Jan 2025"
  is_active       boolean NOT NULL DEFAULT true,
  -- false = QR no longer scannable
  started_by      uuid NOT NULL
                    REFERENCES public.users(id)
                    ON DELETE RESTRICT,
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  -- set when admin closes the session
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT attendance_sessions_ended_after_started
    CHECK (
      ended_at IS NULL
      OR ended_at >= started_at
    )
);

-- Indexes
CREATE INDEX idx_att_sessions_tenant
  ON public.attendance_sessions(tenant_id);

CREATE INDEX idx_att_sessions_date
  ON public.attendance_sessions(tenant_id, session_date);

CREATE INDEX idx_att_sessions_active
  ON public.attendance_sessions(tenant_id, is_active);

-- One active session per meal_type per day per tenant
CREATE UNIQUE INDEX idx_att_sessions_one_active
  ON public.attendance_sessions(
    tenant_id, session_date, meal_type
  )
  WHERE is_active = true;

-- ====================================================
-- SECTION 2 — ATTENDANCE RECORDS TABLE
-- ====================================================

CREATE TABLE public.attendance_records (
  id            uuid PRIMARY KEY
                  DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL
                  REFERENCES public.tenants(id)
                  ON DELETE CASCADE,
  session_id    uuid NOT NULL
                  REFERENCES public.attendance_sessions(id)
                  ON DELETE CASCADE,
  user_id       uuid NOT NULL
                  REFERENCES public.users(id)
                  ON DELETE CASCADE,
  marked_at     timestamptz NOT NULL DEFAULT now(),
  method        text NOT NULL DEFAULT 'qr'
                  CHECK (method IN ('qr', 'manual')),
  -- qr = scanned by member
  -- manual = marked by admin

  -- One record per user per session (idempotency)
  CONSTRAINT attendance_records_unique_per_session
    UNIQUE (session_id, user_id)
);

-- Indexes
CREATE INDEX idx_att_records_session
  ON public.attendance_records(session_id);

CREATE INDEX idx_att_records_tenant
  ON public.attendance_records(tenant_id);

CREATE INDEX idx_att_records_user
  ON public.attendance_records(tenant_id, user_id);

CREATE INDEX idx_att_records_date
  ON public.attendance_records(
    tenant_id, marked_at
  );

-- ====================================================
-- SECTION 3 — UPDATED_AT TRIGGERS
-- ====================================================

CREATE TRIGGER attendance_sessions_updated_at
  BEFORE UPDATE ON public.attendance_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- attendance_records has no updated_at
-- records are immutable once created

-- ====================================================
-- SECTION 4 — ENABLE RLS
-- ====================================================

ALTER TABLE public.attendance_sessions
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.attendance_records
  ENABLE ROW LEVEL SECURITY;

-- ====================================================
-- SECTION 5 — RLS POLICIES
-- ====================================================

--- ATTENDANCE SESSIONS ---

-- All members can view sessions
CREATE POLICY "att_sessions_select_own_tenant"
ON public.attendance_sessions FOR SELECT
USING (tenant_id = public.get_tenant_id());

-- Only manager+ can create sessions
CREATE POLICY "att_sessions_insert_own_tenant"
ON public.attendance_sessions FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN (
    'owner', 'admin', 'manager'
  )
);

-- Only manager+ can update sessions
CREATE POLICY "att_sessions_update_own_tenant"
ON public.attendance_sessions FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN (
    'owner', 'admin', 'manager'
  )
);

-- Only admin+ can delete sessions
CREATE POLICY "att_sessions_delete_own_tenant"
ON public.attendance_sessions FOR DELETE
USING (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('owner', 'admin')
);

--- ATTENDANCE RECORDS ---

-- All members can view records
CREATE POLICY "att_records_select_own_tenant"
ON public.attendance_records FOR SELECT
USING (tenant_id = public.get_tenant_id());

-- Any authenticated tenant member can insert
-- their own record (via QR scan)
CREATE POLICY "att_records_insert_own_tenant"
ON public.attendance_records FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
);

-- No UPDATE on records — immutable by design
-- No DELETE on records — audit trail

-- ====================================================
-- SECTION 6 — ATTENDANCE SUMMARY FUNCTION
-- ====================================================

CREATE OR REPLACE FUNCTION
public.get_session_attendance_summary(
  p_session_id uuid
)
RETURNS TABLE (
  session_id    uuid,
  session_label text,
  session_date  date,
  meal_type     text,
  total_count   bigint,
  records       jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id            AS session_id,
    s.label         AS session_label,
    s.session_date,
    s.meal_type,
    COUNT(r.id)     AS total_count,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'record_id',  r.id,
          'user_id',    r.user_id,
          'full_name',  u.full_name,
          'marked_at',  r.marked_at,
          'method',     r.method
        )
        ORDER BY r.marked_at ASC
      ) FILTER (WHERE r.id IS NOT NULL),
      '[]'::jsonb
    )               AS records
  FROM public.attendance_sessions s
  LEFT JOIN public.attendance_records r
    ON r.session_id = s.id
  LEFT JOIN public.users u
    ON u.id = r.user_id
  WHERE s.id = p_session_id
  GROUP BY s.id, s.label, s.session_date, s.meal_type;
END;
$$;

GRANT EXECUTE ON FUNCTION
  public.get_session_attendance_summary
  TO authenticated;
