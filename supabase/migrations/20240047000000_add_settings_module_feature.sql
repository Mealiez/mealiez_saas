/*
 * PRD: Add Settings Module Feature Flag
 * 1. Updates allowed feature keys check constraint.
 * 2. Updates seed_tenant_features to include 'settings_module'.
 * 3. Backfills 'settings_module' for all existing tenants.
 */

-- 1. Update the allowed features check constraint
ALTER TABLE public.tenant_features
  DROP CONSTRAINT IF EXISTS feature_key_allowed_values;

ALTER TABLE public.tenant_features
  ADD CONSTRAINT feature_key_allowed_values CHECK (feature_key IN (
    'meal_management', 
    'attendance_tracking', 
    'inventory_management', 
    'pre_meal_requests',
    'custom_reports', 
    'billing', 
    'branch_management',
    'settings_module'
  ));

-- 2. Update the seeding function for future tenants
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
    (p_tenant_id, 'branch_management',    false),
    (p_tenant_id, 'settings_module',      true)
  ON CONFLICT (tenant_id, feature_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Backfill existing tenants
INSERT INTO public.tenant_features (tenant_id, feature_key, is_enabled)
SELECT id, 'settings_module', true
FROM public.tenants
ON CONFLICT (tenant_id, feature_key) DO NOTHING;
