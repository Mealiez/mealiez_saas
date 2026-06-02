/*
 * PRD: Inventory Ledger Integrity (Auto-Create Batches)
 * Ensures every stock addition via inventory_transactions creates a batch.
 * This fixes the bug where "Current Inventory Value" stays at 0 for manual additions.
 */

CREATE OR REPLACE FUNCTION public.handle_inventory_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_stock     numeric(10,3);
  v_min_level     numeric(10,3);
  v_item_name     text;
  v_item_unit     text;
  v_batch_no      text;
BEGIN

  -- STEP 1: Get item details
  SELECT min_stock_level, name, unit
  INTO v_min_level, v_item_name, v_item_unit
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
  NEW.stock_after := v_new_stock;

  -- STEP 6: Ledger Synchronization (Batches)
  
  -- CASE A: DEDUCTION (consumption, wastage, negative adjustment)
  IF NEW.quantity < 0 THEN
    PERFORM public.deduct_from_batches(NEW.tenant_id, NEW.item_id, ABS(NEW.quantity));
  
  -- CASE B: ADDITION (purchase, positive adjustment)
  -- We MUST create a batch so that value calculation and later FIFO deduction works.
  ELSIF NEW.quantity > 0 THEN
    v_batch_no := public.generate_batch_number(NEW.tenant_id, NEW.item_id);
    
    INSERT INTO public.inventory_batches (
      tenant_id,
      inventory_item_id,
      batch_number,
      received_quantity,
      remaining_quantity,
      unit,
      purchase_price,
      batch_status,
      created_by,
      notes
    )
    VALUES (
      NEW.tenant_id,
      NEW.item_id,
      v_batch_no || '-AUTO', -- Mark as auto-generated from transaction
      NEW.quantity,
      NEW.quantity,
      v_item_unit,
      COALESCE(NEW.unit_cost, 0),
      'ACTIVE',
      NEW.created_by,
      COALESCE(NEW.notes, 'Auto-generated from transaction ledger')
    );
  END IF;

  -- STEP 7: Check alert conditions
  IF v_new_stock = 0 THEN
    INSERT INTO public.inventory_alerts (
      tenant_id, item_id, alert_type, current_stock, min_stock_level
    )
    VALUES (NEW.tenant_id, NEW.item_id, 'out_of_stock', v_new_stock, v_min_level)
    ON CONFLICT (item_id, alert_type, is_dismissed) DO NOTHING;

  ELSIF v_min_level > 0 AND v_new_stock <= v_min_level THEN
    INSERT INTO public.inventory_alerts (
      tenant_id, item_id, alert_type, current_stock, min_stock_level
    )
    VALUES (NEW.tenant_id, NEW.item_id, 'low_stock', v_new_stock, v_min_level)
    ON CONFLICT (item_id, alert_type, is_dismissed) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
