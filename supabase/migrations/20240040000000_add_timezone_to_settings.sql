/*
 * PRD: Add Timezone support to Meal Settings
 */

-- 1. Add timezone column with default (assuming Asia/Kolkata for now based on context, or UTC)
ALTER TABLE public.meal_settings 
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';

-- 2. Update existing tenants to a reasonable default if needed
-- UPDATE public.meal_settings SET timezone = 'Asia/Kolkata'; 
