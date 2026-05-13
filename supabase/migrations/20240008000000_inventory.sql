-- ====================================================
-- SECTION 1 — INVENTORY CATEGORIES TABLE
-- ====================================================

CREATE TABLE public.inventory_categories (
  id          uuid PRIMARY KEY
                DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL
                REFERENCES public.tenants(id)
                ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  color       text NOT NULL DEFAULT '#6366F1',
  -- hex color for UI badge
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT inventory_categories_name_length
    CHECK (char_length(name) >= 2),

  CONSTRAINT inventory_categories_unique_name
    UNIQUE (tenant_id, name)
    -- same category name cannot exist twice
    -- within same tenant
);

CREATE INDEX idx_inv_categories_tenant
  ON public.inventory_categories(tenant_id);

-- ====================================================
-- SECTION 2 — INVENTORY ITEMS TABLE
-- ====================================================

CREATE TABLE public.inventory_items (
  id              uuid PRIMARY KEY
                    DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL
                    REFERENCES public.tenants(id)
                    ON DELETE CASCADE,
  category_id     uuid
                    REFERENCES public.inventory_categories(id)
                    ON DELETE SET NULL,
  name            text NOT NULL,
  description     text,
  unit            text NOT NULL
                    CHECK (unit IN (
                      'kg','g','l','ml',
                      'pcs','dozen','bag',
                      'box','bottle','pack'
                    )),
  min_stock_level numeric(10,3) NOT NULL DEFAULT 0,
  -- when stock falls below this, alert is triggered
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT inventory_items_name_length
    CHECK (char_length(name) >= 2),

  CONSTRAINT inventory_items_min_stock_positive
    CHECK (min_stock_level >= 0),

  CONSTRAINT inventory_items_unique_name
    UNIQUE (tenant_id, name)
);

CREATE INDEX idx_inv_items_tenant
  ON public.inventory_items(tenant_id);

CREATE INDEX idx_inv_items_category
  ON public.inventory_items(tenant_id, category_id);

CREATE INDEX idx_inv_items_active
  ON public.inventory_items(tenant_id, is_active);

-- ====================================================
-- SECTION 3 — INVENTORY STOCK TABLE
-- ====================================================

-- One row per item — current stock level.
-- NEVER updated directly by application code.
-- Updated ONLY by the transaction trigger.

CREATE TABLE public.inventory_stock (
  id              uuid PRIMARY KEY
                    DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL
                    REFERENCES public.tenants(id)
                    ON DELETE CASCADE,
  item_id         uuid NOT NULL UNIQUE
                    REFERENCES public.inventory_items(id)
                    ON DELETE CASCADE,
  current_stock   numeric(10,3) NOT NULL DEFAULT 0,
  last_updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT inventory_stock_non_negative
    CHECK (current_stock >= 0),
    -- stock cannot go below 0

  CONSTRAINT inventory_stock_one_per_item
    UNIQUE (item_id)
);

CREATE INDEX idx_inv_stock_tenant
  ON public.inventory_stock(tenant_id);

CREATE INDEX idx_inv_stock_low
  ON public.inventory_stock(tenant_id, current_stock);

-- ====================================================
-- SECTION 4 — INVENTORY TRANSACTIONS TABLE
-- ====================================================

-- Every stock movement recorded here.
-- Immutable once created — no UPDATE or DELETE.

CREATE TABLE public.inventory_transactions (
  id              uuid PRIMARY KEY
                    DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL
                    REFERENCES public.tenants(id)
                    ON DELETE CASCADE,
  item_id         uuid NOT NULL
                    REFERENCES public.inventory_items(id)
                    ON DELETE RESTRICT,
  transaction_type text NOT NULL
                    CHECK (transaction_type IN (
                      'purchase', 'consumption',
                      'adjustment', 'wastage'
                    )),
  quantity        numeric(10,3) NOT NULL,
  -- positive for purchase/adjustment-up
  -- negative for consumption/wastage/adjustment-down
  -- UI sends signed value

  unit_cost       numeric(10,2),
  -- optional: cost per unit for purchase transactions

  notes           text,
  stock_before    numeric(10,3) NOT NULL,
  -- snapshot: stock level BEFORE this transaction
  stock_after     numeric(10,3) NOT NULL,
  -- snapshot: stock level AFTER this transaction
  -- these two fields make audit trail self-contained

  created_by      uuid NOT NULL
                    REFERENCES public.users(id)
                    ON DELETE RESTRICT,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT inventory_transactions_quantity_nonzero
    CHECK (quantity != 0)
    -- zero-quantity transaction is meaningless
);

