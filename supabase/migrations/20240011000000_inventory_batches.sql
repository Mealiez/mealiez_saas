-- ====================================================
-- SECTION 1 — EXTEND inventory_items WITH PRD FIELDS
-- ====================================================

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS sku               text,
  ADD COLUMN IF NOT EXISTS barcode           text,
  ADD COLUMN IF NOT EXISTS package_size      numeric(10,3),
  -- quantity per package e.g. 5 (for 5kg bag)
  ADD COLUMN IF NOT EXISTS storage_type      text
    CHECK (storage_type IN (
      'DRY', 'REFRIGERATED', 'FROZEN', 'AMBIENT'
    )),
  ADD COLUMN IF NOT EXISTS perishable        boolean
    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_shelf_life_days int,
  -- null = non-perishable, int = days from purchase
  ADD COLUMN IF NOT EXISTS reorder_threshold numeric(10,3);
  -- reorder point (separate from min_stock_level alert)

-- Unique barcode per tenant (if provided)
CREATE UNIQUE INDEX IF NOT EXISTS
  inv_items_barcode_tenant_unique
  ON public.inventory_items(tenant_id, barcode)
  WHERE barcode IS NOT NULL;

-- ====================================================
-- SECTION 2 — INVENTORY BATCHES TABLE
-- ====================================================

/*
 * CRITICAL: Expiry tracking at BATCH level, not product level.
 * Each purchase of a perishable creates a new batch.
 * PRD requirement: "Milk Batch #M342 expires tomorrow"
 *                  NOT: "Milk expires tomorrow"
 */

CREATE TABLE IF NOT EXISTS public.inventory_batches (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL
                       REFERENCES public.tenants(id)
                       ON DELETE CASCADE,
  inventory_item_id  uuid NOT NULL
                       REFERENCES public.inventory_items(id)
                       ON DELETE RESTRICT,
  batch_number       text NOT NULL,
  -- auto-generated or manual: "BATCH-20240415-001"
  mfg_date           date,
  expiry_date        date,
  -- NULL = non-expiring batch (dry goods, gas, etc.)
  purchase_price     numeric(10,2),
  -- price per unit at purchase time
  mrp                numeric(10,2),
  received_quantity  numeric(12,3) NOT NULL,
  remaining_quantity numeric(12,3) NOT NULL,
  unit               text NOT NULL,
  vendor_id          uuid
                       REFERENCES public.vendors(id)
                       ON DELETE SET NULL,
  purchase_entry_id  uuid,
  -- FK to purchase_entries (added in Feature 8 migration)
  -- Left as uuid without FK for now — FK added later
  batch_status       text NOT NULL DEFAULT 'ACTIVE'
                       CHECK (batch_status IN (
                         'ACTIVE',    -- has remaining stock
                         'DEPLETED',  -- remaining_quantity = 0
                         'EXPIRED',   -- past expiry_date
                         'RECALLED'   -- quality recall
                       )),
  notes              text,
  created_by         uuid
                       REFERENCES public.users(id)
                       ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT batch_remaining_non_negative
    CHECK (remaining_quantity >= 0),

  CONSTRAINT batch_received_positive
    CHECK (received_quantity > 0),

  CONSTRAINT batch_remaining_lte_received
    CHECK (remaining_quantity <= received_quantity),

  CONSTRAINT batches_number_tenant_item_unique
    UNIQUE (tenant_id, inventory_item_id, batch_number)
);

CREATE INDEX idx_batches_tenant_item
  ON public.inventory_batches(tenant_id, inventory_item_id);
CREATE INDEX idx_batches_expiry
  ON public.inventory_batches(tenant_id, expiry_date)
  WHERE expiry_date IS NOT NULL;
  -- Perf: only index rows that have expiry dates
CREATE INDEX idx_batches_status
  ON public.inventory_batches(tenant_id, batch_status);

-- Trigger: auto-update updated_at
CREATE TRIGGER batches_set_updated_at
  BEFORE UPDATE ON public.inventory_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.inventory_batches
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "batches_select"
ON public.inventory_batches FOR SELECT
USING (tenant_id = public.get_tenant_id());

