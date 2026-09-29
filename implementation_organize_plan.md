# Organization Workspace vs Store Workspace Context Hierarchy & Scoped RBAC Implementation Plan

This plan establishes the production Information Architecture, 4-Tier Scoped RBAC, and Contextual Workspace Model across the **Aevo Ecosystem**, aligning with the architectural specification:
1. **Core Domain Model**: `Organization` as Business/Brand owner, `Store` as Location/Branch.
2. **Workspace Philosophy**: **Workspace is NOT a database entity**; it is an **Operating Scope & UI Context** (`Organization Workspace` vs `Store Workspace`).
3. **4-Tier Scoped RBAC**:
   - `OWNER` (Full organization control; sole authority to transfer ownership or delete organization).
   - `ORGANIZATION_MANAGER` (Organization scope; manages stores, apps, products, team; no ownership transfer/delete).
   - `STORE_MANAGER` (Store scope; manages assigned store, staff, POS, kiosk, booking, devices, cash sessions).
   - `STAFF` (Operational scope: Cashier, Booking Staff, Kiosk Staff, Viewer; multi-role enabled).
4. **Scope as the Heart of Permission**: `PLATFORM`, `ORGANIZATION`, `STORE`. Permissions are explicit: `Role + Permission + Scope + App Entitlement`.
5. **Scoped Invitation Model**: `invitations` with `scope_type`, `scope_id`, `role_id`, `invited_by`, and delegation hierarchy rules.
6. **Unified Hierarchical Context Switcher**: Replaces legacy side-by-side dropdowns with a single context switcher flyout.
7. **Organization Workspace vs Store Workspace UX**:
   - **Organization Workspace**: Brand overview, Stores list & performance, Active Apps, Total Team, Revenue (no "Terminals" KPI at org level), Billing, Integrations, Organization Settings.
   - **Store Workspace**: Daily operations overview, Sales Today, Orders Today, Bookings Today, Devices (Online/Total), POS/Kiosk/Booking launchers, Store Staff, Store Settings.
8. **B2B Editorial Design System (`ux-ui-skill`)**:
   - Typography: Editorial serif headings (`Newsreader`), clean sans body, tabular figures (`font-variant-numeric: tabular-nums`).
   - Palette: Warm neutral base, soft sage/matcha tint (`#e4eedb`), deep action accents (`#2d4a30`), hairline borders (`#e2e8de`).
   - ZERO emojis or emoticons anywhere; semantic SVG icons throughout.
   - 5-state completeness (Loading skeleton, Empty, Error with retry, Active, Disabled).

---

## User Review Required

> [!IMPORTANT]
> **Workspace is Purely a Context / Scope, NOT a Database Entity Table**
> We strictly adhere to your rule: No `organization_workspaces` or `store_workspaces` tables will be created in PostgreSQL. Instead, the database stores `organizations`, `organization_members`, `stores`, `store_members`, `roles`, `permissions`, `role_permissions`, and `invitations`. The UI and API operate in either `ORGANIZATION` scope or `STORE` scope.

> [!IMPORTANT]
> **Owner-Exclusive Invariants**
> - Only the `OWNER` can transfer organization ownership or delete/archive the organization.
> - `ORGANIZATION_MANAGER` accounts cannot delete the organization, change the owner, or alter the owner's security.
> - `STORE_MANAGER` accounts are strictly scoped to their assigned store(s) and cannot access or modify organization billing, settings, or other stores.

> [!NOTE]
> **Backward Compatibility for Existing Stores & Members**
> Existing memberships will be mapped to `organization_members`, and `membership_stores` will be mapped to `store_members` with backward-compatible views/helpers so no existing test accounts or demo data are broken.

---

## Proposed Changes

### Phase 1: Database Schema & Migration (Scoped Roles & Invitations)

#### [NEW] [20260918170000_scoped_roles_and_workspaces.sql](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/supabase/migrations/20260918170000_scoped_roles_and_workspaces.sql)
- **Roles & Permissions Scope Hardening**:
  - Add `scope_type text check (scope_type in ('PLATFORM', 'ORGANIZATION', 'STORE'))` to `roles`.
  - Seed/update role definitions:
    - `OWNER` (`ORGANIZATION` scope, full control).
    - `ORGANIZATION_MANAGER` (`ORGANIZATION` scope).
    - `STORE_MANAGER` (`STORE` scope).
    - `CASHIER`, `BOOKING_STAFF`, `KIOSK_STAFF`, `STAFF`, `VIEWER` (`STORE` scope).
  - Add `owner_user_id uuid references auth.users(id)` to `organizations`.
