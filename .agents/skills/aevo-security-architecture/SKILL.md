---
name: aevo-security-architecture
description: Enforce app-scoped sessions and assignments, platform vs organization RBAC separation, decoupled plan and entitlement engine, Stripe webhook source of truth, privileged admin isolation, and multi-tenant RLS defense-in-depth across the Aevo Ecosystem.
metadata:
  short-description: Aevo Ecosystem Security, Entitlement & Admin Architecture
---

# Aevo Security & Entitlement Architecture

This skill defines the mandatory architectural standards, security rules, and implementation patterns for the **Aevo Ecosystem**. All services, apps (`hub`, `admin`, `pos`, `kiosk`, `booking`), and shared packages MUST strictly conform to these principles.

---

## 1. High-Level Architecture & Privileged Admin Separation

```text
                         Internet
                            │
                    ┌───────┴────────┐
                    │                │
              aevo.app           admin.aevo.app
                    │                │
                    ▼                ▼
               Aevo Hub          Aevo Admin
              (Tenant Hub)   (Privileged Platform App)
                    │                │
                    └───────┬────────┘
                            │
                       Aevo Core API
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
       Identity         Entitlement        Audit
          │                 │                 │
       Supabase           Billing          Logs
          │                 │                 │
          │              Stripe             │
          └─────────────────┼─────────────────┘
                            │
                       PostgreSQL
                         + RLS
                            │
       ┌────────────────────┼───────────────────┐
       │                    │                   │
      POS                 Kiosk              Booking
```

### Critical Rules
1. **Admin is a Privileged Application, NOT a Hidden Route:**
   - Production separation: `admin.aevo.app` (Admin Console) is separated from `app.aevo.app` / `aevo.app` (Tenant Hub).
   - In single-domain deployments, `/admin` is treated as a separate privileged application boundary with distinct authentication checks, never just a client-side route with a redirect.
2. **No Client-Only Route Guards:**
   - Client redirects (`if (!isAdmin) router.push('/')`) are strictly cosmetic UX.
   - Every admin action MUST be guarded on the server:
     ```typescript
     await requirePlatformPermission(user, "organization.subscription.update");
     ```

### Application Boundary & App-Scoped Session Rules

The Aevo Ecosystem has more than one first-party application. Authentication,
application assignment, and organization authorization are separate concerns:

```text
Identity / Accounts
  -> application session (app_code)
  -> active organization membership
  -> member_app_assignments
  -> member_app_scopes / member_app_roles
  -> organization permissions
  -> entitlements and quota
```

The runtime application registry is not the commercial app catalog. The
server-only `application_registry` identifies the boundary that owns a session
(`HUB`, `ADMIN`, `PLAY`, `POS`, `KIOSK`, `QUEUE`, or `GO`). Commercial product
catalog and subscription tables remain the source of billing and entitlement
state.

Mandatory rules:

1. Every application session MUST carry its `app_code`. Existing Hub sessions
   may be read during the additive migration window, but a non-Hub runtime MUST
   fail closed when the app-scoped session schema is unavailable.
2. `member_app_assignments` grants application entry. It MUST NOT silently
   grant access to another application. Store/resource scopes and app-specific
   roles can narrow the assignment; organization membership and RBAC remain
   authoritative.
3. Every application entry decision MUST be resolved server-side and expose a
   typed reason such as `MEMBERSHIP_REQUIRED`, `APP_ASSIGNMENT_REQUIRED`,
   `SCOPE_REQUIRED`, or `PERMISSION_REQUIRED`. A URL, local storage value, or
   client-side route guard is only a hint/presentation aid.
4. `ADMIN` is resolved from platform RBAC independently of organization
   membership and `member_app_assignments`. An organization `OWNER` does not
   gain platform privileges by having Hub access.
5. The browser receives an opaque HttpOnly session cookie only. Supabase
   access/refresh tokens stay in the server-side session store and the service
   role remains backend-only.
6. The application registry, assignments, scopes, and app roles MUST have RLS
   enabled and browser roles MUST have no table grants. The trusted gateway is
   the only normal reader/writer.

For a strangler migration, a new server-rendered route may coexist with the
legacy surface behind a reversible adapter. The Hub pilot uses a React Router
Framework Mode `/modern` route whose loader calls the typed gateway access
contract; `/workspace`, `/organize`, and other legacy routes remain available
until each route has parity and a rollback path. This adapter MUST NOT bypass
the existing server authorization pipeline or introduce a second session
format.

