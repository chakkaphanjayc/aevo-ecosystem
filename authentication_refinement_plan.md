
# Aevo Ecosystem Authentication Refinement

สถานะเอกสาร: authoritative implementation contract
วันที่อัปเดต: 2026-09-27

เอกสารนี้เป็นสัญญากลางของ authentication ทุกแอปใน polyrepo และใช้เป็นเกณฑ์
ก่อน deploy, migrate, เปิด compatibility mode หรือถอด legacy code ออก

## เป้าหมายที่เสร็จต้องได้

- Browser ได้เฉพาะ app-scoped opaque session cookie และ CSRF cookie ที่อ่านได้
  โดยไม่เคยได้ Supabase/Identity bearer token
- Session ทุกแถวต้อง bind กับ `app_code`; session ของ Hub, Admin, Go, Play และ
  POS ใช้ข้ามแอปไม่ได้
- มี idle timeout, absolute timeout, CSRF validation, refresh rotation,
  revocation และ audit trail
- Platform RBAC ของ Admin แยกจาก organization/store RBAC ของแอปธุรกิจ
- Accounts เป็น broker ระหว่างแอปกับ identity provider; Core API เป็น authority
  ของ session/identity projection ฝั่ง Cloud SQL เมื่อแอปนั้น cut over แล้ว
- Schema migration เป็น additive/idempotent และรันซ้ำหรือรันต่อได้ทุก deployment
- Legacy path มี compatibility switch และมี gate ตรวจสอบก่อนลบออก จึงสามารถ
  migrate ต่อเนื่องและลบ legacy ได้โดยไม่ต้องแก้โค้ดแบบเสี่ยงหรือทำ data reset

## Runtime ownership

| Boundary | หน้าที่ | Session authority |
| --- | --- | --- |
| `aevo-hub` | identity entrypoint, Hub UI, transitional Supabase provider adapter, SSO authorization code | Core API app-scoped session in target mode; Supabase session path is compatibility-only |
| `aevo-admin` | privileged platform control plane | Core API `ADMIN` session |
| `aevo-accounts` | private broker, redirect allow-list, PKCE/state, provider bridge | ไม่ตัดสิน permission; ขอให้ Core API issue/revoke session |
| `aevo-core-api` | Cloud SQL identity projection, app sessions, platform authorization, audit and migration API | Cloud SQL `aevo_app_sessions` and Core migration runner |
| `aevo-go` | customer client | Gateway-issued `GO` cookie; ไม่เก็บ provider token |
| `aevo-play` | Play workspace/API | app-scoped `PLAY` session จนกว่าจะ cut over เข้า Core API |
| `aevo-pos` | POS/API | app-scoped `POS` session จนกว่าจะ cut over เข้า Core API |
| `aevo-digital-sing` | legacy Firebase client | transitional only; decommission หลัง identity export/mapping gate |

## Invariants

1. Session cookie name is unique per app (`aevo_hub_session`,
   `aevo_admin_session`, `aevo_go_session`, `aevo_play_session`,
   `aevo_pos_session`, etc.) and is `HttpOnly`, `SameSite=Lax` or an explicitly
   approved HTTPS policy, with `Secure` outside local development.
2. A generic session lookup fails closed when more than one app cookie is sent;
   it never chooses a cookie arbitrarily.
3. State-changing requests require origin validation and the CSRF token that
   matches the hash stored with the current session. Legacy local CSRF bypass is
   disabled outside an explicitly bounded local window.
4. Refresh rotates the opaque session and revokes the predecessor. The absolute
   expiry is inherited; refresh never extends the hard upper bound.
5. Logout revokes the server-side session, clears both session and CSRF cookies,
   and treats remote provider logout as best-effort after the local session is
   revoked.
6. Authorization-code exchange is private server-to-server. The code is
   one-time, short-lived, app-bound, state-bound and PKCE-bound where supplied.
7. Application access is checked by the trusted server against app assignment
   and tenant/store scope. A client-selected organization/store is never an
   authority.
8. Provider access/refresh tokens are encrypted at rest in server-only storage
   and are never serialized to browser JavaScript or logs.

## Implemented changes

### Hub / shared Supabase boundary

