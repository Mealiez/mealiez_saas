/*
 * PRD: Realtime Enablement for Attendance Sync
 * Explicitly adds attendance tables to the supabase_realtime publication.
 * This ensures that updates to actual_attendance are broadcasted instantly.
 */

-- 1. Ensure the publication exists (Supabase creates it by default, but let's be safe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 2. Add attendance tables to the publication
-- We use a DO block to avoid errors if they are already added
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Table attendance_sessions already in publication or error: %', SQLERRM;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Table attendance_records already in publication or error: %', SQLERRM;
  END;
END $$;
