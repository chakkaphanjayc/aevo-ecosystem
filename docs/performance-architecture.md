# Aevo cross-application performance architecture

Status: implemented locally and verified against the running stack on 2026-09-29. The measurements in this document are local HTTP measurements, not production SLO evidence.

## Executive result

The slow navigation was not caused by React rendering alone. The dominant path was:

`app shell -> app auth/me -> Core session lookup -> session touch -> app authorization -> entitlement/read API`

The original flow also repeated the auth boundary during a single navigation. Admin called `auth.me()` and then `auth.access()` even though both decisions were available from Core. Play called `/auth/me` and `/access` separately, and the Play API resolved the same Core session for both calls. Session touching used a locking read followed by an update on every authenticated request.

The local implementation now:

- measures request, auth, authorization, database, external API, serialization, cache lookup time, logical database-operation count, and cache status without logging tokens or tenant data;
- avoids a second Admin access request when Core returns the platform decision with `/api/auth/me`;
- reuses Play's Core access decision when it is present;
- keeps request-local loader/auth promises in Admin and Play and does not create a cross-user browser/server auth cache;
- touches a session only when `last_seen_at` is older than the configured interval;
- uses short-lived, bounded `SessionSnapshot` and `AccessSnapshot` L1 entries with single-flight loading and broad invalidation after security/assignment/membership/role/identity/entitlement writes;
- uses a bounded, single-flight L1 cache only for application registry and launch-target metadata;
- provides a namespaced `ClientDataCache` for non-authoritative browser read models, with memory + IndexedDB, TTL/version/ETag revalidation, and logout cleanup;
- exposes a private `/api/v1/sync/manifest` through Core, Hub, Admin, and Play with ETag/`If-None-Match`; the manifest includes scoped assignment, membership, store-binding, entitlement, platform-role, identity, and application markers, while Admin advertises the existing signed keyset audit cursor;
- keeps cross-app SSO handoff SSR/client UI loading-only until success, with an error-only surface for a failed handoff and the ordinary login form only when no session exists;
- adds signed, filter-bound keyset pagination for Admin audit logs and applies SQL-level limits to Admin user directory reads;
- parallelizes the independent entitlement read with application-assignment resolution when the organization scope is already known;
- keeps the Core API as the source of truth for app assignment, tenant scope, entitlement, and platform permission.

No Redis or other L2 distributed cache was added. Core targets .NET 10, but the local deployment is single-instance and has no distributed invalidation channel; adding `HybridCache` now would make stale authorization harder to reason about without improving the measured bottleneck. Revisit an L2 only with multiple replicas, versioned authorization rows, and an explicit invalidation transport.

## Current request topology

### Browser and shell

The affected shells are React Router applications, not Next.js App Router applications:

- Aevo Admin web: `aevo-admin/apps/admin`, API through the Admin edge on port 4001;
- Aevo Hub web: `aevo-hub/apps/hub`, API through the Hub edge on port 4000;
- Aevo Play modern shell: `aevo-play/apps/modern`, API on port 3002;
- Aevo Core API: `aevo-core-api`, local port 5099;
- Aevo Accounts: local Accounts boundary on port 8787.

The app session is opaque and app-scoped. Core resolves the token, validates its application binding and tenant hints, then evaluates assignment/membership/role/entitlement. A Hub owner or an enabled store feature is not by itself a Play assignment; `APP_ASSIGNMENT_REQUIRED` remains a valid authorization result.

### Auth request paths

Admin and Hub call `/api/auth/me` through their edge. Play calls `/api/v1/auth/me` on its API, which brokers session resolution to Core. Core's internal resolver returns the user, principal, and access decision together. Play therefore does not need to immediately call `/api/v1/access` when that decision is present.

### Data ownership

Core owns session, assignment, entitlement, platform authorization, application registry, audit, and tenant-boundary decisions. Hub and Play only orchestrate their own loaders/API calls. No client-side permission result is trusted for server authorization.

