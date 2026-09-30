ALTER TABLE public.attendance_sessions
  ADD COLUMN admin_latitude numeric,
  ADD COLUMN admin_longitude numeric,
  ADD COLUMN admin_accuracy numeric,
  ADD COLUMN admin_location_updated_at timestamptz;