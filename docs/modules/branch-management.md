# Branch Management Module

## Overview
The Branch Management module enables multi-location support for Mealiez. It allows organizations (tenants) to segment their operations across different physical mess branches, while maintaining centralized administration.

## Architecture

### Database Schema
The module introduces a new `branches` table and extends several existing tables to support location-based scoping.

#### `public.branches`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary Key |
| tenant_id | uuid | Foreign Key to `tenants` |
| name | text | Display name of the branch |
| code | text | Unique identifier for the branch within the tenant |
| manager_name | text | (Optional) Primary contact person |
| is_active | boolean | Status flag for the branch |

#### Extensions
- **`public.users`**: Added `branch_id` to link staff and members to a specific location.
- **`public.attendance_sessions`**: Added `branch_id` to track where attendance is being recorded.
- **`public.inventory_transactions`**: Added `branch_id` to attribute stock movements to a location.

### Authorization & Security
- **Identity-only JWT**: The JWT does not contain branch or role claims. All authorization is checked against the database in real-time.
- **RLS (Row Level Security)**: Strict tenant isolation is enforced. Users can only see branches belonging to their `tenant_id`.
- **Data Scoping**:
    - **Admins**: Can see and manage all branches within their tenant.
    - **Managers/Staff**: Queries are automatically filtered by their assigned `branch_id` (fetched from `public.users`).

## API Endpoints

### `GET /api/branches`
Lists all active branches for the authenticated user's tenant.
- **Authentication**: Required.
- **Scoping**: Returns all branches for Admins; (Planned: specific branches for localized roles).

### `POST /api/branches`
Creates a new branch for the tenant.
- **Role**: `admin` only.
- **Plan Enforcement**: 
    - Starter: 1 branch
    - Pro: 5 branches
    - Enterprise: Unlimited
- **Validation**: Enforces unique codes per tenant.

## Key User Flows

### 1. Branch Setup
Admin navigates to the **Branch Management** dashboard and creates physical locations. This must be done before inviting users who need to be assigned to these locations.

### 2. User Invitation
When inviting a new user (Manager, Staff, or Member), the Admin **must** select a branch from the dropdown. This links the user's profile to that location immediately upon account creation.

### 3. Attendance Recording
- **Session Creation**: Attendance sessions are created and tagged with the current manager's `branch_id`.
- **QR Scanning**: When a QR code is scanned, the system fetches the member's branch name from the database and displays it on the scanner UI for verification.

### 4. Inventory Tracking
Staff can attribute inventory movements (like consumption or wastage) to their branch, allowing for location-specific consumption analytics.

## Feature Flag Integration
The module is gated by the `branch_management` feature key in the `tenant_features` table. If disabled, the sidebar link and dashboard card will be hidden, and API requests will be rejected with a `403 FEATURE_DISABLED` response.

## Future Analytics
The `public.get_branch_stats(uuid)` database function provides the foundation for branch-specific dashboards, including:
- Total members per branch.
- Today's attendance count for the location.
- (Planned) Local stock levels and consumption trends.