## Root-cause evidence

### Before implementation

Measured with one valid seeded account and repeated local HTTP requests before the performance changes:

| Request | Status | P50 | P95 | Evidence |
| --- | ---: | ---: | ---: | --- |
| Admin `/api/auth/me` | 200 | 524 ms | 530 ms | Core session resolve plus unconditional touch |
| Admin `/api/v1/access?application=ADMIN` | 200 | 524 ms | 527 ms | Duplicate decision after `me` |
| Hub `/api/auth/me` | 200 | 934 ms | 943 ms | Session and Hub principal path |
| Hub `/api/v1/access?application=HUB` | 200 | 932 ms | 940 ms | Separate access request |
| Play `/api/v1/auth/me` | 403 | about 935 ms | about 940 ms | Real `APP_ASSIGNMENT_REQUIRED`, not a PKCE failure |
| Play `/api/v1/access?application=PLAY` | 403 | about 935 ms | about 940 ms | Same missing Play assignment |

Core logs showed the original internal resolver repeatedly spent roughly 850–950 ms locally on the remote database-backed session/authorization path. The precise value varies with the current database connection and row state; the numbers above are the captured samples, not synthetic targets.

### After implementation

Measured after the local restart with one login per app and eight sequential requests per endpoint:

| Request | Status | Samples (ms) | P50 | P95 |
| --- | ---: | --- | ---: | ---: |
| Admin `/api/auth/me` | 200 | 122.1, 169.6, 122.6, 121.1, 116.6, 167.4, 117.2, 117.9 | 121.1 | 169.6 |
| Admin `/api/v1/access?application=ADMIN` | 200 | 120.1, 162.0, 110.8, 118.0, 115.3, 180.8, 115.4, 119.7 | 118.0 | 180.8 |
| Hub `/api/auth/me` | 200 | 509.5, 527.8, 521.6, 530.9, 515.8, 528.0, 524.7, 531.0 | 524.7 | 531.0 |
| Hub `/api/v1/access?application=HUB` | 200 | 518.5, 525.5, 526.6, 514.3, 525.8, 533.8, 517.8, 517.8 | 518.5 | 533.8 |
| Play `/api/v1/auth/me` | 403 | 539.7, 509.8, 526.1, 525.7, 522.8, 522.4, 533.0, 516.0 | 522.8 | 539.7 |
| Play `/api/v1/access?application=PLAY` | 403 | 529.2, 521.6, 526.0, 525.3, 527.9, 522.9, 515.5, 532.1 | 525.3 | 532.1 |

Admin auth/access improved by about 4–5x because the unconditional touch and duplicate access request were removed from the hot path. Hub and denied Play remain dominated by remote database authorization work; their SLO target is not met locally and should not be reported as met.

The old table above is a historical post-change sample taken before the final
session-cache benchmark. The current benchmark uses the real Hub Edge path
(`:4000`), one fresh session for the cold sample, and the same session for
warm samples:

| Phase / request | Status | P50 | P95 | Cache | DB wall / aggregate | Queries |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| cold Hub `/api/auth/me` | 200 | 522.7 ms | 522.7 ms | MISS (1) | 514.1 / 631.8 ms | 3 |
| cold Hub `/api/v1/access?application=HUB` | 200 | 366.4 ms | 366.4 ms | MISS (1) | 357.8 / 476.1 ms | 2 |
| warm Hub `/api/auth/me` | 200 | 2.0 ms | 9.1 ms | HIT (8) | 0 / 0 ms | 0 |
| warm Hub `/api/v1/access?application=HUB` | 200 | 2.1 ms | 8.8 ms | HIT (8) | 0 / 0 ms | 0 |

This meets the warm-session target for the Core auth read path, but not the
full document/navigation target: cold requests are still dominated by the
remote database. `scripts/benchmark-auth-cache.ts` is the repeatable command
behind this table. The current seeded owner also completes the real Play
handoff and API authorization path; store enablement and identity assignment
remain separate server-side gates.

