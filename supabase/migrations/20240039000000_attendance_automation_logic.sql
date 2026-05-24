/*
 * PRD: Automation Logic for Attendance Sessions
 * 1. Implements process_attendance_schedules() function.
 * 2. This function is designed to be called by a cron job every minute.
 */

CREATE OR REPLACE FUNCTION public.process_attendance_schedules()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now           timestamptz := now();
  v_today         date        := (v_now AT TIME ZONE 'UTC')::date;
  v_current_time  time        := (v_now AT TIME ZONE 'UTC')::time;
  v_day_index     integer     := extract(dow from v_now); -- 0=Sunday
  v_sched         RECORD;
BEGIN
  -- Iterate through active schedules that apply to today
  FOR v_sched IN 
    SELECT * FROM public.attendance_schedules
    WHERE is_active = true
    AND v_day_index = ANY(days_of_week)
    -- Check if the schedule start_time is within the last 5 minutes 
    -- to avoid missing a window if cron is slightly delayed
    AND start_time <= v_current_time
    AND start_time > (v_current_time - interval '5 minutes')
  LOOP
    -- Idempotency check: Does a session already exist for this tenant/date/meal_type?
    IF NOT EXISTS (
      SELECT 1 FROM public.attendance_sessions
      WHERE tenant_id = v_sched.tenant_id
      AND session_date = v_today
      AND meal_type = v_sched.meal_type
    ) THEN
      -- Create the session
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
        v_today,
        v_sched.meal_type,
        v_sched.label || ' (Auto)',
        true,
        v_sched.scan_mode,
        v_sched.created_by, -- System records the scheduler as the starter
        v_now,
        v_sched.branch_id,
        'attendance_live'
      );
      
      RAISE NOTICE 'Created auto session for tenant %: %', v_sched.tenant_id, v_sched.label;
    END IF;
  END LOOP;
END;
$$;

-- Grant execution to service_role (for cron triggers)
GRANT EXECUTE ON FUNCTION public.process_attendance_schedules TO service_role;
