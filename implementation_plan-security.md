# Aevo Ecosystem Security & Entitlement Architecture Implementation Plan

This implementation plan establishes a production-grade security and entitlement architecture across the **Aevo Ecosystem**, incorporating the 14 core design requirements:
1. **Production Subscription Flow** (Stripe Checkout → Webhook → DB → Entitlement → Server-side guard).
2. **Decoupled Plan & Entitlement Engine** (`Plan -> Plan Entitlements -> Org Entitlements -> Feature`).
3. **Normalized Subscription Structure** (`subscriptions` table with lifecycle and multi-provider readiness).
4. **Stripe Webhook as Ground Truth** (Cryptographic signatures, idempotency, event handlers).
5. **Privileged Admin Application Separation** (`admin.aevo.app` / privileged service, not a hidden client route).
6. **Platform Roles vs Organization Roles** (`SUPER_ADMIN`, `SUPPORT`, `OPS`, etc. strictly isolated from `OWNER`, `ADMIN`, etc.).
7. **Server-Side Admin Authorization** (`requirePlatformPermission` on every endpoint).
8. **Admin Debugging Safeguards** (Read vs Dangerous action separation, mandatory before/after audit logging with reason).
9. **Ephemeral User Impersonation** (15–30 min TTL, UI banner, immutable audit log).
10. **Soft Deletion Lifecycle** (`ACTIVE -> SUSPENDED -> ARCHIVED -> DELETED`).
11. **Multi-Tenant Scoping & RLS Defense-in-Depth** (`WHERE organization_id = ...` + Postgres RLS).
12. **Backend Service Role Isolation** (Zero exposure of `SUPABASE_SERVICE_ROLE_KEY` to client).
13. **Monorepo Package Modularization** (Shared `@aevo/entitlements` package).
14. **Registration & Hub Self-Service Billing** (`Settings -> Billing` in Hub, `/subscriptions` in Aevo Admin across tenants).

---

## User Review Required

> [!IMPORTANT]
> **Elimination of Raw SQL Runner (`/api/v1/hub/sql`) & Demo Bypass (`/api/v1/admin/demo-bypass`)**
> The current gateway and `admin.html` expose an arbitrary SQL execution endpoint and a demo bypass button that mints synthetic owner sessions. In production security architecture, these will be strictly removed from public and admin surfaces.

> [!WARNING]
> **Separation of Platform Admin vs Organization Owner**
> Previously, owner accounts with certain email allowlists had admin access. Under the new model, **Platform Roles** (`SUPER_ADMIN`, `SUPPORT`, `OPS`, `BILLING_ADMIN`, `DEVELOPER`, `AUDITOR`) are stored in a dedicated `platform_users` table. Organization `OWNER` accounts will no longer automatically have access to `/admin` unless explicitly granted a Platform Role.

> [!NOTE]
> **Backward Compatibility for Active Trials & Testing Mode**
> Existing stores with active trials in `app_subscriptions` will be backfilled into the new `subscriptions` and `organization_entitlements` tables so no current test environments or tenant stores are disrupted.

---

## Architecture Decision

1. **Privileged Admin is a separate application boundary**:
   - The selected implementation is `aevo-hub/apps/admin`, a React Router Framework Mode app with its own build, runtime port, web origin, session cookie, CSRF cookie, and API gateway process.
   - The Admin UI and Hub UI share typed contracts, the design system, and the Core API domain packages, but they do not share browser sessions.
   - Local Admin runs with `AEVO_APP_CODE=ADMIN` on `http://localhost:4335`, backed by a separate gateway instance on `http://localhost:4001`. Production maps this boundary to `admin.aevo.app` (or the equivalent privileged hostname).
   - `/api/v1/admin/*` is served only by the Admin gateway runtime. A Hub gateway session cannot use the Admin API, even when the same user has an organization role.

2. **Stripe Webhook Secret Configuration**:
   - We will configure `STRIPE_WEBHOOK_SECRET` in `.env` for production cryptographic verification while retaining an internal mock verification mode for local Bun test suites.