## Instrumentation

### Core

Files:

- `aevo-core-api/src/Aevo.CoreApi/Runtime/RequestPerformance.cs`
- `aevo-core-api/src/Aevo.CoreApi/Program.cs`

Every request receives a request ID and a bounded performance snapshot. Logs contain only method, path, status, timings, logical database-operation count, and `HIT/MISS/BYPASS/STALE` cache status. Session tokens, cookies, emails, organization IDs, store IDs, claims, SQL parameters, and secrets are not included.

Thresholds are configurable:

- `AEVO_PERF_WARN_MS`, default `250`;
- `AEVO_PERF_CRITICAL_MS`, default `500`;
- `AEVO_PERF_LOG_ALL=true` for local diagnostics.

`db_query_count` is the count of instrumented logical database operations. It is deliberately not presented as a raw PostgreSQL command count because some data-store operations contain a transaction with more than one SQL command. The `cache_lookup_ms` value covers bounded in-process/request-local cache lookups and is kept separate from `db_ms`. Authentication/authorization scopes can contain database work, so their timings are diagnostic phase timings and may overlap with `db_ms`; `serialization_ms` is a conservative residual rather than an additive independent phase.

The login path now records the Accounts call as `external_api_ms`; the internal session-issue path records its database transaction as `db_ms`. This makes the 2–3 second login waterfall visible instead of misattributing it to React.

## Cache matrix

| Layer | Data | TTL | Invalidation | Safety |
| --- | --- | ---: | --- | --- |
| L0 request-local | Resolved session and loader/auth promise | request lifetime | automatic | token is never shared across requests |
| L1 bounded memory | application registry | 30 s | Admin status mutation; explicit stale removal | public registry metadata only |
| L1 bounded memory | application launch target by app/environment | 30 s | connection probe or application status mutation | no tenant, user, entitlement, or token data |
| L1 bounded memory | session snapshot | 3 s by default | refresh/revoke/touch/security writes | SHA-256 token key; expiry and app binding rechecked |
| L1 bounded memory | access snapshot | 3 s by default | assignment/membership/store-binding/entitlement writes | short-lived optimization; Core remains authority |
| L2 distributed | none | — | — | intentionally not introduced |
| HTTP/browser | non-authoritative data cache | 15 s default | namespace clear, action patch/invalidation, logout | app/user/org/store namespace; never auth/access/session/token |
| HTTP/browser | auth/access response | — | — | Core auth responses remain private/no-store |

`AevoMemoryCache` uses a size-limited `IMemoryCache` and a per-key single-flight dictionary. Completed flights are removed, so the flight dictionary cannot grow with every key forever. `AuditCursorSigner` and cache tests cover normalization, TTL/removal, filter binding, tamper rejection, and twenty concurrent same-key misses producing one source call. When a sync-manifest ETag or resource marker changes, or the manifest request returns 401/403, the browser cache clears all non-manifest read models in that namespace; the manifest itself is retained only for ETag revalidation after a successful response.

`@aevo/client-data-cache` keeps an expired entry only long enough to send its previous ETag/version to the next loader. A 304 refreshes the TTL without treating stale browser data as an authorization decision. Its namespace always includes the app and identity, plus organization/store when present; logout clears both memory and IndexedDB entries for that namespace.

## Authorization and tenant safety

- Session cache keys use a SHA-256 digest of the opaque token, never the token itself.
- Request-local caching is keyed by the application scope and cannot cross requests.
- Core still resolves and validates the active session and application binding.
- `TenantContextValidator` continues to reject attempts to widen an app session's organization/store scope.
- Entitlement work is started in parallel only when the effective organization ID is already known from the validated session/request scope. If the assignment read fails, the response remains `APP_ASSIGNMENT_REQUIRED`; the entitlement result is not returned to an unauthorized caller.
- The client may use `access.allowed` to choose a UI path, but every protected server loader and Core endpoint enforces authorization again.
- No cache stores platform roles, memberships, assignments, entitlement decisions, or tenant rows. The sync manifest stores only opaque change markers for those sources; it is not a permission cache.

