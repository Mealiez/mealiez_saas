/*
 * PRD: Storage & Branding Assets
 * 1. Creates 'avatar' bucket for users and tenants.
 * 2. Adds logo_url to tenants table.
 * 3. Adds avatar_url to users table.
 * 4. Implements Storage RLS for public read and protected upload.
 * 5. Updates onboarding function to support these assets.
 */

-- ========== SECTION 1: SCHEMA UPDATES ==========

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS logo_url text;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- ========== SECTION 2: STORAGE BUCKET ==========

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatar', 'avatar', true)
ON CONFLICT (id) DO NOTHING;

-- ========== SECTION 3: STORAGE RLS POLICIES ==========

-- Enable RLS on storage.objects if not already enabled

-- 1. Public Read Access for anyone
CREATE POLICY "Avatar Public Read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatar');

-- 2. Allow Public Upload Access (Necessary for Registration/Onboarding)
-- Note: 'public' role covers both 'anon' and 'authenticated'
CREATE POLICY "Avatar Public Upload"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'avatar');

-- 3. Owners can update their own files
CREATE POLICY "Avatar Owner Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatar' AND owner = auth.uid());

-- 4. Owners can delete their own files
CREATE POLICY "Avatar Owner Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatar' AND owner = auth.uid());

-- ========== SECTION 4: UPDATED ONBOARDING FUNCTION ==========

CREATE OR REPLACE FUNCTION public.onboard_new_tenant(
  p_auth_id     uuid,
  p_full_name   text,
  p_org_name    text,
  p_plan        text DEFAULT 'trial',
  p_logo_url    text DEFAULT NULL,
  p_avatar_url  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id   uuid;
  v_user_id     uuid;
  v_slug        text;
BEGIN
  v_slug := lower(
    regexp_replace(p_org_name, '[^a-zA-Z0-9]', '-', 'g')
  );
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 6);

  INSERT INTO public.tenants (name, slug, plan, logo_url)
  VALUES (p_org_name, v_slug, p_plan, p_logo_url)
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.users
    (tenant_id, auth_id, full_name, role, avatar_url)
  VALUES
    (v_tenant_id, p_auth_id, p_full_name, 'admin', p_avatar_url)
  RETURNING id INTO v_user_id;

  PERFORM public.seed_tenant_features(v_tenant_id);

  RETURN jsonb_build_object(
    'tenant_id', v_tenant_id,
    'user_id',   v_user_id,
    'slug',      v_slug,
    'role',      'admin'
  );

EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Onboarding failed: %', SQLERRM;
END;
$$;
