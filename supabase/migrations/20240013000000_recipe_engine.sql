-- ====================================================
-- SECTION 1 — EXTEND attendance_sessions TABLE
-- ====================================================

-- attendance_sessions already exists from Phase 6.
-- Add columns needed for inventory integration.

ALTER TABLE public.attendance_sessions
  ADD COLUMN IF NOT EXISTS expected_attendance int,
  ADD COLUMN IF NOT EXISTS actual_attendance   int,
  ADD COLUMN IF NOT EXISTS prep_status         text
    DEFAULT 'NOT_PLANNED'
    CHECK (prep_status IN (
      'NOT_PLANNED',   -- no recipe assigned
      'PLANNED',       -- recipe assigned, ingredients calculated
      'IN_PROGRESS',   -- kitchen is preparing
      'COMPLETED'      -- meal served
    )),
  ADD COLUMN IF NOT EXISTS notes text;

-- ====================================================
-- SECTION 2 — RECIPES TABLE
-- ====================================================

CREATE TABLE IF NOT EXISTS public.recipes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL
                  REFERENCES public.tenants(id)
                  ON DELETE CASCADE,
  name          text NOT NULL,
  meal_category text NOT NULL
                  CHECK (meal_category IN (
                    'BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER', 'ANY'
                  )),
  serving_size  int NOT NULL DEFAULT 1,
  -- base batch size this recipe is defined for
  -- e.g. serving_size=100 means ingredients are for 100 servings
  description   text,
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid
                  REFERENCES public.users(id)
                  ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT recipes_name_tenant_unique
    UNIQUE (tenant_id, name)
);

CREATE INDEX idx_recipes_tenant
  ON public.recipes(tenant_id, is_active);

CREATE TRIGGER recipes_set_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipes_select"
ON public.recipes FOR SELECT
USING (tenant_id = public.get_tenant_id());

CREATE POLICY "recipes_insert"
ON public.recipes FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "recipes_update"
ON public.recipes FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "recipes_delete"
ON public.recipes FOR DELETE
USING (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() = 'admin'
);

-- ====================================================
-- SECTION 3 — RECIPE INGREDIENTS TABLE
-- ====================================================

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id                   uuid PRIMARY KEY
                         DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL
                         REFERENCES public.tenants(id)
                         ON DELETE CASCADE,
  recipe_id            uuid NOT NULL
                         REFERENCES public.recipes(id)
                         ON DELETE CASCADE,
  inventory_item_id    uuid NOT NULL
                         REFERENCES public.inventory_items(id)
                         ON DELETE RESTRICT,
  quantity_per_serving numeric(12,4) NOT NULL
                         CHECK (quantity_per_serving > 0),
  -- quantity for 1 serving (not recipe.serving_size servings)
  -- e.g. 0.08 kg rice per serving
  unit                 text NOT NULL,
  wastage_percentage   numeric(5,2) NOT NULL DEFAULT 0
                         CHECK (
                           wastage_percentage >= 0 AND
                           wastage_percentage <= 100
                         ),
  -- e.g. 10 = 10% wastage on top of usage
  -- effective usage = qty × (1 + wastage_pct/100)
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT recipe_ingredients_unique
    UNIQUE (recipe_id, inventory_item_id)
    -- One item appears once per recipe (combine quantities)
);

CREATE INDEX idx_recipe_ingredients_recipe
  ON public.recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_item
  ON public.recipe_ingredients(inventory_item_id);

ALTER TABLE public.recipe_ingredients
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipe_ingredients_select"
ON public.recipe_ingredients FOR SELECT
USING (tenant_id = public.get_tenant_id());

CREATE POLICY "recipe_ingredients_insert"
ON public.recipe_ingredients FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "recipe_ingredients_update"
ON public.recipe_ingredients FOR UPDATE
USING (tenant_id = public.get_tenant_id())
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "recipe_ingredients_delete"
ON public.recipe_ingredients FOR DELETE
USING (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('admin', 'manager')
);

-- ====================================================
-- SECTION 4 — MEAL SESSION RECIPES (JUNCTION)
-- ====================================================

-- Maps meal sessions to one or more recipes.
-- A session can have multiple dishes.

CREATE TABLE IF NOT EXISTS public.session_recipes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL
                 REFERENCES public.tenants(id)
                 ON DELETE CASCADE,
  session_id   uuid NOT NULL
                 REFERENCES public.attendance_sessions(id)
                 ON DELETE CASCADE,
  recipe_id    uuid NOT NULL
                 REFERENCES public.recipes(id)
                 ON DELETE RESTRICT,
  servings     int,
  -- Number of servings to prepare (nullable = use session attendance)
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT session_recipes_unique
    UNIQUE (session_id, recipe_id)
);

