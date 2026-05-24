/*
 * PRD: Add missing invitation conflict check RPC
 * This function is used by the invite API to ensure an email isn't already 
 * in use across the entire platform before attempting to create an auth user.
 */

CREATE OR REPLACE FUNCTION public.check_user_invitation_conflict(
  p_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- We check auth.users because that is the source of truth for 
  -- identity across all tenants.
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email = lower(trim(p_email))
  ) INTO v_exists;

  RETURN v_exists;
END;
$$;

-- Only service role can call this (API routes)
GRANT EXECUTE ON FUNCTION public.check_user_invitation_conflict(text)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.check_user_invitation_conflict(text)
  FROM PUBLIC, anon, authenticated;
