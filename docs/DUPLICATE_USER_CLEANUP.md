# Duplicate User Cleanup Guide

Inconsistent phone normalization in previous versions led to duplicate accounts (e.g., `+91...` vs `91...`). Follow these steps to identify and clean up the data.

### 1. Identify Duplicates
Run this query in your **Supabase SQL Editor** to see all accounts that are technically duplicates:

```sql
WITH normalized_users AS (
  SELECT 
    id,
    email,
    -- Extract digits and normalize (ensuring 91 prefix for 10-digit Indian numbers)
    CASE 
      WHEN regexp_replace(split_part(email, '@', 1), '\D', '', 'g') ~ '^\d{10}$' 
      THEN '91' || regexp_replace(split_part(email, '@', 1), '\D', '', 'g')
      ELSE regexp_replace(split_part(email, '@', 1), '\D', '', 'g')
    END as normalized_phone
  FROM auth.users
  WHERE email LIKE '%@mobile.mealiez.in'
)
SELECT 
  normalized_phone,
  count(*),
  array_agg(email) as emails,
  array_agg(id) as ids
FROM normalized_users
GROUP BY normalized_phone
HAVING count(*) > 1;
```

### 2. Recommended Cleanup Strategy
To safely delete duplicates while preserving the "correct" version (the one that matches the new normalization logic: `91XXXXXXXXXX@mobile.mealiez.in`):

**⚠️ WARNING: Back up your database before running delete operations.**

Run this to delete the "incorrectly formatted" duplicates while keeping the standard one:

```sql
-- This deletes users whose email is NOT the standard 12-digit format but has a duplicate that IS
DELETE FROM auth.users
WHERE id IN (
  SELECT u1.id
  FROM auth.users u1
  JOIN auth.users u2 ON (
    -- u1 is the "bad" format (e.g. starts with +91)
    -- u2 is the "good" format (e.g. 91XXXXXXXXXX)
    regexp_replace(split_part(u1.email, '@', 1), '\D', '', 'g') = split_part(u2.email, '@', 1)
  )
  WHERE u1.email LIKE '+%@mobile.mealiez.in'
    AND u2.email ~ '^91\d{10}@mobile.mealiez.in'
    AND u1.id <> u2.id
);
```

### 3. Verification
After cleanup, any new invites will use the robust normalization logic implemented in `lib/utils/phone.ts`, which ensures:
- All non-digits are stripped.
- 10-digit numbers automatically get the `91` prefix.
- Emails are always formatted as `91XXXXXXXXXX@mobile.mealiez.in`.
