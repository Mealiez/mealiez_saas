-- ====================================================
-- SECTION 1 — MEAL SESSION DEDUCTIONS TABLE
-- ====================================================

/*
 * PRD: Session-level deduction analytics
 * "DO NOT only store daily aggregate deduction.
 *  Meal session granularity is mandatory."
 *
 * Captures ACTUAL kitchen usage per session.
 * Manager enters actual quantities used.
 * Compared against calculate_session_requirements().
 */

CREATE TABLE IF NOT EXISTS public.meal_deductions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL
                       REFERENCES public.tenants(id)
                       ON DELETE CASCADE,
  session_id         uuid NOT NULL
                       REFERENCES public.attendance_sessions(id)
                       ON DELETE RESTRICT,
  inventory_item_id  uuid NOT NULL
                       REFERENCES public.inventory_items(id)
                       ON DELETE RESTRICT,

  -- Expected (from recipe scaling)
  expected_quantity  numeric(12,3),
  -- Actual (entered by kitchen staff)
  actual_quantity    numeric(12,3) NOT NULL
                       CHECK (actual_quantity >= 0),
  unit               text NOT NULL,

  -- Variance auto-calculated
  variance_quantity  numeric(12,3)
    GENERATED ALWAYS AS
      (COALESCE(actual_quantity - expected_quantity, actual_quantity))
    STORED,
  -- positive = over-used, negative = under-used

  deduction_type     text NOT NULL DEFAULT 'MEAL_USAGE'
                       CHECK (deduction_type IN (
                         'MEAL_USAGE',  -- normal meal consumption
                         'WASTAGE',     -- identified wastage
                         'SPILLAGE',    -- accident
                         'LEFTOVER'     -- surplus after meal
                       )),
  notes              text,
  entered_by         uuid
                       REFERENCES public.users(id)
                       ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT meal_deductions_session_item_unique
    UNIQUE (session_id, inventory_item_id, deduction_type)
);

CREATE INDEX idx_meal_deductions_session
  ON public.meal_deductions(session_id);
CREATE INDEX idx_meal_deductions_tenant_date
  ON public.meal_deductions(
    tenant_id,
    created_at DESC
  );
CREATE INDEX idx_meal_deductions_item
  ON public.meal_deductions(tenant_id, inventory_item_id);

ALTER TABLE public.meal_deductions
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deductions_select"
ON public.meal_deductions FOR SELECT
USING (tenant_id = public.get_tenant_id());

CREATE POLICY "deductions_insert"
ON public.meal_deductions FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "deductions_update"
ON public.meal_deductions FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('admin', 'manager')
);
-- Corrections allowed (e.g. staff entered wrong qty)

-- ====================================================
-- SECTION 2 — ON DEDUCTION: AUTO-CREATE TRANSACTION
-- ====================================================

-- Trigger: when a meal_deduction is inserted,
-- automatically create inventory_transactions row.

CREATE OR REPLACE FUNCTION
  public.handle_meal_deduction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stock numeric;
