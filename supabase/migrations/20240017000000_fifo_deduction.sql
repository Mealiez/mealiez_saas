/*
 * PRD: FIFO Batch Deduction Engine
 * Deducts quantity from inventory_batches using FIFO (earliest expiry first).
 * If non-perishable (no expiry), uses earliest created_at.
 */

CREATE OR REPLACE FUNCTION public.deduct_from_batches(
  p_tenant_id        uuid,
  p_item_id          uuid,
  p_quantity_to_deduct numeric
)
RETURNS numeric -- returns actual quantity deducted
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining_to_deduct numeric := p_quantity_to_deduct;
  v_batch_record        RECORD;
  v_deducted_from_batch  numeric;
BEGIN
  -- We only deduct from ACTIVE batches with remaining quantity > 0
  FOR v_batch_record IN 
    SELECT id, remaining_quantity 
    FROM public.inventory_batches
    WHERE tenant_id = p_tenant_id
      AND inventory_item_id = p_item_id
      AND batch_status = 'ACTIVE'
      AND remaining_quantity > 0
    ORDER BY 
      expiry_date ASC NULLS LAST, -- Earliest expiry first
      created_at ASC             -- Then earliest created
  LOOP
    IF v_remaining_to_deduct <= 0 THEN
      EXIT;
    END IF;

    v_deducted_from_batch := LEAST(v_batch_record.remaining_quantity, v_remaining_to_deduct);
    
    UPDATE public.inventory_batches
    SET 
      remaining_quantity = remaining_quantity - v_deducted_from_batch,
      batch_status = CASE 
        WHEN (remaining_quantity - v_deducted_from_batch) <= 0 THEN 'DEPLETED'
        ELSE 'ACTIVE'
      END,
      updated_at = now()
    WHERE id = v_batch_record.id;

    v_remaining_to_deduct := v_remaining_to_deduct - v_deducted_from_batch;
  END LOOP;

  RETURN p_quantity_to_deduct - v_remaining_to_deduct;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_from_batches TO authenticated;
