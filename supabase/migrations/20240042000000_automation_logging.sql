/*
 * PRD: Automation Logging and Schema Fix
 * 1. Creates automation_logs table for visibility.
 * 2. Fixes naming mismatch in scan_mode constraints.
 */

-- ====================================================
-- SECTION 1 — FIX SCAN MODE NAMES
-- ====================================================

-- Update attendance_schedules to match attendance_sessions nomenclature
ALTER TABLE public.attendance_schedules
  DROP CONSTRAINT IF EXISTS attendance_schedules_scan_mode_check;

ALTER TABLE public.attendance_schedules
  ADD CONSTRAINT attendance_schedules_scan_mode_check
    CHECK (scan_mode IN ('session', 'member'));

-- Update any existing data
UPDATE public.attendance_schedules SET scan_mode = 'session' WHERE scan_mode = 'member';
UPDATE public.attendance_schedules SET scan_mode = 'member' WHERE scan_mode = 'admin';

-- ====================================================
-- SECTION 2 — AUTOMATION LOGGING
-- ====================================================

CREATE TABLE IF NOT EXISTS public.automation_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  schedule_id  uuid REFERENCES public.attendance_schedules(id) ON DELETE SET NULL,
  event        text NOT NULL, -- 'trigger_fired', 'session_created', 'skipped_exists', 'error'
  details      jsonb DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS for logs (Admin can view)
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_logs_select" ON public.automation_logs FOR SELECT 
USING (tenant_id = public.get_tenant_id() OR public.is_super_admin());

-- ====================================================
-- SECTION 3 — UPDATED RPC LOGIC
-- ====================================================

CREATE OR REPLACE FUNCTION public.process_attendance_schedules()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_now           timestamptz := now();
  v_sched         RECORD;
  v_tenant_tz     text;
  v_local_now     timestamptz;
  v_local_today   date;
  v_local_time    time;
  v_day_index     integer;
  v_new_id        uuid;
BEGIN
  -- Iterate through active schedules
  FOR v_sched IN 
    SELECT s.*, ms.timezone 
    FROM public.attendance_schedules s
    JOIN public.meal_settings ms ON ms.tenant_id = s.tenant_id
    WHERE s.is_active = true
  LOOP
    BEGIN
      -- 1. Get current time in tenant TZ
      v_tenant_tz   := COALESCE(v_sched.timezone, 'UTC');
      v_local_now   := v_now AT TIME ZONE v_tenant_tz;
      v_local_today := v_local_now::date;
      v_local_time  := v_local_now::time;
      v_day_index   := extract(dow from v_local_now);

      -- 2. Check if today is a scheduled day
      IF v_day_index = ANY(v_sched.days_of_week) THEN
        
        -- 3. Window check
        IF v_sched.start_time <= v_local_time 
           AND v_sched.start_time > (v_local_time - interval '5 minutes') THEN
          
          -- 4. Idempotency check
          IF NOT EXISTS (
            SELECT 1 FROM public.attendance_sessions
            WHERE tenant_id = v_sched.tenant_id
            AND session_date = v_local_today
            AND meal_type = v_sched.meal_type
          ) THEN
            -- 5. Create the session
            INSERT INTO public.attendance_sessions (
              tenant_id, session_date, meal_type, label,
              is_active, scan_mode, started_by, started_at, branch_id, status
            ) VALUES (
              v_sched.tenant_id, v_local_today, v_sched.meal_type, v_sched.label || ' (Auto)',
              true, v_sched.scan_mode, v_sched.created_by, v_now, v_sched.branch_id, 'attendance_live'
            ) RETURNING id INTO v_new_id;

            INSERT INTO public.automation_logs (tenant_id, schedule_id, event, details)
            VALUES (v_sched.tenant_id, v_sched.id, 'session_created', jsonb_build_object('session_id', v_new_id, 'time', v_local_time));
          ELSE
            -- Log skip for debugging
            INSERT INTO public.automation_logs (tenant_id, schedule_id, event, details)
            VALUES (v_sched.tenant_id, v_sched.id, 'skipped_exists', jsonb_build_object('date', v_local_today, 'type', v_sched.meal_type));
          END IF;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log errors so they are visible in DB
      INSERT INTO public.automation_logs (tenant_id, schedule_id, event, details)
      VALUES (v_sched.tenant_id, v_sched.id, 'error', jsonb_build_object('msg', SQLERRM, 'code', SQLSTATE));
    END;
  END LOOP;
END;
$$;
