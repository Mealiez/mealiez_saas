-- Add invite_method and invited_temp_password to users table
ALTER TABLE public.users 
ADD COLUMN invite_method text DEFAULT 'email' CHECK (invite_method IN ('email', 'phone')),
ADD COLUMN invited_temp_password text;

-- Add index for exporting
CREATE INDEX idx_users_invite_method ON public.users(invite_method);
