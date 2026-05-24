/*
 * PRD: Attendance-Driven Consumption Auto Sync
 * 1. Enhances attendance_sessions with a robust status state.
 * 2. Implements a trigger to keep actual_attendance synced with records count.
 */

-- 1. Update session statuses to match requirements
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_status') THEN
    CREATE TYPE session_status AS ENUM (
      'pending', 
      'attendance_live', 
      'finalized', 
      'deduction_completed'
    );
  END IF;
END $$;

-- 2. Add status column if not exists (handling transition from prep_status)
ALTER TABLE public.attendance_sessions 
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Set initial status based on existing columns
UPDATE public.attendance_sessions
SET status = CASE 
  WHEN is_active = true THEN 'attendance_live'
  WHEN prep_status = 'COMPLETED' THEN 'deduction_completed'
  ELSE 'finalized'
END
WHERE status = 'pending';

-- 3. Create Trigger to Sync Actual Attendance
CREATE OR REPLACE FUNCTION public.sync_session_actual_attendance()
RETURNS TRIGGER AS $$
DECLARE
  v_session_id uuid;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    v_session_id := NEW.session_id;
  ELSE
    v_session_id := OLD.session_id;
  END IF;

  UPDATE public.attendance_sessions
  SET 
    actual_attendance = (
      SELECT COUNT(*) 
      FROM public.attendance_records 
      WHERE session_id = v_session_id
    ),
    updated_at = now()
  WHERE id = v_session_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply Trigger to attendance_records
DROP TRIGGER IF EXISTS trigger_sync_attendance ON public.attendance_records;
CREATE TRIGGER trigger_sync_attendance
  AFTER INSERT OR DELETE OR UPDATE ON public.attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_session_actual_attendance();

-- 5. Seed actual_attendance for existing sessions
UPDATE public.attendance_sessions s
SET actual_attendance = (
  SELECT COUNT(*) 
  FROM public.attendance_records r 
  WHERE r.session_id = s.id
);
