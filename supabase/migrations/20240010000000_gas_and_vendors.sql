/*
 * This migration adds:
 *   1. vendors table (shared across inventory modules)
 *   2. gas_cylinder_logs table
 *
 * vendors is created here because gas cylinders
 * are the first feature requiring vendor tracking.
 * purchase_entries (Feature 8) will also use vendors.
 *
 * Existing tables remain unchanged.
 */

-- ====================================================
-- SECTION 1 — VENDORS TABLE
-- ====================================================

CREATE TABLE IF NOT EXISTS public.vendors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL
                    REFERENCES public.tenants(id)
                    ON DELETE CASCADE,
  name            text NOT NULL,
  contact_name    text,
  contact_phone   text,
  contact_email   text,
  address         text,
  gst_number      text,
  vendor_type     text NOT NULL DEFAULT 'general'
                    CHECK (vendor_type IN (
                      'general',
                      'gas',
                      'grocery',
                      'dairy',
                      'packaged_goods'
                    )),
  -- vendor_type 'gas' = gas cylinder supplier
  -- vendor_type 'grocery' = fresh produce supplier
  -- etc.
  is_active       boolean NOT NULL DEFAULT true,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT vendors_name_tenant_unique
    UNIQUE (tenant_id, name)
);

CREATE INDEX idx_vendors_tenant
  ON public.vendors(tenant_id);
CREATE INDEX idx_vendors_type
  ON public.vendors(tenant_id, vendor_type);

-- Trigger: auto-update updated_at
CREATE TRIGGER vendors_set_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors_select"
ON public.vendors FOR SELECT
USING (tenant_id = public.get_tenant_id());

CREATE POLICY "vendors_insert"
ON public.vendors FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "vendors_update"
ON public.vendors FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "vendors_delete"
ON public.vendors FOR DELETE
USING (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() = 'admin'
);

-- ====================================================
-- SECTION 2 — GAS CYLINDER LOGS TABLE
-- ====================================================

CREATE TABLE IF NOT EXISTS public.gas_cylinder_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL
                     REFERENCES public.tenants(id)
                     ON DELETE CASCADE,
  cylinder_number  text NOT NULL,
  -- e.g. "CYL-001", "HP-14KG-003"
  cylinder_size_kg numeric(6,2),
  -- size in kilograms: 14.2, 19.0, 47.5 etc.
  vendor_id        uuid
                     REFERENCES public.vendors(id)
                     ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'AVAILABLE'
                     CHECK (status IN (
                       'AVAILABLE',
                       'INSTALLED',
                       'EMPTY',
                       'REFILL_REQUESTED',
                       'RETURNED'
                     )),
  received_date    date,
  installed_date   date,
  empty_date       date,
  refill_date      date,
  returned_date    date,
  purchase_price   numeric(10,2),
  -- price paid for this cylinder refill
  notes            text,
  created_by       uuid
                     REFERENCES public.users(id)
                     ON DELETE SET NULL,
  updated_by       uuid
                     REFERENCES public.users(id)
                     ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT gas_cylinder_tenant_number_unique
    UNIQUE (tenant_id, cylinder_number)
    -- Cylinder numbers must be unique per mess
);

CREATE INDEX idx_gas_tenant_status
  ON public.gas_cylinder_logs(tenant_id, status);
CREATE INDEX idx_gas_tenant_dates
  ON public.gas_cylinder_logs(tenant_id, installed_date DESC);

-- Trigger
CREATE TRIGGER gas_cylinders_set_updated_at
  BEFORE UPDATE ON public.gas_cylinder_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.gas_cylinder_logs
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gas_select"
ON public.gas_cylinder_logs FOR SELECT
USING (tenant_id = public.get_tenant_id());

CREATE POLICY "gas_insert"
ON public.gas_cylinder_logs FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "gas_update"
ON public.gas_cylinder_logs FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('admin', 'manager')
);

-- No DELETE — lifecycle is immutable audit trail

-- ====================================================
-- SECTION 3 — GAS ANALYTICS FUNCTION
-- ====================================================

-- Returns computed gas usage analytics per tenant.
-- Used by /api/inventory/gas/analytics.

CREATE OR REPLACE FUNCTION public.get_gas_analytics(
  p_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_cylinders       int;
  v_installed_now         int;
  v_empty_count           int;
  v_refill_requested      int;
  v_avg_duration_days     numeric;
  v_total_spend           numeric;
  v_avg_cost_per_cylinder numeric;
BEGIN

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'INSTALLED'),
    COUNT(*) FILTER (WHERE status = 'EMPTY'),
    COUNT(*) FILTER (WHERE status = 'REFILL_REQUESTED')
  INTO
    v_total_cylinders,
    v_installed_now,
    v_empty_count,
    v_refill_requested
  FROM public.gas_cylinder_logs
  WHERE tenant_id = p_tenant_id;

  -- Average duration: installed_date to empty_date
  SELECT COALESCE(
    AVG(
      empty_date - installed_date
    ), 0
  )
  INTO v_avg_duration_days
  FROM public.gas_cylinder_logs
  WHERE tenant_id = p_tenant_id
    AND installed_date IS NOT NULL
    AND empty_date IS NOT NULL;

  -- Total spend
  SELECT COALESCE(SUM(purchase_price), 0)
  INTO v_total_spend
  FROM public.gas_cylinder_logs
  WHERE tenant_id = p_tenant_id
    AND purchase_price IS NOT NULL;

  -- Avg cost per cylinder
  SELECT COALESCE(AVG(purchase_price), 0)
  INTO v_avg_cost_per_cylinder
  FROM public.gas_cylinder_logs
  WHERE tenant_id = p_tenant_id
    AND purchase_price IS NOT NULL;

  RETURN jsonb_build_object(
    'total_cylinders',       v_total_cylinders,
    'installed_now',         v_installed_now,
    'empty_count',           v_empty_count,
    'refill_requested',      v_refill_requested,
    'avg_duration_days',     ROUND(v_avg_duration_days, 1),
    'total_spend',           v_total_spend,
    'avg_cost_per_cylinder', ROUND(v_avg_cost_per_cylinder, 2),
    'daily_cost_estimate',
      CASE
        WHEN v_avg_duration_days > 0
          THEN ROUND(v_avg_cost_per_cylinder / v_avg_duration_days, 2)
        ELSE 0
      END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_gas_analytics
  TO authenticated;
