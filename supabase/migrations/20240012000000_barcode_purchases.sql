-- ====================================================
-- SECTION 1 — PRODUCT CATALOG TABLE
-- ====================================================

/*
 * product_catalog: platform-wide barcode database.
 * NOT tenant-scoped — shared across all tenants.
 * Grows over time as staff scan new products.
 * Acts as the long-term product intelligence layer.
 */

CREATE TABLE IF NOT EXISTS public.product_catalog (
  id                     uuid PRIMARY KEY
                           DEFAULT gen_random_uuid(),
  barcode                text NOT NULL UNIQUE,
  -- EAN-13, UPC-A, QR-based codes
  product_name           text NOT NULL,
  brand                  text,
  category               text,
  -- 'dairy','oil','masala','grain','packaged','cleaning'
  package_size           numeric(10,3),
  unit                   text,
  -- 'kg','L','g','ml','pcs'
  image_url              text,
  default_shelf_life_days int,
  -- null = non-perishable
  verified               boolean NOT NULL DEFAULT false,
  -- true = manually verified by admin / Mealiez team
  source                 text NOT NULL DEFAULT 'user_scan'
                           CHECK (source IN (
                             'user_scan',
                             'open_food_facts',
                             'upcitemdb',
                             'manual'
                           )),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- No tenant_id — this is shared platform data
-- No RLS — all authenticated users can read
-- No direct INSERT for normal users —
--   inserts happen via service role in API routes

CREATE INDEX idx_product_catalog_barcode
  ON public.product_catalog(barcode);
CREATE INDEX idx_product_catalog_name
  ON public.product_catalog
  USING gin(to_tsvector('english', product_name));
-- Full-text search on product name

CREATE TRIGGER product_catalog_set_updated_at
  BEFORE UPDATE ON public.product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.product_catalog
  ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "product_catalog_select"
ON public.product_catalog FOR SELECT
TO authenticated
USING (true);

-- Only service_role can INSERT/UPDATE
-- No authenticated INSERT policy

-- ====================================================
-- SECTION 2 — PURCHASE ENTRIES TABLE
-- ====================================================

CREATE TABLE IF NOT EXISTS public.purchase_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL
                     REFERENCES public.tenants(id)
                     ON DELETE CASCADE,
  vendor_id        uuid
                     REFERENCES public.vendors(id)
                     ON DELETE SET NULL,
  invoice_number   text,
  invoice_date     date,
  total_amount     numeric(12,2),
  -- calculated from line items
  gst_amount       numeric(10,2) DEFAULT 0,
  purchase_status  text NOT NULL DEFAULT 'DRAFT'
                     CHECK (purchase_status IN (
                       'DRAFT',
                       'CONFIRMED',
                       'PARTIALLY_RECEIVED',
                       'RECEIVED',
                       'CANCELLED'
                     )),
  notes            text,
  created_by       uuid
                     REFERENCES public.users(id)
                     ON DELETE SET NULL,
  confirmed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_entries_tenant
  ON public.purchase_entries(tenant_id);
CREATE INDEX idx_purchase_entries_status
  ON public.purchase_entries(tenant_id, purchase_status);
CREATE INDEX idx_purchase_entries_date
  ON public.purchase_entries(tenant_id, invoice_date DESC);

CREATE TRIGGER purchase_entries_set_updated_at
  BEFORE UPDATE ON public.purchase_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.purchase_entries
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_select"
ON public.purchase_entries FOR SELECT
USING (tenant_id = public.get_tenant_id());

CREATE POLICY "purchase_insert"
ON public.purchase_entries FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "purchase_update"
ON public.purchase_entries FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('admin', 'manager')
);

-- ====================================================
-- SECTION 3 — PURCHASE ENTRY ITEMS TABLE
-- ====================================================

CREATE TABLE IF NOT EXISTS public.purchase_entry_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_entry_id  uuid NOT NULL
                       REFERENCES public.purchase_entries(id)
                       ON DELETE CASCADE,
  inventory_item_id  uuid NOT NULL
                       REFERENCES public.inventory_items(id)
                       ON DELETE RESTRICT,
  quantity           numeric(12,3) NOT NULL
                       CHECK (quantity > 0),
  unit               text NOT NULL,
  purchase_price     numeric(10,2) NOT NULL
                       CHECK (purchase_price >= 0),
  -- price per unit
  total_price        numeric(12,2)
    GENERATED ALWAYS AS (quantity * purchase_price) STORED,
  -- auto-calculated
  batch_number       text,
  expiry_date        date,
  -- Pre-filled from barcode scan or manual entry
  batch_id           uuid
                       REFERENCES public.inventory_batches(id)
                       ON DELETE SET NULL,
  -- Populated after batch is created on confirmation
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_items_entry
  ON public.purchase_entry_items(purchase_entry_id);
CREATE INDEX idx_purchase_items_item
  ON public.purchase_entry_items(inventory_item_id);

-- RLS inherits from purchase_entries via API
-- No direct client policy needed — accessed via join

-- ====================================================
-- SECTION 4 — FK: PATCH inventory_batches.purchase_entry_id
-- ====================================================

-- Now that purchase_entries table exists,
-- add the FK constraint that was deferred in migration 11.

ALTER TABLE public.inventory_batches
  ADD CONSTRAINT batches_purchase_entry_fk
    FOREIGN KEY (purchase_entry_id)
    REFERENCES public.purchase_entries(id)
    ON DELETE SET NULL;

-- ====================================================
-- SECTION 5 — WEIGHTED AVERAGE COST FUNCTION
-- ====================================================

/*
 * PRD REQUIREMENT: Weighted Average Costing (WAC)
 * NOT latest purchase price.
 *
 * Formula:
 *   WAC = Σ(quantity × purchase_price) / Σ(quantity)
 *
 * Calculated across all ACTIVE batches for an item.
 */

CREATE OR REPLACE FUNCTION public.get_weighted_avg_cost(
  p_tenant_id uuid,
  p_item_id   uuid
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wac numeric;
BEGIN
  SELECT
    CASE
      WHEN SUM(remaining_quantity) = 0 THEN 0
      ELSE SUM(remaining_quantity * purchase_price)
           / SUM(remaining_quantity)
    END
  INTO v_wac
  FROM public.inventory_batches
  WHERE tenant_id        = p_tenant_id
    AND inventory_item_id = p_item_id
    AND batch_status      = 'ACTIVE'
    AND purchase_price    IS NOT NULL
    AND remaining_quantity > 0;

  RETURN COALESCE(ROUND(v_wac, 4), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_weighted_avg_cost
  TO authenticated;
