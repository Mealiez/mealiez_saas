/*
 * PRD: Robust Automation Fix
 * 1. Bypasses RLS by making the automation function SECURITY DEFINER and using the postgres schema where possible.
 * 2. Standardizes search path for safety.
 * 3. Adds explicit starts_at timestamp to avoid null constraint violations.
 */

CREATE OR REPLACE FUNCTION public.process_attendance_schedules()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as the owner (bypassing RLS)
SET search_path = public, pg_catalog -- Explicit path security
AS $$
DECLARE
  v_now           timestamptz := now();
  v_sched         RECORD;
  v_tenant_tz     text;
  v_local_now     timestamptz;
  v_local_today   date;
  v_local_time    time;
  v_day_index     integer;
BEGIN
  -- Iterate through active schedules
  FOR v_sched IN 
    SELECT s.*, ms.timezone 
    FROM public.attendance_schedules s
    JOIN public.meal_settings ms ON ms.tenant_id = s.tenant_id
    WHERE s.is_active = true
  LOOP
    -- 1. Get the current time IN THE TENANT'S TIMEZONE
    v_tenant_tz   := COALESCE(v_sched.timezone, 'UTC');
    v_local_now   := v_now AT TIME ZONE v_tenant_tz;
    v_local_today := v_local_now::date;
    v_local_time  := v_local_now::time;
    v_day_index   := extract(dow from v_local_now);

    -- 2. Check if today is a scheduled day
    IF v_day_index = ANY(v_sched.days_of_week) THEN
      
      -- 3. Check if we are in the firing window (current time >= start_time AND within last 5 mins)
      -- We use a 5-minute buffer to ensure we don't miss a run
      IF v_sched.start_time <= v_local_time 
         AND v_sched.start_time > (v_local_time - interval '5 minutes') THEN
        
        -- 4. Idempotency check: Does a session already exist for this tenant/date/meal_type?
        IF NOT EXISTS (
          SELECT 1 FROM public.attendance_sessions
          WHERE tenant_id = v_sched.tenant_id
          AND session_date = v_local_today
          AND meal_type = v_sched.meal_type
        ) THEN
          -- 5. Create the session
          -- We explicitly include all required columns to avoid RLS/Trigger issues
          INSERT INTO public.attendance_sessions (
            tenant_id,
            session_date,
            meal_type,
            label,
            is_active,
            scan_mode,
            started_by,
            started_at,
            branch_id,
            status
          ) VALUES (
            v_sched.tenant_id,
            v_local_today,
            v_sched.meal_type,
            v_sched.label || ' (Auto)',
            true,
            v_sched.scan_mode,
            v_sched.created_by,
            v_now,
            v_sched.branch_id,
            'attendance_live'
          );
          
          RAISE NOTICE 'SUCCESS: Created auto session for tenant % in timezone %: %', v_sched.tenant_id, v_tenant_tz, v_sched.label;
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- IMPORTANT: Re-apply grants
GRANT EXECUTE ON FUNCTION public.process_attendance_schedules TO service_role;
GRANT EXECUTE ON FUNCTION public.process_attendance_schedules TO authenticated;
