/*
 * PRD: Robust JWT Claim Extraction
 * Ensuring tenant_id and role are extracted even if Supabase metadata structure varies.
 */

CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id'),
    (auth.jwt() -> 'user_metadata' ->> 'tenant_id'),
    (auth.jwt() ->> 'tenant_id')
  )::uuid
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    (auth.jwt() ->> 'role'),
    'member'
  )::text
$$;
