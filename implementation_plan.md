# Implementation Plan: Production Environment Hardening & Dedicated Platform Admin Console (/admin)

Remove all debug shortcuts, demo bypasses, and "Open Testing Mode" banners from public user-facing surfaces (`/`, `/login`, `/register`, `/onboarding`, `/workspace`), making the system look and operate as a true production SaaS. Move all platform-level governance, organization/store/user metrics, user quota restrictions, and feature toggles to a dedicated **Platform Administration Console** at `/admin`.

---

## User Review Required

> [!IMPORTANT]
> **Production vs Admin Separation**:
> 1. **Public/Tenant Experience (`/`, `/login`, `/register`, `/workspace`)**:
>    - The "1-Click Demo Owner Sign In (ไม่ต้องพิมพ์)" shortcut and "Explore Demo Workspace without registering" buttons will be **completely removed** from public login and registration pages. Users must log in with their real registered accounts.
>    - All "Open Testing Mode: Unlimited" badges, tag pills, and testing stats will be replaced with production indicators (e.g. "Platform Operational", "99.99% Uptime SLA", "Enterprise Edition").
> 2. **Platform Admin Console (`/admin`)**:
>    - All platform debugging, cross-tenant metrics, and non-customer governance controls will be consolidated into `http://localhost:4321/admin`.
>    - Includes:
>      - **Platform Overview**: Total Organizations, Total Stores, Total Platform Users, Active Terminals, System Operating Mode.
>      - **Operating Mode Control**: Ability to toggle between `Production` (strict quotas & active feature enforcement) and `Testing Mode` directly from the admin dashboard.
>      - **Organization Governance**: View all organizations, suspend/activate tenants, set max user quotas, set max store quotas, and toggle feature flags per tenant (`POS`, `Kiosk`, `Booking`, `CRM`, `Inventory`, `Odoo ERP`).
>      - **User Governance**: View all platform users across organizations, view assigned roles, and lock/suspend user accounts.
>      - **Admin Fast-Evaluation Bypass**: Restricted to `/admin` for internal administrators and developers.

---

## Proposed Changes

### Database Layer (`packages/db`)

#### [NEW] [20260918140000_platform_admin_and_quotas.sql](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/supabase/migrations/20260918140000_platform_admin_and_quotas.sql)
- Add columns to `public.organizations`:
  - `max_users integer DEFAULT 10`
  - `max_stores integer DEFAULT 5`
  - `feature_flags jsonb DEFAULT '{"pos": true, "kiosk": true, "booking": true, "crm": true, "inventory": true, "odoo": false}'::jsonb`
- Update `public.system_settings`:
  - Set default `operating_mode` to `{"mode": "production", "unlimited": false}`.

#### [NEW] [admin.ts](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/packages/db/src/admin.ts)
- Implement administrative database queries:
  - `getPlatformOverview(database)`: Counts total organizations, stores, users, paired terminals, active subscriptions, and returns current system operating mode.
  - `listAdminOrganizations(database)`: Lists all organizations with counts of stores, members, current status, user/store limits, and feature flags.
  - `updateAdminOrganization(database, orgId, updates)`: Updates status (`ACTIVE`/`SUSPENDED`), `max_users`, `max_stores`, and `feature_flags`.
  - `listAdminUsers(database)`: Lists all registered user profiles with their organization memberships, roles, assigned stores, and account status (`ACTIVE`/`DISABLED`).
  - `updateAdminUserStatus(database, userId, status)`: Toggles user account between `ACTIVE` and `DISABLED`.
  - `setOperatingMode(database, mode, unlimited)`: Updates `system_settings` operating mode.

#### [MODIFY] [index.ts](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/packages/db/src/index.ts)
- Export admin module functions.

---

### API Gateway (`apps/gateway`)

#### [MODIFY] [app.ts](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/apps/gateway/src/app.ts)
- Register `/api/v1/admin/*` route surface:
  - `GET /api/v1/admin/overview`: Returns platform-wide KPI counts and operating mode.
  - `GET /api/v1/admin/organizations`: Returns list of all organizations with quotas and feature toggles.
  - `PATCH /api/v1/admin/organizations/:id`: Updates organization status, quotas (`max_users`, `max_stores`), and feature flags (`pos`, `kiosk`, `booking`, `crm`, `inventory`, `odoo`).
  - `GET /api/v1/admin/users`: Returns all platform user accounts with memberships and roles.
  - `PATCH /api/v1/admin/users/:id`: Locks or activates user profile.
  - `GET /api/v1/admin/system`: Returns global system settings.
  - `POST /api/v1/admin/system/mode`: Toggles system operating mode between `production` and `testing`.
  - `POST /api/v1/admin/demo-bypass`: Admin-only bypass to quickly generate an owner token for testing.

