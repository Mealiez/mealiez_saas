/*
 * PRD: Final Inventory RLS Alignment (Robust Fix)
 * Resolves 42501 (RLS Violation) in /api/inventory/transactions
 * Aligns all inventory tables with rank-based role checks (ADR-005).
 */

-- ================================================
-- 1. CLEANUP OLD POLICIES
-- ================================================
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN (
        'inventory_categories', 
        'inventory_items', 
        'inventory_stock', 
        'inventory_transactions', 
        'inventory_alerts'
      )
  ) 
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
  END LOOP;
END $$;

-- ================================================
-- 2. INVENTORY CATEGORIES
-- ================================================
CREATE POLICY "inv_categories_select" ON public.inventory_categories FOR SELECT
USING (tenant_id = public.get_tenant_id() OR public.is_super_admin());

CREATE POLICY "inv_categories_insert" ON public.inventory_categories FOR INSERT
WITH CHECK (
  (tenant_id = public.get_tenant_id() AND public.get_role_rank(public.get_user_role()) >= 3) -- Admin only
  OR public.is_super_admin()
);

CREATE POLICY "inv_categories_update" ON public.inventory_categories FOR UPDATE
USING (tenant_id = public.get_tenant_id() OR public.is_super_admin())
WITH CHECK (
  (tenant_id = public.get_tenant_id() AND public.get_role_rank(public.get_user_role()) >= 3)
  OR public.is_super_admin()
);

CREATE POLICY "inv_categories_delete" ON public.inventory_categories FOR DELETE
USING (
  (tenant_id = public.get_tenant_id() AND public.get_role_rank(public.get_user_role()) >= 3)
  OR public.is_super_admin()
);

-- ================================================
-- 3. INVENTORY ITEMS
-- ================================================
CREATE POLICY "inv_items_select" ON public.inventory_items FOR SELECT
USING (tenant_id = public.get_tenant_id() OR public.is_super_admin());

CREATE POLICY "inv_items_insert" ON public.inventory_items FOR INSERT
WITH CHECK (
  (tenant_id = public.get_tenant_id() AND public.get_role_rank(public.get_user_role()) >= 3)
  OR public.is_super_admin()
);

CREATE POLICY "inv_items_update" ON public.inventory_items FOR UPDATE
USING (tenant_id = public.get_tenant_id() OR public.is_super_admin())
WITH CHECK (
  (tenant_id = public.get_tenant_id() AND public.get_role_rank(public.get_user_role()) >= 3)
  OR public.is_super_admin()
);

CREATE POLICY "inv_items_delete" ON public.inventory_items FOR DELETE
USING (
  (tenant_id = public.get_tenant_id() AND public.get_role_rank(public.get_user_role()) >= 3)
  OR public.is_super_admin()
);

-- ================================================
-- 4. INVENTORY STOCK
-- ================================================
CREATE POLICY "inv_stock_select" ON public.inventory_stock FOR SELECT
USING (tenant_id = public.get_tenant_id() OR public.is_super_admin());

-- Note: No manual INSERT/UPDATE/DELETE on stock (Trigger only)

-- ================================================
-- 5. INVENTORY TRANSACTIONS
-- ================================================
CREATE POLICY "inv_tx_select" ON public.inventory_transactions FOR SELECT
USING (tenant_id = public.get_tenant_id() OR public.is_super_admin());

CREATE POLICY "inv_tx_insert" ON public.inventory_transactions FOR INSERT
WITH CHECK (
  (
    tenant_id = public.get_tenant_id() 
    AND public.get_role_rank(public.get_user_role()) >= 2 -- Manager+ can add stock/use
  )
  OR public.is_super_admin()
);

-- Note: Transactions are immutable (No Update/Delete)

-- ================================================
-- 6. INVENTORY ALERTS
-- ================================================
CREATE POLICY "inv_alerts_select" ON public.inventory_alerts FOR SELECT
USING (tenant_id = public.get_tenant_id() OR public.is_super_admin());

CREATE POLICY "inv_alerts_update" ON public.inventory_alerts FOR UPDATE
USING (tenant_id = public.get_tenant_id() OR public.is_super_admin())
WITH CHECK (
  (
    tenant_id = public.get_tenant_id() 
    AND public.get_role_rank(public.get_user_role()) >= 2 -- Manager+ can dismiss
  )
  OR public.is_super_admin()
);