- **Store Memberships Table (`public.store_members`)**:
  - Columns: `id uuid primary key default gen_random_uuid()`, `store_id uuid references stores(id) on delete cascade`, `user_id uuid references auth.users(id) on delete cascade`, `role_id uuid references roles(id) on delete restrict`, `status text default 'ACTIVE'`, `invited_by uuid`, `joined_at timestamptz default now()`, `unique(store_id, user_id, role_id)`.
  - Multi-role support: staff can have multiple roles per store.
- **Invitations Table (`public.invitations`)**:
  - Columns: `id uuid primary key default gen_random_uuid()`, `organization_id uuid not null references organizations(id) on delete cascade`, `store_id uuid references stores(id) on delete cascade`, `email text not null`, `role_id uuid not null references roles(id)`, `scope_type text not null check (scope_type in ('ORGANIZATION', 'STORE'))`, `scope_id uuid not null`, `invited_by uuid not null references auth.users(id)`, `status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'))`, `expires_at timestamptz not null default (now() + interval '7 days')`, `accepted_at timestamptz`, `created_at timestamptz not null default now()`.
- **Compatibility View**:
  - `public.organization_members` as view or direct alias for `public.memberships` to keep existing database code functional.

---

### Phase 2: Contracts, Types & RBAC Scope Engine

#### [MODIFY] [packages/contracts/src/index.ts](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/packages/contracts/src/index.ts)
- Add `ScopeType = "PLATFORM" | "ORGANIZATION" | "STORE"`.
- Update `roles` array to include `ORGANIZATION_MANAGER`, `STORE_MANAGER`, `BOOKING_STAFF`, `KIOSK_STAFF` alongside existing roles.
- Define `StoreMemberSummary` and `ScopedRoleSummary`.
- Define `InvitationSummary` and `CreateInvitationInput`.
- Define `OrganizationOverviewStats`:
  - `totalStores: number`, `activeApps: number`, `totalMembers: number`, `todayRevenueMinor: number`, `monthRevenueMinor: number`, `storePerformance: Array<{ storeId: string; name: string; code: string; status: string; todayRevenueMinor: number; ordersCount: number }>`.
- Define `StoreOverviewStats`:
  - `todaySalesMinor: number`, `todayOrders: number`, `todayBookings: number`, `devicesOnline: number`, `devicesTotal: number`.

#### [MODIFY] [packages/auth/src/rbac.ts](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/packages/auth/src/rbac.ts)
- Add `hasScopedPermission(principal, permission, targetScope: { scopeType: ScopeType; scopeId: string })`.
- Add explicit ownership check: `isOrganizationOwner(principal, orgId)`.
- Enforce explicit permissions rather than hardcoded inheritance.

#### [MODIFY] [packages/auth/src/casl.ts](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/packages/auth/src/casl.ts)
- Update abilities to resolve based on `principal.role`, `principal.permissions`, and `entitlements`.
- Support `ORGANIZATION_MANAGER` and `STORE_MANAGER` rule definitions.

---

### Phase 3: Database Repositories & Gateway API Endpoints

#### [NEW] [packages/db/src/invitations.ts](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/packages/db/src/invitations.ts)
- `createInvitation(database, principal, input)`: Validates inviter's scope:
  - Owner can invite Org Manager, Store Manager, Staff.
  - Org Manager can invite Store Manager, Staff.
  - Store Manager can only invite Staff for their assigned store.
- `listInvitations(database, principal, query)`: Filtered by scope.
- `revokeInvitation(database, principal, invitationId)`.
- `acceptInvitation(database, userId, invitationId)`.

#### [MODIFY] [packages/db/src/organizations.ts](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/packages/db/src/organizations.ts)
- Implement `getOrganizationOverviewMetrics(database, orgId)`: Calculates stores, active apps, total staff, and revenue breakdown.
- Implement `getStoreOverviewMetrics(database, orgId, storeId)`: Calculates sales today, orders today, bookings today, and devices online/total.

#### [MODIFY] [apps/gateway/src/app.ts](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/apps/gateway/src/app.ts)
- Add `/api/v1/hub/overview/organization`: Returns top-level Organization metrics, store performance roster, active apps.
- Add `/api/v1/hub/overview/store`: Returns store-level metrics (sales, orders, bookings, devices).
- Add `/api/v1/hub/invitations`: GET (list) and POST (create scoped invitation).
- Add `/api/v1/hub/invitations/:id/revoke`: POST to revoke pending invitation.
- Enforce that store-scoped endpoints require both valid `x-organization-id` and verified `storeId` against store membership.