- `AuthSessionManager` now scopes list, single revoke, revoke-all and session
  lookup operations by `app_code`, preventing one application from revoking or
  enumerating another application's sessions.
- Hub continues to use the narrow additive fallback only while the app-code
  migration is being rolled out. It is not a steady-state reader.
- The canonical Supabase migrations create opaque `app_sessions`, application
  registry/assignments, and one-time authorization codes with RLS and service
  role only access.

### Play / POS

- Both application session managers persist opaque tokens and bind every query
  to the owning application code.
- Refresh now uses rotation with the current session's absolute expiry instead
  of creating a fresh absolute lifetime on every refresh.
- Legacy bearer-cookie reads are controlled by `AEVO_ALLOW_LEGACY_AUTH`; loaded
  configuration defaults this switch to `false`. Direct test fixtures may omit
  the optional field for isolated compatibility tests.

### Aevo Go

- The customer client keeps its `GO` cookie boundary and uses Accounts PKCE
  when `VITE_ACCOUNTS_URL` is configured.
- `VITE_AUTH_COMPAT_MODE=hub` is an explicit migration-only fallback for an
  unconnected Accounts broker. Production requires `disabled`; the removal
  gate scans this fallback before it can be deleted.

### Accounts

- `/v1/auth/exchange` and `/v1/auth/password` remain private service routes.
- `/v1/auth/logout` now requires service authentication and delegates scoped
  revocation to Core API; it no longer acts as an unauthenticated cookie-clearing
  endpoint.
- Accounts never grants organization/store permission and never exposes browser
  tokens directly.

### Core API

- Generic session reads fail closed if multiple app cookies are present.
- Admin logout validates CSRF when an active session is present and clears both
  Admin cookies.
- Login validates that Accounts returned an `ADMIN` session before setting Admin
  cookies.
- `/internal/auth/sessions/revoke` provides the private, app-scoped revoke
  contract used by Accounts.
- Cloud SQL migration `0006_auth_session_contract.sql` revokes rows that lack a
  persisted CSRF hash, makes the hash mandatory, adds the app registry foreign
  key and adds a session activity index.

### Remember-me and ingress hardening

- Remember-me is an explicit opt-in carried through Accounts, Hub login and
  server-side SSO handoff. A remembered session uses Core's bounded persistent
  cookie policy; the default login remains a browser-session cookie.
- Refresh rotation preserves the original absolute expiry and remember policy;
  it never turns a transient session into a persistent one or extends the hard
  upper bound.
- The Edge-to-Core HMAC covers the trusted application code. Core rejects a
  missing app context and ignores an application code supplied only in a
  browser JSON body, preventing cross-app session issuance through a proxy.
- Edge, Accounts and Core emit no-store and browser security headers on their
  auth/API responses. Browser mutations validate `Origin` against
  `AEVO_ALLOWED_ORIGINS`; staging/production fail closed when this allow-list
  is not configured, and local Hub launchers pass the same allow-list to Core.
- OAuth and passkey UI is fail-closed until their versioned start/callback
  contracts are deployed. Password login, recovery and session security remain
  available without exposing dead provider routes.

## Migration protocol: always runnable

All schema changes follow **expand -> backfill -> verify -> contract**. A
deployment may stop after any phase and resume later.

### Core API / Infrastructure owner

```bash
cd /Users/jayc/Project/aevo-ecosystem/aevo-core-api
dotnet run --project src/Aevo.CoreApi.Migrator/Aevo.CoreApi.Migrator.csproj -- --dry-run
dotnet run --project src/Aevo.CoreApi.Migrator/Aevo.CoreApi.Migrator.csproj
dotnet run --project src/Aevo.CoreApi.Migrator/Aevo.CoreApi.Migrator.csproj -- --verify
```

The Core migrator uses a PostgreSQL advisory lock, records SHA-256 checksums in
`_aevo_core_migrations`, rejects drift, and applies only missing files. It is
safe to run again after an interrupted deployment. API replicas never apply
migrations at startup. Do not edit an already-applied migration; add a new
migration.

### Hub compatibility owner (read-only by default)

Hub's migration script remains only for transition inspection. `db:migrate`,
`db:migrate:dry-run`, and `db:migrate:verify` do not apply writes in the normal
path. The explicit `db:migrate:legacy-compat` command is restricted to a
non-production rollback window and must not be used for the Core database.
`aevo-play` and `aevo-pos` must not independently push a different copy of the
Core auth schema.

