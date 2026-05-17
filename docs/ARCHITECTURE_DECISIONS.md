# Mealiez — Architecture Decision Records

## ADR-001: One Email Per Tenant (MVP Constraint)

**Status:** Active  
**Date:** Tuesday, April 14, 2026

### Decision
A single email address can only belong to one 
tenant in this system.

### Reason
Supabase Auth enforces global email uniqueness.
The current JWT structure stores a single tenant_id
in app_metadata: `{ tenant_id: "uuid" }`.

### Consequence
If User A is registered under Tenant X, they cannot
be invited to Tenant Y. The invite API returns a 
409 with code: EMAIL_IN_OTHER_TENANT.

### Future Migration Path
To support multi-tenant membership per email:
1. Change app_metadata to: `{ tenant_ids: ["uuid"] }`
2. Create junction table: user_tenant_memberships
3. Update RLS: check array contains current tenant_id
4. Update JWT extraction: parse array not single value
5. Add tenant-switcher UI flow

**Do not attempt this during MVP build.**

---

## ADR-002: Role Hierarchy (Non-Negotiable)

**Status:** Active

### Decision
Role ranks: admin(3) > manager(2) > member(1)
(Updated from: owner(4) > admin(3) > manager(2) > member(1))

### Rules
- Admin role assigned during tenant onboarding
- To modify User X, you must strictly outrank X's 
  CURRENT role AND the NEW role being assigned
- Admins cannot modify other Admins (peers blocked)
- No user can modify themselves

---

## ADR-003: tenant_id Source of Truth

**Status:** Active

### Decision
tenant_id is ALWAYS sourced from JWT app_metadata.
It is NEVER accepted from request bodies or 
query parameters.

### Enforcement Points
- API routes: `currentUser.tenant_id` from JWT only
- RLS: `public.get_tenant_id()` from JWT only
- Onboarding: set by server, never by client

---

## ADR-005: Super Admin Architecture (Role Refactor)

**Status:** Active  
**Date:** Thursday, May 14, 2026

### Decision
The 'owner' tenant role is renamed to 'admin'.
A new SUPER ADMIN concept is introduced at the
platform level.

### Tenant Roles (new)
  admin(3) > manager(2) > member(1)

### Super Admin
  is_super_admin: true in auth.users.app_metadata
  No tenant_id — platform-level identity
  Separate UI: /super/* routes
  Separate auth: /super/login
  Separate API: /api/super/* (service role)

### Migration
  UPDATE public.users SET role='admin' WHERE role='owner'
  All JWT app_metadata updated on next user sign-in
  via session.ts getCurrentUser() refresh logic

### Enforcement
  Tenant routes: getCurrentUser() → TenantUser (no super)
  Super admin routes: getSuperAdminUser() → SuperAdminUser
  These two functions NEVER overlap.
