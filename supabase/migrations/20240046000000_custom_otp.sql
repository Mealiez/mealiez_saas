/*
 * PRD: Custom OTP Management
 * This table stores transient OTPs for Registration and Email Change flows.
 * These are sent via Resend SDK rather than Supabase SMTP.
 */

CREATE TABLE IF NOT EXISTS public.pending_otps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  otp         text NOT NULL,
  type        text NOT NULL, -- 'registration', 'email_change'
  metadata    jsonb DEFAULT '{}'::jsonb,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Index for cleanup and lookup
CREATE INDEX idx_pending_otps_email_type ON public.pending_otps(email, type);

-- Security: Only accessible via Service Role (API routes)
ALTER TABLE public.pending_otps ENABLE ROW LEVEL SECURITY;

-- Cleanup policy (optional but good practice)
-- Usually handled by a cron job or background worker