The current Hub migration intentionally preserves the legacy login flow while
the Accounts one-time handoff exchange is introduced. Do not claim full SSO
handoff support until the target application exchanges a short-lived,
single-use code (with return-path validation and, where applicable, PKCE) and
creates its own app-scoped session.

### React Router Framework Mode Route Pattern

For a server-rendered strangler route, keep the trusted boundary explicit:

1. A `loader` calls the server-only session/access helper, rejects or renders
   the typed denied decision, and checks the required organization permission
   before querying optional data. All data reads go through the canonical API
   client; route loaders do not read Supabase directly.
2. An `action` repeats authentication and permission checks for every intent.
   It parses and allow-lists form values, derives the CSRF header from the
   incoming CSRF cookie on the server, then calls the canonical gateway. A
   hidden form field or client-rendered button is never an authorization
   decision.
3. Successful mutations redirect after the gateway response; failures return
   a safe action error without exposing session material or database details.
   The loader remains the source of truth after the redirect.
4. Keep API clients, cookie readers, session helpers, and CSRF code in
   `*.server.ts` modules. Put only serializable loader types and pure
   permission predicates in shared modules so React Router does not include
   server-only code in the browser bundle.

The browser may use returned permissions for navigation and disabled states,
but the gateway must repeat membership, role, assignment, scope, entitlement,
and CSRF checks on every sensitive mutation.

For Hub member management, organization settings may manage only workforce
assignments (`PLAY`, `POS`, `KIOSK`, `QUEUE`). The compatibility `HUB`
assignment is provisioned by the membership lifecycle, while `ADMIN` is a
platform-RBAC boundary and must not be granted from an organization form.
Assignment updates must verify that the target membership belongs to the
current organization, reject foreign/inactive store scopes, persist explicit
`ACTIVE`/`SUSPENDED`/`REVOKED` state, and emit an audit record. Assignment
listing should project scopes and app roles without exposing server-only table
access to the browser.

---

## 2. Multi-Tenant Isolation & Defense-in-Depth

### Tenant Scoping
- Every query targeting tenant data MUST explicitly scope to the tenant:
  ```sql
  WHERE organization_id = $current_organization_id
    AND (store_id = $current_store_id OR store_id IS NULL)
  ```
- **PostgreSQL Row-Level Security (RLS)** is enabled on all tenant tables as defense-in-depth. If an attacker tampers with `organization_id` in a payload, PostgreSQL RLS rejects the read or write.

### Service Role Key Isolation
- `SUPABASE_SERVICE_ROLE_KEY` is **strictly backend-only**.
- NEVER expose the service role key to frontend bundles (React, Next.js client, Astro client, Vue, mobile apps, or local storage).
- Privileged operations must go through the authenticated API Gateway, which executes controlled backend queries.

---

## 3. Subscription & Decoupled Entitlement Engine

### Golden Rule: Frontend Never Dictates Entitlements
- **NEVER** check plans directly in client or server feature gates:
  ```typescript
  // ❌ STRICTLY FORBIDDEN
  if (subscription.plan === "pro") { enableFeature(); }
  if (plan === "BUSINESS") { allowKiosk(); }
  ```
- Instead, decouple **Plan** from **Entitlements**:
  ```text
  Plan
   ↓
  Plan Entitlements (Default feature set & limits per plan)
   ↓
  Organization Entitlements (Active resolved features + custom overrides)
   ↓
  Feature Access
  ```

### Database Schema Structure
```text
plans
├── id (uuid / text, e.g., 'starter', 'business', 'enterprise')
├── name
├── description
├── billing_interval ('MONTHLY', 'ANNUAL')
├── price_minor
└── status ('ACTIVE', 'ARCHIVED')

plan_entitlements
├── plan_id (references plans)
├── feature_key (e.g., 'pos', 'kiosk', 'booking', 'advanced_analytics', 'odoo_sync')
├── is_enabled (boolean)
└── limit_value (integer, nullable for unlimited)

subscriptions
├── id (uuid)
├── organization_id (uuid references organizations)
├── plan_id (references plans)
├── provider ('stripe', 'manual', 'enterprise')
├── provider_customer_id (text)
├── provider_subscription_id (text)
├── status ('TRIALING', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'CANCELED', 'EXPIRED')
├── trial_start (timestamptz)
├── trial_end (timestamptz)
├── current_period_start (timestamptz)
├── current_period_end (timestamptz)
├── cancel_at_period_end (boolean)
├── canceled_at (timestamptz)
├── created_at (timestamptz)
└── updated_at (timestamptz)

organization_entitlements
├── id (uuid)
├── organization_id (uuid references organizations)
├── feature_key (text)
├── is_enabled (boolean)
├── custom_override (boolean default false)
├── limit_value (integer, nullable)
└── updated_at (timestamptz)

usage_counters
├── id (uuid)
├── organization_id (uuid references organizations)
├── feature_key (text)
├── current_count (integer default 0)
├── period_start (timestamptz)
├── period_end (timestamptz)
└── updated_at (timestamptz)
```