### Core API / Cloud SQL owner

```text
0001_core_authority.sql
0002_admin_control_plane.sql
0003_runtime_identity_support.sql
0004_application_registry_reconciliation.sql
0005_session_lifecycle.sql
0006_auth_session_contract.sql
```

Run these in order with the Cloud SQL migration runner used by the deployment
pipeline. `0005` backfills idle/absolute expiry from the existing expiry and
does not extend existing sessions. `0006` revokes only rows that cannot satisfy
the CSRF contract; it does not delete audit/session history.

Before enabling a protected route:

1. Apply the ordered migration set.
2. Verify application registry, session columns, indexes, constraints and
   RLS/privileges.
3. Verify the service secret path from Accounts to Core API.
4. Deploy the route with legacy mode disabled in production.
5. Exercise login, me, refresh, CSRF rejection, logout, replay rejection and
   cross-app cookie rejection.

## Legacy removal contract

Legacy code is removable whenever all gates below are true for the target app;
there is no requirement to keep a legacy path indefinitely.

- `bun run auth:legacy-removal-check` reports no legacy
  reader for the target app.
- No active session row depends on the old cookie/token shape, or the old rows
  are expired/revoked and their counts are recorded.
- Login, OAuth/PKCE handoff, refresh rotation, logout, password recovery and
  session revocation pass against the new path in staging.
- Cross-app cookie confusion, missing CSRF, authorization-code replay and
  invalid redirect tests pass.
- Access decisions are served by the new app-scoped assignment/RBAC path and
  audit events are visible in the owning control plane.
- Deployment has been observed through at least one complete idle timeout and
  one refresh/absolute-expiry cycle.
- Rollback is a forward-compatible code deploy or a feature-flag change; it
  does not require restoring dropped columns or re-issuing browser tokens.

After the gates pass, remove the compatibility reader, remove the flag from
deployment configuration, remove only its tests/docs, and add a new contract
migration only if old columns/tables are no longer needed by any app. Never
drop a shared table merely because one app has cut over.

## Acceptance matrix

| Test | Expected result |
| --- | --- |
| No provider/Core config | health works; protected auth returns explicit 503; no fake identity |
| Password login | only opaque app cookie + CSRF cookie are set |
| Remember-me omitted/false | browser-session cookie; no persistent cookie attributes |
| Remember-me true | bounded persistent cookie; Core absolute and idle limits still apply |
| Refresh replay | predecessor is revoked; replay returns 401 |
| Refresh near absolute expiry | replacement expires no later than original absolute expiry |
| Wrong app cookie | 401; no fallback to another app's cookie |
| Multiple generic cookies | generic lookup fails closed |
| Missing/wrong CSRF | 403 on mutation, including logout with an active session |
| Logout | server row revoked and both cookies cleared |
| Auth-code replay | second exchange fails |
| Invalid redirect/state/PKCE | request fails closed |
| App assignment missing | authentication may succeed, app access returns 403 |
| Migration rerun | no duplicate schema/data and no checksum drift |

## Operational notes

- The current checked-in `.env` for Hub points at a remote Supabase pooler even
  though `NODE_ENV=development`. Treat it as a real shared environment: run
  dry-run and verification first, and apply only when the intended database is
  explicitly confirmed by the operator.
- Secrets remain outside source control and are not placed in Wrangler `vars`,
  browser bundles or migration files.
- Supabase's current platform guidance also requires explicit grants for new
  public-schema tables on newer projects; keep server-only auth tables revoked
  from `public`, `anon` and `authenticated`, with service-role access only.

## Verification snapshot — 2026-09-22

- The configured shared Supabase environment had 71 existing migration records
  and an old filename-only `_hub_migrations` table. The checksum baseline was
  adopted with `bun run db:migrate:adopt-checksums`; this changed migration
  metadata only and ran no schema migration.
- `bun --env-file=.env run db:migrate:verify` then passed with no drift.
- The repository contains 105 migration files at this snapshot. The remaining
  product backlog was intentionally not pushed to that shared database; apply
  it only after the deployment target is explicitly confirmed.
