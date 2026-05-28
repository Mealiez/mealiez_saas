/*
 * Resolve function ambiguity for check_user_invitation_conflict
 * Drops the old single-parameter version to ensure the new one is used.
 */

-- Drop the old version specifically
DROP FUNCTION IF EXISTS public.check_user_invitation_conflict(text);

-- Re-confirm the new version exists with correct grants
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

GRANT EXECUTE ON FUNCTION public.check_user_invitation_conflict(text, text) TO service_role;
