/*
 * SETUP: Attendance Automation Cron Job (V3 - Robust)
 * 
 * Instructions:
 * 1. Open your Supabase Dashboard.
 * 2. Go to the SQL Editor.
 * 3. Copy the content below.
 * 4. Replace 'YOUR_SECRET_KEY' with your actual service_role/secret key.
 * 5. Run the script.
 */

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Schedule or Update the job
-- In Supabase/pg_cron, providing a name as the first argument 
-- will automatically UPDATE the job if it exists, or CREATE it if not.
-- This avoids the "could not find valid entry" error from unschedule.
SELECT cron.schedule(
  'process-attendance-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://jplvixcpovpsjgsjgpks.supabase.co/functions/v1/process-attendance-schedules',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SECRET_KEY"}'::jsonb
  );
  $$
);

-- 3. Verify job creation
SELECT jobid, schedule, command, active, jobname 
FROM cron.job 
WHERE jobname = 'process-attendance-every-minute';