The Hub routes no longer use the legacy unnamespaced browser loader cache for
payloads containing the Hub access projection, memberships, assignments,
entitlements, or store permissions. The legacy helper remains only as a
rolling-deployment cleanup shim for old bundles; new browser caching uses the
namespaced non-authoritative `ClientDataCache` contract.

## Frontend navigation changes

### Admin

- `aevo-admin/apps/admin/app/lib/auth.server.ts` now shares one auth promise for the current loader request and consumes the Admin decision returned by Core `/api/auth/me`, with a compatibility fallback for an older Core process.
- `aevo-admin/apps/admin/app/routes/login.tsx` no longer performs a preliminary `/api/auth/me` and then a second access request before completing login.
- `aevo-admin/apps/admin/app/routes/admin-layout.tsx` does not revalidate the shell auth loader on ordinary GET menu navigation or unrelated non-GET mutations; user lifecycle mutations still revalidate because they can revoke the current identity.
- Admin audit logs request at most 100 rows and follow a signed keyset cursor.

### Play

- `aevo-play/apps/api/src/app.ts` returns the resolved Core access decision in non-test `/auth/me` responses.
- `aevo-play/apps/modern/app/lib/api.server.ts` shares the request-local access promise and avoids a second access call when `me.access` exists.
- `aevo-play/apps/modern/app/routes/play-layout.tsx` keeps the shell loader stable for ordinary GET navigation and resource mutations; venue/booking actions perform their own server authorization and patch confirmed read models without replaying shell auth.
- `aevo-play/apps/modern/app/routes/auth-callback.tsx` renders a loading state during a callback and an error state only when the exchange fails; it never renders the login form.
- Venue and booking actions return server-confirmed resource results so the client cache can patch the relevant list/detail entry. Mutations that do not return a complete read model invalidate only the affected resource key.

### Cross-app SSO

- The Hub login route renders an SSR-safe handoff loading panel while it checks the existing Hub session and completes the target-app handoff.
- An existing Hub session with a failed assignment/entitlement check renders a recovery/error surface; a user with no Hub SSO session falls through to the normal login form.
- Play's authorization-code exchange is single-flighted per application/code/state inside the API process, so duplicate callback requests share one Accounts exchange instead of racing one 400 against one 200.

### Browser security headers

- Hub, Admin, and the Play Worker emit a default-deny CSP baseline, frame and
  MIME protections, strict referrer and permissions policies, and a
  `trusted-types` allowlist. A separate report-only policy observes
  `require-trusted-types-for 'script'` while the React Router SSR bootstrap is
  audited for a nonce-based enforcement rollout.
- Session cookies remain HttpOnly and app-scoped; the browser cache package
  rejects auth/access/session/permission/token resource keys and clears its
  namespace on logout. Hub, Admin, and Play shell logout actions revoke the
  corresponding app session before clearing the cache namespace.

## Database/read-path changes

- `CoreSession` now reads `last_seen_at`; the touch operation uses one CTE and executes only when the configured interval has elapsed. The local default is 30 seconds and can be changed with `AEVO_SESSION_TOUCH_INTERVAL_SECONDS`.
- Admin users are limited in SQL before expanding memberships; the previous implementation read all matching identity/membership rows and applied `.Take()` only after materializing them.
- Audit logs use a deterministic `(created_at desc, id asc)` keyset order and a hard page limit of 100.
- Application registry and launch-target reads are bounded by the cache and invalidated on the existing mutation/probe writers.
- `/api/v1/sync/manifest` reads only scoped change markers. It does not return rows, claims, or permission decisions; protected loaders still authorize each request. Admin audit rows use the signed keyset cursor advertised by the manifest rather than offset pagination. Role and identity timestamps ensure a session/role change invalidates browser read models even when assignment rows are unchanged.
- No speculative migration was added. `psql` is not available in this local environment, so there is no honest `EXPLAIN (ANALYZE, BUFFERS)` evidence for a new index. Existing indexes, including `aevo_audit_logs_app_time_idx`, are preserved. A production follow-up should capture plans before adding a composite cursor index.