### Client Entitlement Discovery
The frontend asks the backend for active entitlements:
```http
GET /api/me/entitlements
```
Returns:
```json
{
  "features": {
    "pos": true,
    "kiosk": true,
    "booking": false,
    "advanced_analytics": true,
    "api_access": false
  },
  "limits": {
    "max_stores": 5,
    "max_devices": 10,
    "max_members": 25
  },
  "usage": {
    "stores_count": 2,
    "devices_count": 4,
    "members_count": 8
  }
}
```

### 6-Step Server-Side Execution Pipeline
Every sensitive domain action MUST pass through this exact pipeline:
```text
Client Request (e.g. POST /api/analytics/export)
   │
   ▼ 1. Authenticate (Verify JWT / Session)
   │
   ▼ 2. Organization Membership (Verify user belongs to target organization)
   │
   ▼ 3. Permission Check (Verify Org Role has permission, e.g. "reports.export")
   │
   ▼ 4. Entitlement Check (Verify Org has feature entitlement: "advanced_analytics")
   │
   ▼ 5. Usage Quota Check (Verify usage limit is not exceeded)
   │
   ▼ 6. Execute Business Action
```

---

## 4. Stripe Webhook as Billing Source of Truth

The client **NEVER** reports successful payments or changes subscription states directly.
```text
Stripe
   │
   │ webhook (HTTPS POST)
   ▼
POST /webhooks/stripe
   │
   ├── 1. Verify Stripe Cryptographic Signature (stripe-signature header)
   ├── 2. Check Idempotency (billing_webhook_events table)
   ├── 3. Identify Customer & Organization
   ├── 4. Update Aevo Subscription Database Record
   └── 5. Recalculate Organization Entitlements
```

### Mandatory Event Handlers
- `checkout.session.completed`: Link customer ID, initialize subscription in `subscriptions` table.
- `customer.subscription.created`: Record initial subscription period and state.
- `customer.subscription.updated`: Update plan, status, period timestamps, cancel flags.
- `customer.subscription.deleted`: Transition subscription to `CANCELED` or `EXPIRED`, adjust entitlements.
- `invoice.paid`: Refresh `current_period_start` and `current_period_end`, mark `ACTIVE`.
- `invoice.payment_failed`: Mark `PAST_DUE`, initiate grace period counter.

---

## 5. Platform Roles vs Organization Roles

Never conflate platform management with tenant organization administration.

### Platform Roles (Aevo Global)
Stored in `platform_users` / `platform_roles`:
- `SUPER_ADMIN`: Full system access, platform configuration, emergency actions.
- `SUPPORT`: Read-only access to customer data, assist users, create temporary impersonation.
- `OPS`: Monitor health, restart jobs, inspect queues, manage deployments.
- `BILLING_ADMIN`: Manage plans, view global subscriptions, issue manual credits/refunds.
- `DEVELOPER`: View logs, inspect errors, debug system integrations.
- `AUDITOR`: Read-only access to immutable audit logs and compliance records.

### Organization Roles (Tenant-Scoped)
Stored in `public.memberships`:
- `OWNER`: Full control over the organization, billing settings, and stores.
- `ADMIN`: Manage stores, members, catalog, and operations.
- `MANAGER`: Store-level management, price overrides, cash session approvals.
- `STAFF`: Day-to-day operations, cashier, order entry.
- `VIEWER`: Read-only access to reports and catalog.

> **CRITICAL INVARIANT:** An organization `OWNER` has **ZERO** platform privileges. They cannot access `/admin` or invoke platform endpoints.

---

## 6. Privileged Admin Security & Guardrails

### Read Actions vs Dangerous Actions
Categorize all admin endpoints explicitly:
- **Read Actions:**
  - View organization details, subscriptions, store list, order aggregates, webhook history, system health.
- **Dangerous Actions (Require strict confirmation, elevated role & audit log):**
  - Change subscription or plan manually.
  - Override organization entitlements.
  - Suspend or archive organization.
  - Impersonate a user.
  - Issue refunds or manual credits.
  - Replay webhooks.
  - Modify system feature flags.

