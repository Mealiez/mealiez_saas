-- ====================================================
-- SECTION 1 — EXTEND attendance_records.method
-- ====================================================

ALTER TABLE public.attendance_records
  DROP CONSTRAINT IF EXISTS
    attendance_records_method_check;

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_method_check
    CHECK (method IN (
      'qr',           -- legacy, keep for compat
      'qr_session',   -- Mode A: member scans session QR
      'qr_member',    -- Mode B: admin scans member QR
      'manual'        -- manual mark by admin
    ));

-- ====================================================
-- SECTION 2 — ADD scan_mode TO attendance_sessions
-- ====================================================

ALTER TABLE public.attendance_sessions
  ADD COLUMN scan_mode text NOT NULL DEFAULT 'session'
    CHECK (scan_mode IN ('session', 'member'));

-- session: admin shows QR, members scan (Mode A)
-- member:  members show QR, admin scans  (Mode B)

COMMENT ON COLUMN public.attendance_sessions.scan_mode IS
  'session = Mode A (member scans), member = Mode B (admin scans)';

-- ====================================================
-- SECTION 3 — member_qr_codes TABLE
-- ====================================================

-- Each user in a tenant gets one permanent QR identity.
-- This is their "badge" QR — not tied to any session.
-- Admin regenerates it to invalidate old screenshots.

CREATE TABLE public.member_qr_codes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL
                 REFERENCES public.tenants(id)
                 ON DELETE CASCADE,
  user_id      uuid NOT NULL
                 REFERENCES public.users(id)
                 ON DELETE CASCADE,
  token        text NOT NULL,
  -- signed payload — server-generated, never from client
  issued_at    timestamptz NOT NULL DEFAULT now(),
  issued_by    uuid NOT NULL
                 REFERENCES public.users(id)
                 ON DELETE RESTRICT,
  -- who generated/regenerated this QR
  is_revoked   boolean NOT NULL DEFAULT false,
  -- soft-revoke on regeneration

  -- One active QR per user per tenant
  CONSTRAINT member_qr_codes_unique_active
    UNIQUE (tenant_id, user_id)
);

-- Indexes
CREATE INDEX idx_member_qr_tenant
  ON public.member_qr_codes(tenant_id);

CREATE INDEX idx_member_qr_user
  ON public.member_qr_codes(tenant_id, user_id);

CREATE INDEX idx_member_qr_token
  ON public.member_qr_codes(token);
-- Used for fast lookup when admin scans

-- ====================================================
-- SECTION 4 — ENABLE RLS on member_qr_codes
-- ====================================================

ALTER TABLE public.member_qr_codes
  ENABLE ROW LEVEL SECURITY;

-- Members can view their OWN QR only
CREATE POLICY "member_qr_select_own"
ON public.member_qr_codes FOR SELECT
USING (
  tenant_id = public.get_tenant_id()
  AND (
    -- member sees their own QR
    user_id = (
      SELECT id FROM public.users
      WHERE auth_id = auth.uid()
    )
    OR
    -- admin/manager sees all QRs in tenant
    public.get_user_role() IN (
      'owner', 'admin', 'manager'
    )
  )
);

-- Only admin+ can insert (generate QR for user)
CREATE POLICY "member_qr_insert_own_tenant"
ON public.member_qr_codes FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN (
    'owner', 'admin', 'manager'
  )
);

-- Only admin+ can update (revoke / regenerate)
CREATE POLICY "member_qr_update_own_tenant"
ON public.member_qr_codes FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN (
    'owner', 'admin', 'manager'
  )
);

-- No DELETE — soft revoke only (audit trail)

-- ====================================================
-- SECTION 5 — QR_AUDIT_LOG TABLE
-- ====================================================

-- Enterprise requirement: every scan attempt logged
-- regardless of success or failure.
-- Used for security review and dispute resolution.

CREATE TABLE public.qr_scan_audit_log (
  id              uuid PRIMARY KEY
                    DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL
                    REFERENCES public.tenants(id)
                    ON DELETE CASCADE,
  scan_mode       text NOT NULL
                    CHECK (scan_mode IN (
                      'session', 'member'
                    )),
  scanned_by      uuid
                    REFERENCES public.users(id)
                    ON DELETE SET NULL,
  -- null if scanner account deleted
  target_user_id  uuid
                    REFERENCES public.users(id)
                    ON DELETE SET NULL,
  -- Mode B: the member whose QR was scanned
  session_id      uuid
                    REFERENCES public.attendance_sessions(id)
                    ON DELETE SET NULL,
  outcome         text NOT NULL
                    CHECK (outcome IN (
                      'success',
                      'already_marked',
                      'expired',
                      'invalid_signature',
                      'tenant_mismatch',
                      'session_closed',
                      'user_inactive',
                      'revoked'
                    )),
  scanned_at      timestamptz NOT NULL DEFAULT now(),
  ip_address      text,
  user_agent      text
);

-- Indexes — audit logs are write-heavy, read for reports
CREATE INDEX idx_qr_audit_tenant_time
  ON public.qr_scan_audit_log(tenant_id, scanned_at DESC);

CREATE INDEX idx_qr_audit_session
  ON public.qr_scan_audit_log(session_id);

CREATE INDEX idx_qr_audit_target
  ON public.qr_scan_audit_log(tenant_id, target_user_id);

-- RLS: read-only for admin+, insert via service role only
ALTER TABLE public.qr_scan_audit_log
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qr_audit_select_admin_only"
ON public.qr_scan_audit_log FOR SELECT
USING (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN (
    'owner', 'admin', 'manager'
  )
);

-- INSERT happens via service role in API routes only
-- No authenticated INSERT policy — app uses admin client

-- ====================================================
-- SECTION 6 — FUNCTION: generate_member_qr_token
-- ====================================================

-- Atomically revokes old QR and creates new one.
-- Called by API. Returns the new token string.

CREATE OR REPLACE FUNCTION public.generate_member_qr(
  p_user_id    uuid,
  p_tenant_id  uuid,
  p_issued_by  uuid,
  p_token      text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr_id uuid;
BEGIN
  -- Soft-revoke any existing active QR for this user
  UPDATE public.member_qr_codes
  SET    is_revoked = true
  WHERE  tenant_id = p_tenant_id
    AND  user_id   = p_user_id
    AND  is_revoked = false;

  -- Insert new QR record
  INSERT INTO public.member_qr_codes
    (tenant_id, user_id, token, issued_by)
  VALUES
    (p_tenant_id, p_user_id, p_token, p_issued_by)
  RETURNING id INTO v_qr_id;

  RETURN v_qr_id;
END;
$$;

-- Only service_role can call — never anon/authenticated
GRANT EXECUTE ON FUNCTION public.generate_member_qr
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.generate_member_qr
  FROM PUBLIC, anon, authenticated;
