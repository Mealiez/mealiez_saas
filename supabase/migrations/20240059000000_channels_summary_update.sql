CREATE OR REPLACE FUNCTION public.get_session_attendance_summary(p_session_id uuid)
RETURNS TABLE (
  session_id    uuid,
  session_label text,
  session_date  date,
  meal_type     text,
  attendance_mode text,
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
    s.attendance_mode,
    COUNT(r.id)     AS total_count,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'record_id',  r.id,
          'user_id',    r.user_id,
          'full_name',  u.full_name,
          'marked_at',  r.marked_at,
          'method',     r.method,
          'attendance_mode', r.attendance_mode,
          'verification_status', r.verification_status,
          'assigned_channel_id', r.assigned_channel_id,
          'detected_channel_id', r.detected_channel_id,
          'assigned_channel_name', ac.name,
          'detected_channel_name', dc.name
        )
        ORDER BY r.marked_at ASC
      ) FILTER (WHERE r.id IS NOT NULL),
      '[]'::jsonb
    ) AS records
  FROM public.attendance_sessions s
  LEFT JOIN public.attendance_records r ON r.session_id = s.id
  LEFT JOIN public.users u ON u.id = r.user_id
  LEFT JOIN public.channels ac ON ac.id = r.assigned_channel_id
  LEFT JOIN public.channels dc ON dc.id = r.detected_channel_id
  WHERE s.id = p_session_id
  GROUP BY s.id;
END;
$$;