### Mandatory Structured Audit Logging
Every dangerous action MUST write to `audit_logs`:
```typescript
interface AdminAuditRecord {
  adminUserId: string;
  adminEmail: string;
  platformRole: PlatformRole;
  action: string;             // e.g. "organization.subscription.override"
  targetType: string;         // e.g. "organization"
  targetId: string;           // e.g. "b7c16dab-..."
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  reason: string;             // Required non-empty justification
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
```

### Temporary User Impersonation ("Login As")
- NEVER share or copy passwords/tokens.
- Admin requests a temporary impersonation session:
  - Generates an ephemeral session token with **strict 15–30 minute expiration**.
  - System generates an immutable audit record: `admin X impersonated user Y (Org Z) with reason R`.
  - Frontend displays an unmistakable top sticky banner:
    ```text
    ⚠ IMPERSONATING: user@example.com | Organization: ABC [Exit Impersonation]
    ```
  - Ending the session terminates the ephemeral token immediately.

### Soft Deletion Lifecycle
Do not perform instant hard deletions (`DELETE FROM ...`) on primary entities:
```text
ACTIVE ──> SUSPENDED ──> ARCHIVED ──> DELETED
```
- Admin can suspend or archive organizations/stores.
- Permanent deletion requires multi-step approval or background retention purge.

### No Raw SQL Execution
- Raw SQL runners in web portals (e.g. `/api/v1/hub/sql`) are strictly forbidden in production.
- Database queries must be executed through controlled repositories or secure migrations.

---

## 7. Monorepo Package Architecture

```text
aevo/
├── apps/
│   ├── hub/                 # Tenant portal (Settings, Billing, Team, App Launcher)
│   ├── admin/               # Platform administration console (Privileged App)
│   ├── pos/                 # Point of Sale application
│   ├── kiosk/               # Self-service kiosk & QR ordering
│   └── booking/             # Venues, courts, and slot booking
│
├── packages/
│   ├── auth/                # Session parsing, Supabase SSR, JWT, Auth helpers
│   ├── database/            # Supabase client, repositories, queries, transactions
│   ├── permissions/         # Platform RBAC & Organization RBAC policies
│   ├── entitlements/        # Shared core: Plan registry, feature checks, quotas
│   ├── billing/             # BillingProvider, Stripe adapter, Webhook verification
│   ├── audit/               # Structured immutable audit logging
│   ├── api/                 # Gateway schemas, Zod contracts, middleware
│   └── ui/                  # Design system, PermissionGate, FeatureGate, ImpersonationBanner
│
└── services/
    ├── webhook/             # Stripe & third-party webhook ingest
    ├── notification/        # LINE & Web Push notifications
    └── background-jobs/     # Cloudflare Queues / Outbox sync workers
```

> **CORE DEPENDENCY:** Core API owns the entitlement engine and authorization decisions. Applications (`pos`, `kiosk`, `booking`, `hub`, `admin`) consume versioned `@aevocado/contracts` and Core API/Edge decisions; no Hub-local entitlement or database package is a source of truth.

---

## 8. Implementation Checklist: The 4-Step Lock Order

When implementing or modifying features, ALWAYS execute in this exact sequence:

1. **Step 1: Database Schema & RLS**
   - Tables: `plans`, `plan_entitlements`, `subscriptions`, `organization_entitlements`, `usage_counters`, `platform_users`, `platform_roles`.
   - RLS policies on all tables scoping to `organization_id` or platform admin.
   - Status checks and check constraints.

2. **Step 2: Permission & Entitlement Model (Shared Core)**
   - Create `@aevo/entitlements` shared package.
   - Implement `GET /api/me/entitlements`.
   - Implement server-side middleware: `requireEntitlement(feature)` and `checkUsageQuota(feature)`.
   - Update CASL Ability to consume resolved entitlements.

3. **Step 3: Stripe Webhook & Billing Flow**
   - Implement `POST /webhooks/stripe` with cryptographic signature verification.
   - Idempotent event processor using `billing_webhook_events`.
   - Automated recalculation of `subscriptions` and `organization_entitlements`.
   - Tenant self-service billing in Hub (`Settings -> Billing`) via Stripe Customer Portal.

4. **Step 4: Privileged Admin App & Security**
   - Platform RBAC guards (`requirePlatformPermission`).
   - Read vs Dangerous actions with mandatory reason & before/after audit log.
   - Temporary impersonation sessions (15-30m TTL + UI banner).
   - Soft-deletion state machine (`ACTIVE -> SUSPENDED -> ARCHIVED -> DELETED`).

5. **Step 5: Downstream App Integration**
   - Wire POS, Kiosk, Booking to `@aevo/entitlements`.
   - Gate features cleanly using `<FeatureGate>` and server-side verification.
