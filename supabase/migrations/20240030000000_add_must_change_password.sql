/*
 * PRD: Add must_change_password column
 * Part of the Enterprise Invite Onboarding flow.
 */

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Also update existing users to false just to be safe (though default handles it)
UPDATE public.users SET must_change_password = false WHERE must_change_password IS NULL;