---

### Phase 4: UI Redesign — Hierarchical Context Switcher & Dual Workspaces

#### [MODIFY] [apps/web/src/public/workspace.html](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/apps/web/src/public/workspace.html)
- **Hierarchical Context Switcher**:
  - Replaces the 2 side-by-side `<select>` dropdowns.
  - Single button trigger showing:
    - In Organization mode: `[Aevo Sport ▼ / Organization Workspace]`.
    - In Store mode: `[Aevo Sport / Chiang Mai ▼ / Store Workspace]`.
  - Accessible modal/dropdown menu:
    - Section 1: "Organization Workspace" (Switch back to high-level brand view).
    - Section 2: "Stores" (List of active stores with click-to-switch).
    - Footer: "+ Add Store" and "Manage Organization".
- **Dual Workspace Viewports**:
  - **Mode 1: Organization Workspace (Default for Owner / Org Manager)**:
    - Context: No store required.
    - Sidebar items: Overview, Stores, Applications, Products, Customers, Orders, Reports, Team, Billing & Plans, Integrations, Settings.
    - Dashboard KPIs: Stores count (e.g. 12), Active Apps (3), Team Members (148), Today's / Monthly Revenue (฿245,800).
    - Performance Table: List of stores with status and revenue, with "Open Store Workspace" direct buttons.
  - **Mode 2: Store Workspace (Default for Store Manager or when Store selected)**:
    - Context: Active Store (e.g. "Chiang Mai").
    - Sidebar items: Overview, POS, Orders, Booking, Kiosk, Products, Customers, Resources, Devices, Staff, Reports, Store Settings.
    - Dashboard KPIs: Sales Today, Orders Today, Bookings Today, Devices (Online / Total).
    - Fast Launch Actions: Launch POS, Launch Kiosk, View Bookings, Cash Session.
- **Strict Visual Standards (`ux-ui-skill`)**:
  - Remove ALL emojis/emoticons. Replace with semantic SVG icons.
  - Typography: `Newsreader` editorial serif headings, `Plus Jakarta Sans` body, `font-variant-numeric: tabular-nums` for all stats and currency.
  - Palette: `#e4eedb` soft green pill badges, `#2d4a30` buttons and accents, `#ffffff` card surfaces, hairline borders.
  - 5-state completeness across all data cards.

#### [MODIFY] [apps/web/src/public/organize.html](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/apps/web/src/public/organize.html)
- Update Context Switcher to match the unified component.
- Separate Organization Team (Owners & Org Managers) from Store Staff (Store Managers & Cashiers/Booking Staff).
- Add invitation modal with explicit role selection and scope assignment (`ORGANIZATION` vs `STORE`).
- Remove any emojis/emoticons and apply editorial B2B styling.

---

## Verification Plan

### Automated Tests
1. **RBAC & Casl Unit Tests**:
   - `bun test packages/auth/test/rbac.test.ts`
   - `bun test packages/auth/test/casl.test.ts`
   - Verify explicit scope checks: Owner can manage billing/org; Org Manager cannot delete org or transfer ownership; Store Manager cannot manage billing or other stores.
2. **Typecheck & Monorepo Build**:
   - `bun x tsc --noEmit`
   - Ensure all packages compile with zero errors.
3. **Gateway Unit & Flow Tests**:
   - Verify overview endpoints (`/api/v1/hub/overview/organization` and `/api/v1/hub/overview/store`).
   - Verify invitation creation and scope enforcement.

### Manual / Browser Verification
1. **Context Switcher Flow**:
   - Navigate to `/workspace`.
   - Verify initial load displays **Organization Workspace** with cross-store overview metrics (Stores, Active Apps, Team Members, Total Revenue).
   - Verify "Terminals" is NOT displayed as a primary organization-level metric.
   - Click the Context Switcher: verify flyout shows Organization Workspace option, list of stores, and "+ Add Store".
   - Select a store (e.g. "Main Store"): verify instant transition to **Store Workspace**.
   - Verify Store Workspace displays store-level KPIs (Sales Today, Orders, Bookings, Devices Online/Total) and store operational navigation (POS, Kiosk, Booking, Devices, Staff).
2. **Design System & Aesthetics**:
   - Inspect page with browser tools to confirm NO emojis/emoticons in HTML or rendered text.
   - Check typography (Newsreader serif headings, tabular figures for all numeric badges).
   - Check color palette compliance (`#e4eedb` pills, `#2d4a30` buttons).
   - Test responsive layout on desktop (1280px), tablet (980px), and mobile (600px).
