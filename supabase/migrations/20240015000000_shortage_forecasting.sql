/*
 * Average daily consumption per inventory item.
 * Based on actual meal_deductions over last N days.
 * Used as input to shortage forecasting.
 *
 * Formula:
 *   avg_daily_usage = total_actual_usage / days_in_period
 */

CREATE OR REPLACE FUNCTION public.get_avg_daily_consumption(
  p_tenant_id   uuid,
  p_item_id     uuid,
  p_days        int DEFAULT 30
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_used numeric;
  v_avg        numeric;
BEGIN
  SELECT COALESCE(SUM(actual_quantity), 0)
  INTO v_total_used
  FROM public.meal_deductions md
  JOIN public.attendance_sessions s
    ON s.id = md.session_id
  WHERE md.tenant_id        = p_tenant_id
    AND md.inventory_item_id = p_item_id
    AND md.deduction_type    = 'MEAL_USAGE'
    AND s.session_date >= CURRENT_DATE - p_days;

  -- Avoid division by zero
  v_avg := CASE
    WHEN p_days > 0 THEN ROUND((v_total_used / p_days)::numeric, 4)
    ELSE 0
  END;

  RETURN v_avg;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_avg_daily_consumption
  TO authenticated;

/*
 * PRD Formula:
 *   Days Remaining = Current Inventory / Avg Daily Consumption
 *
 * Alert Levels:
 *   INFO     → > 14 days
 *   WARNING  → 7–14 days
 *   CRITICAL → < 7 days
 *
 * Outputs procurement recommendation quantity.
 */

CREATE OR REPLACE FUNCTION public.run_shortage_forecast(
  p_tenant_id uuid,
  p_days      int DEFAULT 30
)
RETURNS TABLE (
  inventory_item_id    uuid,
  item_name            text,
  unit                 text,
  current_stock        numeric,
  avg_daily_consumption numeric,
  days_remaining       numeric,
  stockout_date        date,
  alert_level          text,
  recommended_purchase numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.name,
    i.unit,
    COALESCE(s.current_stock, 0) AS current_stock,
    public.get_avg_daily_consumption(
      p_tenant_id, i.id, p_days
    ) AS avg_daily_consumption,
    CASE
      WHEN public.get_avg_daily_consumption(
             p_tenant_id, i.id, p_days
           ) = 0
        THEN 999
        -- No consumption → infinite days remaining
      ELSE ROUND(
        (COALESCE(s.current_stock, 0) /
        public.get_avg_daily_consumption(
          p_tenant_id, i.id, p_days
        ))::numeric, 1
      )
    END AS days_remaining,
    CASE
      WHEN public.get_avg_daily_consumption(
             p_tenant_id, i.id, p_days
           ) = 0
        THEN NULL
      ELSE (CURRENT_DATE + ROUND(
        (COALESCE(s.current_stock, 0) /
        public.get_avg_daily_consumption(
          p_tenant_id, i.id, p_days
        ))::numeric
      )::int)::date
    END AS stockout_date,
    CASE
      WHEN public.get_avg_daily_consumption(
             p_tenant_id, i.id, p_days
           ) = 0
        THEN 'INFO'
      WHEN ROUND(
        (COALESCE(s.current_stock, 0) /
        public.get_avg_daily_consumption(
          p_tenant_id, i.id, p_days
        ))::numeric, 1
      ) < 7
        THEN 'CRITICAL'
      WHEN ROUND(
        (COALESCE(s.current_stock, 0) /
        public.get_avg_daily_consumption(
          p_tenant_id, i.id, p_days
        ))::numeric, 1
      ) <= 14
        THEN 'WARNING'
      ELSE 'INFO'
    END AS alert_level,
    -- Recommended purchase: 30 days supply - current stock
    GREATEST(0, ROUND(
      (public.get_avg_daily_consumption(
         p_tenant_id, i.id, p_days
       ) * 30) - COALESCE(s.current_stock, 0),
    3)) AS recommended_purchase
  FROM public.inventory_items i
  JOIN public.inventory_stock s
    ON s.item_id = i.id
  WHERE i.tenant_id = p_tenant_id
    AND i.is_active  = true
  ORDER BY
    CASE
      WHEN public.get_avg_daily_consumption(
             p_tenant_id, i.id, p_days
           ) = 0
        THEN 3
      WHEN ROUND(
        (COALESCE(s.current_stock, 0) /
        public.get_avg_daily_consumption(
          p_tenant_id, i.id, p_days
        ))::numeric, 1
      ) < 7
        THEN 0  -- CRITICAL first
      WHEN ROUND(
        (COALESCE(s.current_stock, 0) /
        public.get_avg_daily_consumption(
          p_tenant_id, i.id, p_days
        ))::numeric, 1
      ) <= 14
        THEN 1  -- WARNING second
      ELSE 2    -- INFO last
    END ASC,
    i.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_shortage_forecast
  TO authenticated;
