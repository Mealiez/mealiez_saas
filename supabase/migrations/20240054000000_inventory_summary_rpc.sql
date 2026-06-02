-- ====================================================
-- INVENTORY SUMMARY RPC
-- ====================================================

-- Returns aggregate metrics for the inventory dashboard
--   1. total_value: Sum of (remaining_quantity * purchase_price) for ACTIVE batches
--   2. out_of_stock_count: Count of items with 0 stock
--   3. low_stock_count: Count of items with stock <= min_stock_level
--   4. expiring_soon_count: Count of batches expiring within next 7 days

CREATE OR REPLACE FUNCTION public.get_inventory_summary(
  p_tenant_id uuid
)
RETURNS TABLE (
  total_value         numeric,
  out_of_stock_count  int,
  low_stock_count     int,
  expiring_soon_count int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_value         numeric := 0;
  v_out_of_stock        int := 0;
  v_low_stock           int := 0;
  v_expiring_soon       int := 0;
  v_today               date := CURRENT_DATE;
  v_expiry_threshold    date := CURRENT_DATE + interval '7 days';
BEGIN

  -- 1. Calculate Total Value
  SELECT COALESCE(SUM(remaining_quantity * purchase_price), 0)
  INTO v_total_value
  FROM public.inventory_batches
  WHERE tenant_id = p_tenant_id
    AND batch_status = 'ACTIVE'
    AND remaining_quantity > 0;

  -- 2. Calculate Stock Status Counts
  -- (Reusable logic from get_stock_overview)
  SELECT 
    COUNT(*) FILTER (WHERE s.current_stock = 0),
    COUNT(*) FILTER (WHERE i.min_stock_level > 0 AND s.current_stock <= i.min_stock_level AND s.current_stock > 0)
  INTO v_out_of_stock, v_low_stock
  FROM public.inventory_items i
  JOIN public.inventory_stock s ON s.item_id = i.id
  WHERE i.tenant_id = p_tenant_id
    AND i.is_active = true;

  -- 3. Calculate Expiring Soon
  SELECT COUNT(*)
  INTO v_expiring_soon
  FROM public.inventory_batches
  WHERE tenant_id = p_tenant_id
    AND batch_status = 'ACTIVE'
    AND remaining_quantity > 0
    AND expiry_date IS NOT NULL
    AND expiry_date BETWEEN v_today AND v_expiry_threshold;

  RETURN QUERY SELECT 
    v_total_value, 
    v_out_of_stock, 
    v_low_stock, 
    v_expiring_soon;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_inventory_summary(uuid) TO authenticated;