---

## Proposed Changes

The changes strictly follow the **4-Step Lock Order**:
`Database Schema & RLS` → `Permission & Entitlement Model` → `Stripe Webhook & Billing Flow` → `Privileged Admin Authorization` → `Downstream Apps Integration`.

---

### 1. Database Schema & RLS Layer (Lock Step 1)

#### [NEW] [20260918160000_security_and_entitlements_v2.sql](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/supabase/migrations/20260918160000_security_and_entitlements_v2.sql)
- **Plans Table (`public.plans`)**:
  - Columns: `id` (text, e.g. `'starter'`, `'business'`, `'enterprise'`), `name`, `description`, `billing_interval`, `price_minor`, `status`, `created_at`.
- **Plan Entitlements Table (`public.plan_entitlements`)**:
  - Columns: `id`, `plan_id` (FK to `plans`), `feature_key`, `is_enabled`, `limit_value`.
  - Default plan seeds (`STARTER`, `BUSINESS`, `ENTERPRISE`) mapping to features (`pos`, `kiosk`, `booking`, `advanced_analytics`, `odoo_integration`, `unlimited_staff`, `api_access`).
- **Normalized Subscriptions Table (`public.subscriptions`)**:
  - Columns: `id`, `organization_id` (FK), `plan_id` (FK), `provider` (`STRIPE`, `MANUAL`, `ENTERPRISE`), `provider_customer_id`, `provider_subscription_id`, `status` (`TRIALING`, `ACTIVE`, `PAST_DUE`, `GRACE_PERIOD`, `CANCELED`, `EXPIRED`), `trial_start`, `trial_end`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, `canceled_at`, `created_at`, `updated_at`.
- **Organization Entitlements Table (`public.organization_entitlements`)**:
  - Columns: `id`, `organization_id` (FK), `feature_key`, `is_enabled`, `custom_override` (boolean), `limit_value` (nullable int), `updated_at`.
- **Usage Counters Table (`public.usage_counters`)**:
  - Columns: `id`, `organization_id` (FK), `feature_key`, `current_count`, `period_start`, `period_end`, `updated_at`.
- **Platform Users & Roles (`public.platform_users`, `public.platform_roles`)**:
  - Platform roles: `SUPER_ADMIN`, `SUPPORT`, `OPS`, `BILLING_ADMIN`, `DEVELOPER`, `AUDITOR`.
  - Decoupled from tenant `memberships`.
- **Impersonation Sessions Table (`public.impersonation_sessions`)**:
  - Columns: `id`, `admin_user_id`, `impersonated_user_id`, `organization_id`, `token_hash`, `expires_at`, `revoked_at`, `reason`, `created_at`.
- **Audit Logs Hardening (`public.audit_logs`)**:
  - Add columns: `admin_user_id`, `platform_role`, `target_type`, `target_id`, `before_state` (jsonb), `after_state` (jsonb), `reason` (text), `ip_address`.
- **Entity Lifecycle Soft Delete**:
  - Add `status CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED', 'DELETED'))` to `organizations` and `stores`.
- **Postgres Row-Level Security (RLS)**:
  - Scoping all tenant tables with `WHERE organization_id = private.current_user_organization_id()`.
  - Platform admin bypass restricted strictly to backend service role with logging.

---

### 2. Core Permission & Shared Entitlements Package (Lock Step 2)

#### [MODIFY] [contracts/src/index.ts](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/packages/contracts/src/index.ts)
- Define `PlatformRole` union: `'SUPER_ADMIN' | 'SUPPORT' | 'OPS' | 'BILLING_ADMIN' | 'DEVELOPER' | 'AUDITOR'`.
- Define `PlatformPermission` union (e.g. `'organization.read'`, `'organization.suspend'`, `'subscription.manage'`, `'entitlement.override'`, `'user.impersonate'`, `'system.health'`, `'audit.read'`).
- Define `OrganizationEntitlementMap` and `EntitlementCheckResult`.
- Define `PlanDefinition` and `SubscriptionLifecycleStatus`.
- Define `ImpersonationSession` and `AdminAuditEntry`.

