/*
 * PRD: Branch Management Finalization (Delta)
 * This script adds the seeding and backfill logic that was missing from the initial migration.
 */

-- 1. Update the seeding function for future tenants
CREATE OR REPLACE FUNCTION public.seed_tenant_features(
  p_tenant_id uuid
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.tenant_features 
    (tenant_id, feature_key, is_enabled)
  VALUES
    (p_tenant_id, 'meal_management',      true),
    (p_tenant_id, 'attendance_tracking',  true),
    (p_tenant_id, 'inventory_management', false),
    (p_tenant_id, 'pre_meal_requests',    false),
    (p_tenant_id, 'custom_reports',       false),
    (p_tenant_id, 'billing',              true),
    (p_tenant_id, 'branch_management',    false)
  ON CONFLICT (tenant_id, feature_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Backfill existing tenants so the feature flag exists in their records
INSERT INTO public.tenant_features (tenant_id, feature_key, is_enabled)
SELECT id, 'branch_management', false
FROM public.tenants
ON CONFLICT (tenant_id, feature_key) DO NOTHING;

-- 3. Ensure baseline permissions for the stats helper
GRANT EXECUTE ON FUNCTION public.get_branch_stats(uuid) TO authenticated;
