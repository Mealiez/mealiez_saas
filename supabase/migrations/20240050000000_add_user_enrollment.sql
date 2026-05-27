/*
 * PRD: User Enrollment Number
 * Adds enrollment_no column to users table.
 */

-- 0. Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Add enrollment_no column
ALTER TABLE public.users
ADD COLUMN enrollment_no text;

-- 2. Add index for faster searching
CREATE INDEX idx_users_enrollment_no ON public.users(enrollment_no);
CREATE INDEX idx_users_full_name_trgm ON public.users USING gin (full_name gin_trgm_ops);
