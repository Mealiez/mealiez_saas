-- Update inventory transaction handler to support batch deduction
CREATE OR REPLACE FUNCTION
public.handle_inventory_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_stock     numeric(10,3);
  v_min_level     numeric(10,3);
  v_item_name     text;
BEGIN

  -- STEP 1: Get item details
  SELECT min_stock_level, name
  INTO v_min_level, v_item_name
  FROM public.inventory_items
  WHERE id = NEW.item_id;

  -- STEP 2: Calculate new stock
  v_new_stock := NEW.stock_before + NEW.quantity;

  -- STEP 3: Enforce non-negative stock
  IF v_new_stock < 0 THEN
    RAISE EXCEPTION
      'Insufficient stock for item "%". '
      'Current: %, Requested: %',
      v_item_name,
      NEW.stock_before,
      ABS(NEW.quantity);
  END IF;

  -- STEP 4: Update inventory_stock
  UPDATE public.inventory_stock
  SET
    current_stock   = v_new_stock,
    last_updated_at = now()
  WHERE item_id = NEW.item_id;

  -- STEP 5: Update stock_after on transaction
  -- (set the snapshot)
  NEW.stock_after := v_new_stock;

  -- STEP 6: FIFO Batch Deduction
  -- If quantity is negative, we deduct from batches
  IF NEW.quantity < 0 THEN
    PERFORM public.deduct_from_batches(NEW.tenant_id, NEW.item_id, ABS(NEW.quantity));
  END IF;

  -- STEP 7: Check alert conditions
  IF v_new_stock = 0 THEN
    -- Out of stock alert
    INSERT INTO public.inventory_alerts (
      tenant_id, item_id, alert_type,
      current_stock, min_stock_level
    )
    VALUES (
      NEW.tenant_id, NEW.item_id, 'out_of_stock',
      v_new_stock, v_min_level
    )
    ON CONFLICT (item_id, alert_type, is_dismissed)
    DO NOTHING;

  ELSIF v_min_level > 0
    AND v_new_stock <= v_min_level THEN
    -- Low stock alert
    INSERT INTO public.inventory_alerts (
      tenant_id, item_id, alert_type,
      current_stock, min_stock_level
    )
    VALUES (
      NEW.tenant_id, NEW.item_id, 'low_stock',
      v_new_stock, v_min_level
    )
    ON CONFLICT (item_id, alert_type, is_dismissed)
    DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