#### [NEW] [packages/entitlements/package.json](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/packages/entitlements/package.json)
#### [NEW] [packages/entitlements/src/index.ts](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/packages/entitlements/src/index.ts)
- Shared package `@aevo/entitlements` providing:
  - `resolveOrganizationEntitlements(database, orgId)`: Resolves plan entitlements + organization custom overrides.
  - `checkFeatureEntitlement(database, orgId, featureKey)`: Evaluates if a feature is enabled.
  - `checkUsageQuota(database, orgId, featureKey, quantity)`: Checks against limit counters.
  - `recordUsage(database, orgId, featureKey, quantity)`: Atomic increment of usage counters.

#### [MODIFY] [packages/auth/src/rbac.ts](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/packages/auth/src/rbac.ts)
#### [MODIFY] [packages/auth/src/casl.ts](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/packages/auth/src/casl.ts)
- Implement `requirePlatformPermission(principal, permission)`.
- Update `AppAbility` in CASL to accept `OrganizationEntitlementMap` so UI gates (`<FeatureGate>`, `<PermissionGate>`) evaluate both RBAC and active commercial entitlements.

---

### 3. Stripe Webhook & Tenant Self-Service Billing (Lock Step 3)

#### [MODIFY] [packages/db/src/stripe-billing.ts](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/packages/db/src/stripe-billing.ts)
#### [MODIFY] [packages/db/src/billing.ts](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/packages/db/src/billing.ts)
- Implement cryptographic Stripe webhook signature verification (`verifyWebhookSignature(payload, signature, secret)`).
- Implement webhook handlers:
  - `checkout.session.completed`: Link Stripe Customer ID to `subscriptions`.
  - `customer.subscription.created`: Record subscription record, compute trial or active period.
  - `customer.subscription.updated`: Update plan, status, and recalculate `organization_entitlements`.
  - `customer.subscription.deleted`: Transition to `CANCELED`, downgrade entitlements.
  - `invoice.paid`: Advance current period dates.
  - `invoice.payment_failed`: Transition to `PAST_DUE`.
- Implement `syncPlanEntitlements(database, organizationId, planId)`.

#### [MODIFY] [apps/gateway/src/app.ts](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/apps/gateway/src/app.ts)
- Add canonical endpoint `POST /api/v1/webhooks/stripe` (processes raw payload, verifies signature, idempotent via `billing_webhook_events`).
- Add client entitlement endpoint `GET /api/v1/me/entitlements`.
- Add 6-stage server-side guard middleware for sensitive endpoints (`authenticate -> tenant -> permission -> entitlement -> quota -> execute`).
- Add Hub Tenant Billing endpoints:
  - `GET /api/v1/hub/billing/current`
  - `POST /api/v1/hub/billing/checkout`
  - `POST /api/v1/hub/billing/portal` (Stripe Customer Portal URL)
- Remove unsafe demo tokens and raw `/api/v1/hub/sql` from gateway routes.

#### [MODIFY] [apps/web/src/public/organize.html](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/apps/web/src/public/organize.html)
- Add self-service **Billing & Plan Management** section in Hub Settings (`Settings -> Billing`):
  - Current Plan badge & status (`ACTIVE`, `TRIALING`, etc.).
  - Active feature entitlements list.
  - Usage meters (Stores, Devices, Members).
  - Upgrade / Downgrade button triggering Stripe Checkout.
  - "Manage Billing & Invoices" button opening Stripe Customer Portal.

---

### 4. Privileged Admin Application & Security Hardening (Lock Step 4)

