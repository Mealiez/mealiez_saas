-- Fix tenant plan constraint to include 'trial' and 'starter'
-- This ensures compatibility with the onboarding API which defaults to 'trial'

ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_plan_check;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_plan_check
    CHECK (plan IN ('trial', 'starter', 'free', 'basic', 'pro', 'enterprise'));

-- Also ensure the default plan for the table is 'trial' to match app expectations
ALTER TABLE public.tenants
  ALTER COLUMN plan SET DEFAULT 'trial';