---

### Web Server & User-Facing Pages (`apps/web`)

#### [MODIFY] [server.ts](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/apps/web/src/server.ts)
- Add `/admin` route mapping to `/admin.html`.

#### [NEW] [admin.html](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/apps/web/src/public/admin.html)
- Create dedicated Platform Administration Console adhering to `skills/ux-ui-skill/SKILL.md`:
  - **Sidebar**: Platform Admin branding, sections: Overview, Organizations & Quotas, Users & Access, System & Features.
  - **Overview Tab**: Live KPI cards (Total Orgs, Total Stores, Total Users, Paired Hardware), System Operating Mode Switch (`Production` vs `Testing Mode`), Quick Demo Impersonation button.
  - **Organizations Tab**: Data table of all organizations. Includes "Edit Tenant" modal to adjust `max_users`, `max_stores`, toggle module access (POS, Kiosk, Booking, CRM, Inventory, Odoo), and suspend/activate tenant.
  - **Users Tab**: Data table of all users across the platform. Includes "Manage User" action to disable/enable user accounts or view assigned stores.
  - **System & Features Tab**: Global feature flag defaults and direct SQL query trigger.

#### [MODIFY] [landing.html](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/apps/web/src/public/landing.html) & [index.html](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/apps/web/src/public/index.html)
- Remove "Open Testing Mode Active • All Apps Unrestricted" badges and "Open Testing Mode" pills.
- Replace with professional production branding: "Enterprise Multi-Tenant Operating Platform", "99.99% Guaranteed SLA".
- Change CTAs to clean customer journey: "Start Free Trial →" (`/register`) and "Sign In ↗" (`/login`).
- Remove "Explore Demo Workspace ↗" debug shortcut from the public hero.

#### [MODIFY] [register.html](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/apps/web/src/public/register.html)
- Remove "เข้าสู่ Demo Workspace โดยไม่ต้องสมัคร ↗" debug bypass button.

#### [MODIFY] [login.html](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/apps/web/src/public/login.html)
- Remove "1-Click Demo Owner Sign In (ไม่ต้องพิมพ์)" debug bypass button from public user login.

#### [MODIFY] [onboarding.html](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/apps/web/src/public/onboarding.html)
- Remove "Open Testing Mode" status pills and badges.
- Present as standard production setup wizard.

#### [MODIFY] [workspace.html](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/apps/web/src/public/workspace.html)
- Remove "Open Testing Mode: Unlimited" badge from the topbar.
- Replace with "Enterprise Platform • Operational".

---

## Verification Plan

### Automated Tests
- Create `test/admin.test.ts`:
  - 1. Test `GET /api/v1/admin/overview` returns valid platform counts (orgs, stores, users).
  - 2. Test `GET /api/v1/admin/organizations` lists organizations with quotas and feature flags.
  - 3. Test `PATCH /api/v1/admin/organizations/:id` updates `max_users`, `max_stores`, and feature flags.
  - 4. Test `GET /api/v1/admin/users` returns platform users with membership data.
  - 5. Test `PATCH /api/v1/admin/users/:id` updates user account status (`DISABLED`/`ACTIVE`).
  - 6. Test `POST /api/v1/admin/system/mode` successfully toggles operating mode between `production` and `testing`.
- Run `bun test` across the entire workspace to ensure 0 regressions (all 69+ tests pass).

### Manual Verification
- Verify `http://localhost:4321/`: confirm no debug/testing badges or bypasses appear on Landing, Login, or Register.
- Verify `http://localhost:4321/admin`:
  - Platform overview displays real total organizations, stores, and users.
  - Organizations table displays all registered organizations.
  - Editing an organization's feature flags (e.g. toggling Kiosk or Booking) updates successfully.
  - Adjusting user/store quotas (e.g. max users = 5) saves properly.
  - User management allows toggling account status.
  - Operating mode toggle works seamlessly.