CREATE INDEX idx_inv_tx_tenant
  ON public.inventory_transactions(tenant_id);

CREATE INDEX idx_inv_tx_item
  ON public.inventory_transactions(item_id);

CREATE INDEX idx_inv_tx_type
  ON public.inventory_transactions(
    tenant_id, transaction_type
  );

CREATE INDEX idx_inv_tx_date
  ON public.inventory_transactions(
    tenant_id, created_at DESC
  );

-- ====================================================
-- SECTION 5 — INVENTORY ALERTS TABLE
-- ====================================================

CREATE TABLE public.inventory_alerts (
  id              uuid PRIMARY KEY
                    DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL
                    REFERENCES public.tenants(id)
                    ON DELETE CASCADE,
  item_id         uuid NOT NULL
                    REFERENCES public.inventory_items(id)
                    ON DELETE CASCADE,
  alert_type      text NOT NULL DEFAULT 'low_stock'
                    CHECK (alert_type IN (
                      'low_stock', 'out_of_stock'
                    )),
  current_stock   numeric(10,3) NOT NULL,
  min_stock_level numeric(10,3) NOT NULL,
  is_dismissed    boolean NOT NULL DEFAULT false,
  dismissed_by    uuid
                    REFERENCES public.users(id)
                    ON DELETE SET NULL,
  dismissed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- One active alert per item per type
  CONSTRAINT inventory_alerts_unique_active
    UNIQUE (item_id, alert_type, is_dismissed)
    -- partial unique would be better but
    -- use application logic for dedup
);

CREATE INDEX idx_inv_alerts_tenant
  ON public.inventory_alerts(tenant_id);

CREATE INDEX idx_inv_alerts_active
  ON public.inventory_alerts(
    tenant_id, is_dismissed
  );

-- ====================================================
-- SECTION 6 — UPDATED_AT TRIGGERS
-- ====================================================

-- Apply handle_updated_at() to:
-- - inventory_categories
-- - inventory_items

-- (inventory_stock uses last_updated_at manually)
-- (inventory_transactions is immutable)
-- (inventory_alerts has no updated_at)

CREATE TRIGGER inventory_categories_updated_at
  BEFORE UPDATE ON public.inventory_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================
-- SECTION 7 — STOCK TRANSACTION TRIGGER
-- ====================================================

-- This trigger fires AFTER INSERT on
-- inventory_transactions. It:
-- 1. Updates inventory_stock.current_stock
-- 2. Creates low_stock or out_of_stock alert
--    if stock falls below min_stock_level

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

  -- STEP 6: Check alert conditions
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

CREATE TRIGGER inventory_transaction_trigger
  BEFORE INSERT ON public.inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_inventory_transaction();

-- BEFORE INSERT (not AFTER) so we can
-- modify NEW.stock_after before it is written

-- ====================================================
-- SECTION 8 — INITIALIZE STOCK FUNCTION
-- ====================================================

-- Called when a new inventory_item is created.
-- Creates the inventory_stock row with 0 stock.