#### [MODIFY] [apps/gateway/src/app.ts](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/apps/gateway/src/app.ts)
- Replace basic email allowlist check with `requirePlatformPermission(request, permission)`.
- Implement Read vs Dangerous endpoint separation:
  - Read: Overview, Organization details, Subscriptions list, Webhook logs, Audit trails.
  - Dangerous: `PATCH /api/v1/admin/subscriptions/:id`, `POST /api/v1/admin/entitlements/override`, `POST /api/v1/admin/organizations/:id/status`.
- All dangerous mutations MUST require a `reason` parameter and write structured before/after snapshots to `audit_logs`.
- Implement Temporary User Impersonation:
  - `POST /api/v1/admin/impersonate`: Generates ephemeral JWT session with 15–30 min expiration.
  - Logs `USER_IMPERSONATED` audit entry.
  - `POST /api/v1/admin/impersonate/exit`: Immediately revokes impersonation token.

#### [NEW] [aevo-hub/apps/admin/](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/apps/admin/)
- Build the privileged Admin console as an independently deployable application boundary.
- Keep platform role checks in server loaders and the Core API; the browser receives no service-role credentials.
- Show platform role, application registry, organization, subscription, user, and system-health modules.
- Require a reason and hold-to-confirm interaction for application status mutations; write before/after audit records in the Core API.
- Keep the retired `apps/web/src/public/admin.html` out of the runtime entrypoint while the new Admin app becomes the canonical surface.

---

### 5. Downstream Applications Integration (Lock Step 5)

#### [MODIFY] [packages/ui/](file:///Users/jayc/Project/aevo-ecosystem/aevo-hub/packages/ui) & Tenant Apps (`pos`, `kiosk`, `booking`)
- Ensure all app clients obtain entitlements via `GET /api/me/entitlements`.
- Ensure NO frontend code contains `if (subscription.plan === 'pro')`.
- All features rendered conditionally via `<FeatureGate feature="pos">` or `ability.can('access', 'kiosk')`.

---

## Verification Plan

### Automated Tests
Run tests via Bun in `aevo-hub`:

1. **Multi-Tenant Isolation & RLS Test**:
   ```bash
   bun test test/tenant-isolation.test.ts
   ```
   *Verifies queries cannot read or write data belonging to other organizations even with manipulated IDs.*

2. **Decoupled Plan & Entitlement Test**:
   ```bash
   bun test test/entitlements.test.ts
   ```
   *Verifies plan assignment cascades to entitlements, custom overrides take precedence without changing the plan, and usage counters enforce limits.*

3. **Stripe Webhook Signature & Idempotency Test**:
   ```bash
   bun test test/stripe-webhook.test.ts
   ```
   *Verifies forged webhook signatures are rejected (400/401), duplicate event IDs are processed idempotently, and subscription transitions update entitlements accurately.*

4. **Platform RBAC & Admin Guard Test**:
   ```bash
   bun test test/platform-rbac.test.ts
   ```
   *Verifies an organization OWNER cannot access platform admin endpoints (403 Forbidden), platform roles are strictly enforced, and dangerous actions generate structured before/after audit records.*

5. **Typecheck Entire Monorepo**:
   ```bash
   bun run typecheck
   ```

### Manual Verification
1. **Hub Self-Service Billing**:
   - Log in as Organization Owner.
   - Navigate to `Settings -> Billing`.
   - Verify current plan, usage counters, and features display correctly.
   - Click "Manage Invoices" and verify redirection to Stripe Customer Portal session.
2. **Admin Privileged Actions**:
   - Log in with a Platform Role account.
   - Open `http://localhost:4335` (or `admin.aevo.app` in production). Verify the Platform Role badge.
   - Modify an organization's subscription; confirm the dialog requires a "Reason".
   - Inspect `audit_logs` table to confirm `before_state`, `after_state`, and `reason` are saved.
3. **User Impersonation Flow**:
   - Trigger Impersonation from Admin for a test organization user.
   - Confirm redirect to Hub workspace with sticky banner `⚠ IMPERSONATING`.
   - Click "Exit Impersonation" and verify return to Admin Console.
