# Core API and Edge Gateway Audit

## Responsibility matrix

| Capability | Current implementation | Result | Required action |
| --- | --- | --- | --- |
| Public `/api/*` ingress | Edge forwards to Core with request ID, CORS, cache controls, HMAC | GOOD | Keep; integrate platform rate/WAF controls. |
| Business authorization | Core `HubApiEndpoints` and authorization data store | GOOD/PARTIAL | Add negative and cross-tenant integration coverage. |
| Browser session issuance | Accounts calls Core internal session endpoint | GOOD | Keep; verify all apps use app-scoped cookie names. |
| Hub organization/store API | Core `MapHubApi()` routes | PARTIAL | Synchronize contract, docs, generated clients, and ownership. |
| Database migration execution | Core migrator / Infrastructure migration service account | GOOD DIRECTION | Prove one authority for shared public tables before cutover. |
| Connection testing | Core direct `/health` probe; worker persists probe result | PARTIAL | Add signed version/manifest/tenant-safe handshake. |
| Rate limiting/WAF | Not implemented in Edge source; likely infrastructure integration point | UNKNOWN/PARTIAL | Document and test Cloudflare policy separately. |
| Observability | request IDs and structured logs in Edge/Core/Hub | GOOD/PARTIAL | Add cross-service trace propagation and action outcome metrics. |

## Critical findings

### 1. Removed origin remains allowed

`aevo-edge-gateway/src/index.ts` still includes `http://localhost:4321` and `http://127.0.0.1:4321` in `LOCAL_ALLOWED_ORIGINS`. `test/index.test.ts` also tests the old origin as valid. Since the supported Hub is `:4330`, this is legacy compatibility residue and can hide incorrect clients.

**Disposition:** DEPRECATE; remove only after all local docs/tests and app callback configuration are updated.

### 2. Liveness is being used as compatibility evidence

`GET /api/v1/hub/application-connections/{applicationCode}/test` reads a configured URL and requests `/health`. A healthy process can still have an incompatible API version, missing auth exchange, wrong app assignment, or disabled tenant capability.

**Disposition:** EXTEND with a versioned signed handshake and explicit capability response. Keep `/health` as liveness only.

### 3. Entitlement shortcut is not an authorization primitive

The current Hub entitlement-check endpoint returns `allowed = true` in the development path. Development mode may permit seeded testing, but no route or client may use this value as a production access decision.

**Disposition:** BUILD fail-closed entitlement evaluation; isolate unlimited development behavior behind a local-only policy and test that production configuration cannot enable it.

### 4. Contract status is stale

Core README/contract metadata reports a partial Hub implementation while `HubApiEndpoints.cs` contains organization, store, app access, templates, catalog, members, devices, audit, entitlement, and onboarding routes.

**Disposition:** CONSOLIDATE route inventory and generated contract as one versioned release artifact.

## Core data access concern

Core currently uses Npgsql data stores that address `public.*` tables shaped by the historical Supabase schema. That is acceptable as a transition mechanism, but it does not yet prove that Core owns the schema lifecycle or that POS/Play cannot independently mutate the same control-plane tables.

Required evidence before a shared-table cutover:

- migration ledger showing Core/Infrastructure as the only executor;
- table-by-table writer inventory;
- service account permissions proving app runtimes cannot perform control-plane DDL;
- RLS transaction-context tests;
- backfill and reconciliation report;
- rollback or dual-read exit criteria.

