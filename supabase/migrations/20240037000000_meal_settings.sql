/*
 * PRD: Meal Settings and Time Config
 * 1. Creates meal_settings table to store session times per tenant.
 * 2. Implements RLS (Managers+ can view, Admins can update).
 * 3. Adds automatic seeding for new tenants.
 */

-- ====================================================
-- SECTION 1 — MEAL SETTINGS TABLE
-- ====================================================

CREATE TABLE public.meal_settings (
  tenant_id       uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  breakfast_start time NOT NULL DEFAULT '07:00',
  breakfast_end   time NOT NULL DEFAULT '09:00',
  lunch_start     time NOT NULL DEFAULT '12:00',
  lunch_end       time NOT NULL DEFAULT '14:00',
  dinner_start    time NOT NULL DEFAULT '19:00',
  dinner_end      time NOT NULL DEFAULT '21:00',
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ====================================================
-- SECTION 2 — RLS POLICIES
-- ====================================================

ALTER TABLE public.meal_settings ENABLE ROW LEVEL SECURITY;

-- SELECT: All tenant members can see times (to show countdowns)
CREATE POLICY "meal_settings_select"
ON public.meal_settings FOR SELECT
USING (
  tenant_id = public.get_tenant_id()
  OR public.is_super_admin()
);

-- UPDATE: Only Admins can modify times
CREATE POLICY "meal_settings_update"
ON public.meal_settings FOR UPDATE
USING (
  (
    tenant_id = public.get_tenant_id()
    AND public.get_role_rank(public.get_user_role()) >= 3 -- Admin+
  )
  OR public.is_super_admin()
)
WITH CHECK (
  (
    tenant_id = public.get_tenant_id()
    AND public.get_role_rank(public.get_user_role()) >= 3
  )
  OR public.is_super_admin()
);

-- ====================================================
-- SECTION 3 — UPDATED_AT TRIGGER
-- ====================================================

CREATE TRIGGER trigger_meal_settings_updated_at
  BEFORE UPDATE ON public.meal_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================
-- SECTION 4 — AUTOMATIC SEEDING
-- ====================================================

CREATE OR REPLACE FUNCTION public.seed_meal_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.meal_settings (tenant_id)
  VALUES (NEW.id)
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_seed_meal_settings
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.seed_meal_settings();

-- Backfill existing tenants
INSERT INTO public.meal_settings (tenant_id)
SELECT id FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;