## Files changed

Core:

- `src/Aevo.CoreApi/Runtime/RequestPerformance.cs`
- `src/Aevo.CoreApi/Runtime/AevoMemoryCache.cs`
- `src/Aevo.CoreApi/Data/AuditCursorSigner.cs`
- `src/Aevo.CoreApi/Data/AdminDirectoryDataStore.cs`
- `src/Aevo.CoreApi/Data/CoreDataStore.cs`
- `src/Aevo.CoreApi/Data/ApplicationAuthorizationDataStore.cs`
- `src/Aevo.CoreApi/Data/HubDataStore.cs`
- `src/Aevo.CoreApi/Data/EntitlementDataStore.cs`
- `src/Aevo.CoreApi/Data/TenantContextSql.cs`
- `src/Aevo.CoreApi/Program.cs`
- `tests/Aevo.CoreApi.Tests/PerformanceCacheTests.cs`
- `.env.example`
- `scripts/benchmark-auth-cache.ts`

Apps/launcher:

- `aevo-admin/apps/admin/app/lib/auth.server.ts`
- `aevo-admin/apps/admin/app/routes/login.tsx`
- `aevo-admin/apps/admin/app/routes/admin-layout.tsx`
- `aevo-admin/apps/admin/app/routes/audit-logs.tsx`
- `aevo-play/apps/api/src/app.ts`
- `aevo-play/apps/modern/app/lib/api.server.ts`
- `aevo-play/apps/modern/app/lib/api.shared.ts`
- `aevo-play/apps/modern/app/routes/play-layout.tsx`
- `aevo-play/apps/modern/app/routes/auth-callback.tsx`
- `aevo-play/apps/modern/app/routes/venues.tsx`
- `aevo-play/apps/modern/app/routes/bookings.tsx`
- `aevo-hub/apps/hub/workers/app.ts`
- `aevo-hub/apps/hub/app/routes/hub-layout.tsx`
- `aevo-hub/apps/hub/app/routes/api-security-csp-report.ts`
- `aevo-admin/apps/admin/workers/app.ts`
- `aevo-admin/apps/admin/app/routes/api-security-csp-report.ts`
- `aevo-play/apps/worker/src/index.ts`
- `aevo-client-data-cache/src/index.ts`
- `aevo-client-data-cache/test/index.test.ts`
- `aevo-admin/apps/admin/app/routes/api-v1-sync-manifest.ts`
- `aevo-hub/apps/hub/app/routes/api-v1-sync-manifest.ts`
- `aevo-core-api/src/Aevo.CoreApi/Data/SyncDataStore.cs`
- `scripts/local-dev.ts`

The local launchers also force Bun's `development` export condition for Play/POS and their web/API processes. That fixes the prior local-only failure where the API loaded a stale production config module and returned `ACCOUNTS_NOT_CONFIGURED` despite the local Accounts/Core bindings being present.

## Verification

Passed:

- `dotnet build src/Aevo.CoreApi/Aevo.CoreApi.csproj --no-restore -p:StaticWebAssetsEnabled=false`
- `dotnet test tests/Aevo.CoreApi.Tests/Aevo.CoreApi.Tests.csproj --no-restore -p:StaticWebAssetsEnabled=false --filter FullyQualifiedName~PerformanceCacheTests` — 9 passed
- `bun run typecheck` in `aevo-admin`
- `bun run typecheck` in `aevo-play`
- `bun test ./packages/api-contract/test/api-contract.test.ts` in `aevo-hub` — 2 passed
- `bun test ./packages/auth-client/test/auth-client.test.ts` in `aevo-hub` — 2 passed
- `bun test ./test/security-architecture.test.ts` in `aevo-hub` — 5 passed; 1 entitlement assertion remains a current database-fixture mismatch (`KIOSK` is globally `DISABLED`, so Core correctly returns `APPLICATION_DISABLED` while that test expects `ALLOWED`)
- `bun test apps/api/src/app.test.ts` in `aevo-play` — 9 passed
- `bun test` in `aevo-client-data-cache` — 5 passed; TypeScript typecheck and declaration build passed using the workspace TypeScript toolchain
- Live local manifest probe — Hub/Admin returned `200` then `304` with the same ETag; Admin advertised `auditLogs`, and the signed audit endpoint returned page one plus a valid cursor page
- `bun run benchmark:auth-cache` — cold Core auth MISS samples remain database-bound; the latest warm samples are `HIT`, 2.0–2.1 ms P50 and 8.8–9.1 ms P95 through the Hub Edge.

Runtime probes after restart:

- Admin login: 200; Hub login: 200; Play login: 200.
- Admin auth and access: 200 with the after numbers above.
- Hub auth and access: 200 with the after numbers above.
- Play SSO loading boundary: server-rendered handoff HTML contains `aevo-sso-handoff-loading` and no login form.
- Play end-to-end SSO: Hub login 200 → Hub handoff 200 → Play exchange 200 → Play `/api/v1/auth/me` 200 with `access.allowed=true` for the seeded test identity.
- Play resource path: authenticated `/api/v1/organizations/{organizationId}/stores` 200 and `/api/v1/venues` 200 for the selected store.
- Play write-path smoke: the same SSO session created a temporary venue, created and updated a resource, then deactivated both records successfully; the previous null `venues.description` failure did not reproduce.
- CSP report path: POST through Hub Vite → Edge → Core returns 204; the Core endpoint accepts diagnostic reports without storing or echoing their body.
- Web shell security probe: Hub and Admin document responses include CSP, Trusted Types report-only policy, `nosniff`, `DENY`, referrer, permissions, and opener headers.
- Authenticated Play manifest/resource probes: manifest 200 with an ETag, scoped venue read 200, and the availability route accepted the app session when a venue was present.
- Admin application registry: first read 257.5 ms, second read 118.6 ms; the second read used the L1 registry cache while still doing the authenticated Core request.
- Admin audit page: first page 200, five items, cursor present; second cursor page 200, five items.
- Admin server-rendered document probes after the final list/audit changes: `/` 200 in 2156.3 ms, `/organizations` 200 in 689.7 ms, `/applications` 200 in 290.7 ms, `/subscriptions` 200 in 593.3 ms, and `/audit-logs` 200 in 757.8 ms. These include the document/loader path and remote database variability; the Admin navigation target is therefore not yet met for every page.

The Computer Use browser surface was unavailable in this run, so browser DevTools request counts were not claimed. HTTP/Core request IDs and performance logs were used instead. A final browser pass should be run when the CUA surface is available, especially for Admin Overview, Organizations, Applications, Subscriptions, Audit logs, Hub navigation, and the Play assignment-recovery redirect.

## Remaining risks and follow-ups

1. Hub cold auth and full document navigation remain above the local target because the remote database/authorization path is still the dominant cost. The next optimization should be a measured SQL plan and, if justified, a combined session-plus-principal/authorization query that preserves RLS and app binding—not a blind Redis cache.
2. The selected local store currently has venue rows and the venue read path is healthy; booking-calendar readiness still depends on the individual venue availability/configuration data being populated.
3. Audit cursor indexes should be considered only after production `EXPLAIN` evidence and write-volume review.
4. The performance log should be exported to the platform metrics backend in deployment; local structured logs are the current observability sink.
5. The launcher is intentionally long-running and stops existing local processes on its declared ports before start. If another local browser/session controller sends SIGTERM, the stack will stop; this is an environment orchestration issue, not an auth response.