CREATE OR REPLACE FUNCTION
public.initialize_item_stock(
  p_item_id   uuid,
  p_tenant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inventory_stock
    (tenant_id, item_id, current_stock)
  VALUES
    (p_tenant_id, p_item_id, 0)
  ON CONFLICT (item_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION
  public.initialize_item_stock
  TO service_role, authenticated;

-- ====================================================
-- SECTION 9 — STOCK SUMMARY FUNCTION
-- ====================================================

-- Returns full stock overview for dashboard.
-- Joins items + categories + stock in one query.

CREATE OR REPLACE FUNCTION
public.get_stock_overview(
  p_tenant_id uuid
)
RETURNS TABLE (
  item_id         uuid,
  item_name       text,
  category_name   text,
  category_color  text,
  unit            text,
  current_stock   numeric,
  min_stock_level numeric,
  stock_status    text,
  last_updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id            AS item_id,
    i.name          AS item_name,
    COALESCE(c.name,  'Uncategorized') AS category_name,
    COALESCE(c.color, '#9CA3AF')       AS category_color,
    i.unit,
    s.current_stock,
    i.min_stock_level,
    CASE
      WHEN s.current_stock = 0
        THEN 'out_of_stock'
      WHEN i.min_stock_level > 0
        AND s.current_stock <= i.min_stock_level
        THEN 'low_stock'
      ELSE 'ok'
    END             AS stock_status,
    s.last_updated_at
  FROM public.inventory_items i
  JOIN public.inventory_stock s
    ON s.item_id = i.id
  LEFT JOIN public.inventory_categories c
    ON c.id = i.category_id
  WHERE i.tenant_id = p_tenant_id
    AND i.is_active  = true
  ORDER BY
    CASE
      WHEN s.current_stock = 0 THEN 0
      WHEN i.min_stock_level > 0
        AND s.current_stock <= i.min_stock_level
        THEN 1
      ELSE 2
    END,
    i.name ASC;
  -- Out of stock first, then low stock, then ok
END;
$$;

GRANT EXECUTE ON FUNCTION
  public.get_stock_overview
  TO authenticated;

-- ====================================================
-- SECTION 10 — ENABLE RLS
-- ====================================================

ALTER TABLE public.inventory_categories
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_alerts
  ENABLE ROW LEVEL SECURITY;

-- ====================================================
-- SECTION 11 — RLS POLICIES
-- ====================================================

-- STANDARD TEMPLATE: public.get_tenant_id()
-- No variations.

--- INVENTORY CATEGORIES ---

CREATE POLICY "inv_categories_select"
ON public.inventory_categories FOR SELECT
USING (tenant_id = public.get_tenant_id());

CREATE POLICY "inv_categories_insert"
ON public.inventory_categories FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN (
    'owner', 'admin'
  )
);

CREATE POLICY "inv_categories_update"
ON public.inventory_categories FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN (
    'owner', 'admin'
  )
);

CREATE POLICY "inv_categories_delete"
ON public.inventory_categories FOR DELETE
USING (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN (
    'owner', 'admin'
  )
);

--- INVENTORY ITEMS ---

CREATE POLICY "inv_items_select"
ON public.inventory_items FOR SELECT
USING (tenant_id = public.get_tenant_id());

CREATE POLICY "inv_items_insert"
ON public.inventory_items FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN (
    'owner', 'admin'
  )
);

CREATE POLICY "inv_items_update"
ON public.inventory_items FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN (
    'owner', 'admin'
  )
);

CREATE POLICY "inv_items_delete"
ON public.inventory_items FOR DELETE
USING (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN (
    'owner', 'admin'
  )
);

--- INVENTORY STOCK (read-only for all) ---

CREATE POLICY "inv_stock_select"
ON public.inventory_stock FOR SELECT
USING (tenant_id = public.get_tenant_id());

-- No INSERT/UPDATE/DELETE from client
-- Stock is managed exclusively by the
-- handle_inventory_transaction() trigger
-- which runs as SECURITY DEFINER

--- INVENTORY TRANSACTIONS ---

CREATE POLICY "inv_tx_select"
ON public.inventory_transactions FOR SELECT
USING (tenant_id = public.get_tenant_id());

CREATE POLICY "inv_tx_insert"
ON public.inventory_transactions FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN (
    'owner', 'admin', 'manager'
  )
);

-- No UPDATE or DELETE — transactions are immutable

--- INVENTORY ALERTS ---

CREATE POLICY "inv_alerts_select"
ON public.inventory_alerts FOR SELECT
USING (tenant_id = public.get_tenant_id());

CREATE POLICY "inv_alerts_update"
ON public.inventory_alerts FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN (
    'owner', 'admin', 'manager'
  )
);

-- No INSERT from client (trigger only)
-- No DELETE (keep alert history)