BEGIN
  -- Get current stock
  SELECT current_stock INTO v_current_stock
  FROM public.inventory_stock
  WHERE item_id = NEW.inventory_item_id;

  -- Insert inventory transaction (negative quantity = deduction)
  INSERT INTO public.inventory_transactions (
    tenant_id,
    item_id,
    transaction_type,
    quantity,
    stock_before,
    notes,
    created_by
  ) VALUES (
    NEW.tenant_id,
    NEW.inventory_item_id,
    CASE NEW.deduction_type
      WHEN 'MEAL_USAGE' THEN 'consumption'
      WHEN 'WASTAGE'    THEN 'wastage'
      WHEN 'SPILLAGE'   THEN 'wastage'
      WHEN 'LEFTOVER'   THEN 'adjustment'
    END,
    -(NEW.actual_quantity),
    -- negative: stock reduction
    v_current_stock,
    COALESCE(NEW.notes,
      'Session deduction: ' || NEW.deduction_type),
    NEW.entered_by
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER meal_deduction_trigger
  AFTER INSERT ON public.meal_deductions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_meal_deduction();

-- ====================================================
-- SECTION 3 — VARIANCE ANALYSIS FUNCTION
-- ====================================================

/*
 * PRD: Expected vs Actual Analysis
 * Returns variance report for a session or date range.
 */

CREATE OR REPLACE FUNCTION public.get_variance_analysis(
  p_tenant_id  uuid,
  p_session_id uuid DEFAULT NULL,
  p_from_date  date DEFAULT NULL,
  p_to_date    date DEFAULT NULL
)
RETURNS TABLE (
  session_id         uuid,
  session_date       date,
  meal_type          text,
  inventory_item_id  uuid,
  item_name          text,
  unit               text,
  expected_qty       numeric,
  actual_qty         numeric,
  variance_qty       numeric,
  variance_pct       numeric,
  variance_label     text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    md.session_id,
    sess.session_date::date,
    sess.meal_type,
    md.inventory_item_id,
    i.name AS item_name,
    md.unit,
    COALESCE(md.expected_quantity, 0),
    md.actual_quantity,
    md.variance_quantity,
    CASE
      WHEN COALESCE(md.expected_quantity, 0) = 0 THEN NULL
      ELSE ROUND(
        (md.variance_quantity /
         NULLIF(md.expected_quantity, 0)) * 100, 1
      )
    END AS variance_pct,
    CASE
      WHEN md.variance_quantity > 0 THEN 'OVER_USED'
      WHEN md.variance_quantity < 0 THEN 'UNDER_USED'
      ELSE 'ON_TARGET'
    END AS variance_label
  FROM public.meal_deductions md
  JOIN public.attendance_sessions sess
    ON sess.id = md.session_id
  JOIN public.inventory_items i
    ON i.id = md.inventory_item_id
  WHERE md.tenant_id = p_tenant_id
    AND (p_session_id IS NULL OR md.session_id = p_session_id)
    AND (p_from_date  IS NULL OR sess.session_date >= p_from_date)
    AND (p_to_date    IS NULL OR sess.session_date <= p_to_date)
  ORDER BY sess.session_date DESC, i.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_variance_analysis
  TO authenticated;

-- ====================================================
-- SECTION 4 — MEAL COST CALCULATION FUNCTION
-- ====================================================

/*
 * PRD: Per Meal Costing using Weighted Average Cost
 *
 * Formula:
 *   Meal Cost = Σ(Ingredient Qty × WAC per unit)
 *   Cost per plate = Meal Cost / actual_attendance
 *
 * Uses actual deductions (not expected).
 * Uses get_weighted_avg_cost() for WAC.
 */

CREATE OR REPLACE FUNCTION public.calculate_session_cost(
  p_session_id uuid
)
RETURNS TABLE (
  inventory_item_id  uuid,
  item_name          text,
  quantity_used      numeric,
  unit               text,
  weighted_avg_cost  numeric,
  line_cost          numeric,
  cost_share_pct     numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_total_cost numeric := 0;
BEGIN

  -- Get tenant_id from session
  SELECT t.tenant_id INTO v_tenant_id
  FROM public.attendance_sessions t
  WHERE t.id = p_session_id;

  -- Calculate total cost first (for share%)
  SELECT COALESCE(SUM(
    md.actual_quantity *
    public.get_weighted_avg_cost(
      v_tenant_id, md.inventory_item_id
    )
  ), 0) INTO v_total_cost
  FROM public.meal_deductions md
  WHERE md.session_id = p_session_id
    AND md.deduction_type = 'MEAL_USAGE';

  -- Return line items
  RETURN QUERY
  SELECT
    md.inventory_item_id,
    i.name,
    md.actual_quantity,
    md.unit,
    public.get_weighted_avg_cost(
      v_tenant_id, md.inventory_item_id
    ) AS weighted_avg_cost,
    ROUND(
      (md.actual_quantity *
      public.get_weighted_avg_cost(
        v_tenant_id, md.inventory_item_id
      ))::numeric, 2
    ) AS line_cost,
    CASE
      WHEN v_total_cost = 0 THEN 0
      ELSE ROUND(
        (md.actual_quantity *
         public.get_weighted_avg_cost(
           v_tenant_id, md.inventory_item_id
         ) / v_total_cost * 100)::numeric, 1
      )
    END AS cost_share_pct
  FROM public.meal_deductions md
  JOIN public.inventory_items i
    ON i.id = md.inventory_item_id
  WHERE md.session_id = p_session_id
    AND md.deduction_type = 'MEAL_USAGE'
  ORDER BY line_cost DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_session_cost
  TO authenticated;
