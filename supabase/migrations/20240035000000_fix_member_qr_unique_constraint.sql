/*
 * PRD: Fix Member QR Codes Unique Constraint & RLS
 * 1. Resolves "duplicate key value violates unique constraint" by allowing multiple revoked tokens.
 * 2. Aligns member_qr_codes policies with ADR-005 (Super Admin support).
 * 3. Standardizes role checks using get_role_rank.
 */

-- ====================================================
-- SECTION 1 — FIX UNIQUE CONSTRAINT
-- ====================================================

-- Drop the restrictive unique constraint
ALTER TABLE public.member_qr_codes
  DROP CONSTRAINT IF EXISTS member_qr_codes_unique_active;

-- Create a partial unique index that only enforces uniqueness for ACTIVE tokens.
-- This allows a user to have many revoked tokens (history) but only one active one.
CREATE UNIQUE INDEX IF NOT EXISTS member_qr_codes_unique_active_idx 
  ON public.member_qr_codes (tenant_id, user_id) 
  WHERE (is_revoked = false);

-- ====================================================
-- SECTION 2 — ALIGN RLS POLICIES
-- ====================================================

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "member_qr_select_own" ON public.member_qr_codes;
DROP POLICY IF EXISTS "member_qr_insert_own_tenant" ON public.member_qr_codes;

-- SELECT: Members see their own, Manager+ see all in tenant, Super Admin sees everything
CREATE POLICY "member_qr_select"
ON public.member_qr_codes FOR SELECT
USING (
  (
    tenant_id = public.get_tenant_id()
    AND (
      user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
      OR public.get_role_rank(public.get_user_role()) >= 2 -- Manager+
    )
  )
  OR public.is_super_admin()
);

-- INSERT: Manager+ can issue/regenerate QR for users in their tenant
CREATE POLICY "member_qr_insert"
ON public.member_qr_codes FOR INSERT
WITH CHECK (
  (
    tenant_id = public.get_tenant_id()
    AND public.get_role_rank(public.get_user_role()) >= 2 -- Manager+
  )
  OR public.is_super_admin()
);

-- UPDATE: Manager+ can revoke/update QR for users in their tenant
CREATE POLICY "member_qr_update"
ON public.member_qr_codes FOR UPDATE
USING (
  (
    tenant_id = public.get_tenant_id()
    AND public.get_role_rank(public.get_user_role()) >= 2 -- Manager+
  )
  OR public.is_super_admin()
)
WITH CHECK (
  (
    tenant_id = public.get_tenant_id()
    AND public.get_role_rank(public.get_user_role()) >= 2 -- Manager+
  )
  OR public.is_super_admin()
);

-- DELETE: Admin only
CREATE POLICY "member_qr_delete"
ON public.member_qr_codes FOR DELETE
USING (
  (
    tenant_id = public.get_tenant_id()
    AND public.get_role_rank(public.get_user_role()) >= 3 -- Admin only
  )
  OR public.is_super_admin()
);
