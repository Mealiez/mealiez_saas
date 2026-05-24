/*
 * PRD: Recipe Costing Analysis
 * Calculates current cost per serving for all recipes based on WAC.
 */

CREATE OR REPLACE FUNCTION public.get_recipes_with_costs(
  p_tenant_id uuid
)
RETURNS TABLE (
  id             uuid,
  name           text,
  meal_category  text,
  serving_size   int,
  is_active      boolean,
  description    text,
  ingredient_count bigint,
  estimated_cost numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.meal_category,
    r.serving_size,
    r.is_active,
    r.description,
    COUNT(ri.id) AS ingredient_count,
    COALESCE(SUM(
      (ri.quantity_per_serving * (1 + ri.wastage_percentage / 100.0)) *
      public.get_weighted_avg_cost(r.tenant_id, ri.inventory_item_id)
    ), 0) AS estimated_cost
  FROM public.recipes r
  LEFT JOIN public.recipe_ingredients ri ON ri.recipe_id = r.id
  WHERE r.tenant_id = p_tenant_id
  GROUP BY r.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recipes_with_costs TO authenticated;
