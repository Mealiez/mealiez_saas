/*
 * Update invitation conflict check to support phone numbers
 */

CREATE OR REPLACE FUNCTION public.check_user_invitation_conflict(
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_exists boolean;
BEGIN
  IF p_email IS NOT NULL AND p_email <> '' THEN
    SELECT EXISTS (
      SELECT 1 FROM auth.users WHERE email = lower(trim(p_email))
    ) INTO v_exists;
  ELSIF p_phone IS NOT NULL AND p_phone <> '' THEN
    SELECT EXISTS (
      SELECT 1 FROM auth.users WHERE phone = trim(p_phone)
    ) INTO v_exists;
  ELSE
    RETURN FALSE;
  END IF;

  RETURN v_exists;
END;
$$;

-- Ensure grants are correct
GRANT EXECUTE ON FUNCTION public.check_user_invitation_conflict(text, text)
  TO service_role;
