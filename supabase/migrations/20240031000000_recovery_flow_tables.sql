-- ================================================
-- SECTION 1: PASSWORD RESET OTPs TABLE
-- ================================================

CREATE TABLE public.password_reset_otps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  otp_hash    text NOT NULL,
  expires_at  timestamptz NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  used        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by email and used status
CREATE INDEX idx_reset_otps_email_unused 
  ON public.password_reset_otps(email) 
  WHERE used = false;

-- ================================================
-- SECTION 2: RECOVERY AUDIT LOG
-- ================================================

CREATE TABLE public.recovery_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  event_type  text NOT NULL, -- 'link_sent', 'otp_sent', 'otp_success', 'otp_failure'
  ip_address  text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recovery_audit_email ON public.recovery_audit_log(email);

-- ================================================
-- SECTION 3: RLS (Disabled for these internal tables)
-- ================================================

-- We don't enable RLS because these are managed 
-- exclusively by the Service Role via API routes.
ALTER TABLE public.password_reset_otps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_audit_log DISABLE ROW LEVEL SECURITY;