ALTER TABLE public.session_recipes
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_recipes_select"
ON public.session_recipes FOR SELECT
USING (tenant_id = public.get_tenant_id());

CREATE POLICY "session_recipes_insert"
ON public.session_recipes FOR INSERT
WITH CHECK (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('admin', 'manager')
);

CREATE POLICY "session_recipes_delete"
ON public.session_recipes FOR DELETE
USING (
  tenant_id = public.get_tenant_id()
  AND public.get_user_role() IN ('admin', 'manager')
);

-- ====================================================
-- SECTION 5 — RECIPE SCALING FUNCTION
-- ====================================================

/*
 * PRD: Recipe Scaling Engine
 * Calculates ingredient requirements for N servings.
 * Applies wastage_percentage.
 * Returns line-by-line ingredient needs.
 *
 * Formula per ingredient:
 *   required = qty_per_serving × servings × (1 + wastage_pct/100)
 */

CREATE OR REPLACE FUNCTION public.scale_recipe(
  p_recipe_id uuid,
  p_servings  int
)
RETURNS TABLE (
  inventory_item_id   uuid,
  item_name           text,
  unit                text,
  quantity_needed     numeric,
  quantity_with_waste numeric,
  wastage_percentage  numeric,
  current_stock       numeric,
  stock_sufficient    boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ri.inventory_item_id,
    i.name  AS item_name,
    ri.unit,
    ROUND(
      (ri.quantity_per_serving * p_servings)::numeric, 3
    ) AS quantity_needed,
    ROUND(
      (ri.quantity_per_serving * p_servings
        * (1 + ri.wastage_percentage / 100.0))::numeric,
      3
    ) AS quantity_with_waste,
    ri.wastage_percentage,
    COALESCE(s.current_stock, 0) AS current_stock,
    COALESCE(s.current_stock, 0) >=
      ROUND(
        (ri.quantity_per_serving * p_servings
          * (1 + ri.wastage_percentage / 100.0))::numeric,
        3
      )
    AS stock_sufficient
  FROM public.recipe_ingredients ri
  JOIN public.inventory_items i
    ON i.id = ri.inventory_item_id
  LEFT JOIN public.inventory_stock s
    ON s.item_id = ri.inventory_item_id
  WHERE ri.recipe_id = p_recipe_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.scale_recipe
  TO authenticated;

-- ====================================================
-- SECTION 6 — MULTI-RECIPE SCALING FUNCTION
-- ====================================================

/*
 * Scales multiple recipes for a session at once.
 * Aggregates same ingredient across multiple dishes.
 * e.g. Dal appears in Rice+Dal AND in Tadka Dal:
 *      aggregated to single total for dal.
 *
 * Input: session_id
 * Uses: session_recipes junction + expected_attendance
 */

CREATE OR REPLACE FUNCTION public.calculate_session_requirements(
  p_session_id uuid,
  p_servings   int  -- expected attendance
)
RETURNS TABLE (
  inventory_item_id   uuid,
  item_name           text,
  unit                text,
  total_quantity_needed   numeric,
  total_with_waste        numeric,
  current_stock           numeric,
  stock_sufficient        boolean,
  shortage_quantity       numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ri.inventory_item_id,
    i.name,
    ri.unit,
    ROUND(SUM(
      ri.quantity_per_serving * p_servings
    )::numeric, 3) AS total_quantity_needed,
    ROUND(SUM(
      ri.quantity_per_serving * p_servings
        * (1 + ri.wastage_percentage / 100.0)
    )::numeric, 3) AS total_with_waste,
    COALESCE(s.current_stock, 0) AS current_stock,
    COALESCE(s.current_stock, 0) >= ROUND(SUM(
      ri.quantity_per_serving * p_servings
        * (1 + ri.wastage_percentage / 100.0)
    )::numeric, 3) AS stock_sufficient,
    GREATEST(0,
      ROUND(SUM(
        ri.quantity_per_serving * p_servings
          * (1 + ri.wastage_percentage / 100.0)
      )::numeric, 3) - COALESCE(s.current_stock, 0)
    ) AS shortage_quantity
  FROM public.session_recipes sr
  JOIN public.recipe_ingredients ri
    ON ri.recipe_id = sr.recipe_id
  JOIN public.inventory_items i
    ON i.id = ri.inventory_item_id
  LEFT JOIN public.inventory_stock s
    ON s.item_id = ri.inventory_item_id
  WHERE sr.session_id = p_session_id
  GROUP BY
    ri.inventory_item_id,
    i.name,
    ri.unit,
    s.current_stock;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_session_requirements
  TO authenticated;