CREATE POLICY "batches_insert"
ON public.inventory_batches FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "batches_update"
ON public.inventory_batches FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('admin', 'manager')
);

-- No DELETE — RECALLED or EXPIRED status instead

-- ====================================================
-- SECTION 3 — BATCH NUMBER GENERATOR FUNCTION
-- ====================================================

-- Auto-generates batch numbers in format:
--   BATCH-{YYYYMMDD}-{SEQ}
--   e.g. BATCH-20240415-001

CREATE OR REPLACE FUNCTION public.generate_batch_number(
  p_tenant_id uuid,
  p_item_id   uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today    text;
  v_count    int;
  v_batch_no text;
BEGIN
  v_today := TO_CHAR(now(), 'YYYYMMDD');

  SELECT COUNT(*) + 1 INTO v_count
  FROM public.inventory_batches
  WHERE tenant_id = p_tenant_id
    AND inventory_item_id = p_item_id
    AND DATE(created_at) = CURRENT_DATE;

  v_batch_no := 'BATCH-' || v_today || '-' ||
                LPAD(v_count::text, 3, '0');
  RETURN v_batch_no;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_batch_number
  TO authenticated;

-- ====================================================
-- SECTION 4 — EXPIRING BATCHES VIEW
-- ====================================================

-- A view that returns batches expiring within N days.
-- Used by expiry alert dashboard.

CREATE OR REPLACE VIEW public.expiring_batches_view AS
SELECT
  b.id,
  b.tenant_id,
  b.batch_number,
  b.expiry_date,
  b.remaining_quantity,
  b.unit,
  b.batch_status,
  i.name   AS item_name,
  i.id     AS item_id,
  (b.expiry_date - CURRENT_DATE) AS days_until_expiry,
  CASE
    WHEN b.expiry_date < CURRENT_DATE THEN 'EXPIRED'
    WHEN b.expiry_date = CURRENT_DATE THEN 'EXPIRES_TODAY'
    WHEN b.expiry_date <= CURRENT_DATE + 3 THEN 'CRITICAL'
    WHEN b.expiry_date <= CURRENT_DATE + 7 THEN 'WARNING'
    ELSE 'OK'
  END AS expiry_status
FROM public.inventory_batches b
JOIN public.inventory_items i
  ON i.id = b.inventory_item_id
WHERE b.expiry_date IS NOT NULL
  AND b.batch_status = 'ACTIVE'
  AND b.remaining_quantity > 0;

-- RLS on views inherits from underlying tables in Supabase
-- However, to be explicit, apply tenant filter in queries

-- ====================================================
-- SECTION 5 — MARK EXPIRED BATCHES FUNCTION
-- ====================================================

-- Called daily (or on-demand) to mark past-expiry batches.
-- Inserts inventory ledger event for expired quantity.

CREATE OR REPLACE FUNCTION public.mark_expired_batches(
  p_tenant_id uuid
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
BEGIN

  -- Mark as EXPIRED and write to inventory_transactions
  -- for each batch past expiry with remaining stock

  WITH expired AS (
    UPDATE public.inventory_batches
    SET    batch_status = 'EXPIRED'
    WHERE  tenant_id = p_tenant_id
      AND  expiry_date < CURRENT_DATE
      AND  batch_status = 'ACTIVE'
      AND  remaining_quantity > 0
    RETURNING id, inventory_item_id,
              remaining_quantity, unit, tenant_id
  )
  INSERT INTO public.inventory_transactions
    (tenant_id, item_id, transaction_type,
     quantity, stock_before, notes, created_by)
  SELECT
    e.tenant_id,
    e.inventory_item_id,
    'wastage',
    -(e.remaining_quantity),
    -- negative: stock reduction
    (SELECT current_stock
     FROM public.inventory_stock
     WHERE item_id = e.inventory_item_id),
    'Auto-expired: batch exceeded expiry date',
    (SELECT id FROM public.users WHERE tenant_id = e.tenant_id AND role = 'admin' LIMIT 1)
  FROM expired e;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
  -- Returns number of batches expired
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_expired_batches
  TO service_role;
-- Only called by server-side cron / admin action
