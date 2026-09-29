# Aevo Hub Implementation Plan — BATCH-HUB-000 Output and Phased Handoff

**Source plan:** [`/Users/jayc/Project/aevo-ecosystem/hub_implementation_plan.md`](../../hub_implementation_plan.md)  
**Audit date:** 2026-09-26
**Mode:** Controlled baseline implementation  
**Implementation status:** HUB-001 through HUB-017 are implemented and verified in development. Core owns sessions, assignments, registry metadata, installations, store bindings, billing projections, typed store application configuration, dashboard projections, integration lifecycle, and the secure workforce-app launch decision; confirmed Hub/POS/Play compatibility relations, local application-session authority, and Hub legacy runtime surfaces have been retired. HUB-018 remains the production rollout gate.

The source plan is the historical BATCH-HUB-000 invocation. This document is the resulting handoff plus the authorized follow-on implementation record. HUB-002 is implemented against the Core-owned entitlement projection and HUB-003 is implemented with signed app handshakes plus explicit health-only degradation. HUB-004 runtime authorization and direct RLS transaction-context evidence are verified; HUB-005 has converged application assignments to Core; HUB-006 synchronizes route/method coverage; HUB-007 exposes a Core-owned declarative manifest to Hub/Admin; HUB-008 owns the Core installation and store-binding projections; HUB-010 owns the immutable billing event and entitlement projections with a Core internal webhook boundary; HUB-011 owns the versioned, typed store application configuration boundary; HUB-012 owns the Core-mediated, auditable PLAY/POS launch handoff; HUB-013 owns server-side PKCE password recovery and actionable onboarding/recovery states; HUB-014 owns bounded worker delivery and event metrics; HUB-015 owns tenant-scoped dashboard projections and freshness states; HUB-016 owns the first concrete integration lifecycle; and HUB-017 removes the retired Hub runtime and compatibility surfaces. Development migrations have been applied and checksum-verified through `0037_hub_batch_read_indexes.sql` (`42` applied records, including parallel numbered projections and the Hub role-permission alignment backfill); no production rollout has been performed.

## 1. Current-versus-target capability matrix

| Capability | Current owner/repo | Current implementation | Target owner | Status | Action |
| --- | --- | --- | --- | --- | --- |
| Identity provider/credential broker | Accounts | Provider adapter, PKCE, password/recovery | Accounts | GOOD/PARTIAL | KEEP/NARROW |
| App session | Core + Accounts | Opaque app-scoped session, CSRF/timeouts | Core | GOOD | KEEP |
| Hub UI | Hub | Modern React Router console | Hub | GOOD | KEEP/NARROW |
| Public API ingress | Edge | CORS, request ID, HMAC forwarding | Edge/Cloudflare | GOOD/PARTIAL | KEEP/EXTEND |
| Organization/store control plane | Core | Hub routes and Core data stores | Core | GOOD/PARTIAL | EXTEND |
| Membership/workforce | Core | memberships, store membership, app assignments | Core | GOOD/PARTIAL | EXTEND |
| App registry | Core manifest | seeded registry and typed catalogs | Core | GOOD | EXTEND |
| Installation/entitlement | Core | Core installation, subscription, and entitlement projections | Core/billing projection | GOOD | EXTEND |
| App feature config | Core typed schema/config boundary + app-specific data | versioned store configuration and app-owned behavior | Core contract + app owner | GOOD/PARTIAL | EXTEND |
| App launch | Hub/Core config | URL launch action | Core registry + app | PARTIAL | EXTEND |
| App compatibility | Core/worker + POS/Play adapters | Versioned signed handshake with bounded health-only fallback | Core/app handshake | GOOD/PARTIAL | EXTEND |
| Billing | POS verifier + Core projection | immutable Core webhook ledger and idempotent subscription/entitlement projection | Billing/Core | GOOD/PARTIAL | EXTEND |
| Devices | Core route + app domains | register/revoke/list | Core identity + app behavior | PARTIAL | EXTEND |
| Analytics | Core product events + app metrics | tenant-scoped dashboard projection with freshness/source state | Core projections + app reports | GOOD/PARTIAL | EXTEND |
| Eventing | Infra + worker | versioned envelope, bounded consumer, retry/DLQ decision, metrics | Worker/Core | GOOD/PARTIAL | EXTEND |
| Query platform | historical Hub migrations/packages | schema residue, no Hub runtime authority | shared contract/app adapters | LEGACY/PARTIAL | INVESTIGATE |
| Plugins/integrations | app-specific | Core manifest/consent/secret-reference lifecycle for LINE | Core registry + app adapters | GOOD/PARTIAL | EXTEND |
| Digital Sign | Digital Sign | independent product | Digital Sign | OUT OF SCOPE | KEEP SEPARATE |

## 2. Data ownership matrix

| Domain | Current data/owner | Target owner | Transition note |
| --- | --- | --- | --- |
| Identity | Accounts provider + Core identity projection | Accounts/Core | Never expose provider tokens to browser. |
| Session | Core `aevo_app_sessions` | Core | App-scoped only. |
| Organization | `public.organizations`, Core data store | Core | Reconcile shared-table writers. |
| Business/brand | historical shared schema | Core if cross-app | Decide hierarchy semantics. |
| Location/store | `public.stores`, Core routes, app migrations | Core | App reads/projections only. |
| Membership | `public.memberships`, Core resolution | Core | Keep app-local role projections. |
| Workforce assignment | assignment/scope/role tables | Core | App domain permissions remain app-owned. |
| App registry | Core `aevo_application_registry` | Core | Immutable app code; public catalog copies retired. |
| Installation | Core installation/binding projections | Core/billing projection | Separate from user permission. |
| Entitlement | Core plan/organization projections | Core | Evaluator is fail-closed; public billing copies retired. |
| Billing | provider/webhook/Admin projection | Billing/Core | Verify implementation and idempotency. |
| Device | Core device routes/public devices | Core identity; app behavior | Revoke and pairing in Core. |
| POS data | POS-owned app tables | POS | Do not copy into Hub. |
| Booking/venue | Play-owned app tables | Play | Do not copy into Hub. |
| Feed/TraceDee | app/legacy public data; Core config only | Go/TraceDee + Core config | Keep content domain out of Hub. |
| Settings | mixed | narrowest enforcing owner | Typed config contract. |
| Audit | Core audit + app audit | Core control-plane, app domain | Correlate by request/event ID. |
| Analytics | Core events + app metrics | projections + app owners | Warehouse deferred. |
| Plugin/integration | app adapters | Core lifecycle + app runtime | Secrets by reference only. |

## 3. Repository necessity matrix

| Repository | Responsibility | Status |
| --- | --- | --- |
| `aevo-hub` | organization-owner/admin UI | KEEP BUT NARROW |
| `aevo-core-api` | canonical control plane | KEEP AND EXPAND |
| `aevo-edge-gateway` | public ingress/security transport | KEEP BUT NARROW |
| `aevo-accounts` | identity broker/SSO | KEEP BUT NARROW |
| `aevo-admin` | privileged platform UI | KEEP SEPARATE |
| `aevo-contracts` | versioned shared contracts | KEEP AND EXPAND |
| `aevo-infrastructure` | runtime/IAM/migrations/resources | KEEP AND EXPAND |
| `aevo-background-worker` | probes/events/tasks | KEEP BUT NARROW |
| `aevo-pos` | POS domain | KEEP AS-IS AS APP OWNER |
| `aevo-play` | booking/venue domain | KEEP AS-IS AS APP OWNER |
| `aevo-go` | customer surface | KEEP AS-IS AS CUSTOMER SURFACE |
| `aevo-digital-sing` | separate signing product | KEEP INDEPENDENT / OUT OF SCOPE |

## 4. Request flows

### Owner login

| Current | Target |
| --- | --- |
| Hub browser → Accounts identity flow → Core session → Hub loader → Core Hub access | Same, with one versioned handoff contract, explicit app code `HUB`, safe denial reason, and audit event. |

### Hub store selection

| Current | Target |
| --- | --- |
| Hub loader calls Core organizations/stores and actions use selected IDs | Core derives organization membership and store scope, returns paginated stores/freshness, rejects conflicting client headers, and emits audit for selection-sensitive mutations. |

### Employee POS/Play login

| Current | Target |
| --- | --- |
| App-specific login/session adapters with Core/Accounts boundary and local app data | Accounts proves identity; Core issues app-scoped session and evaluates org/store/app assignment; POS/Play then enforce domain role and RLS. |

### Cross-app SSO

| Current | Target |
| --- | --- |
| Authorization-code/handoff routes exist | Registered source/target apps, exact redirect allowlist, nonce/audience/expiry/replay checks, app-scoped session issuance, and full negative test matrix. |

### App installation and location enablement

| Current | Target |
| --- | --- |
| Hub can call subscription/store-app routes; legacy tables overlap | Billing/admin command creates Core installation projection; Core checks entitlement; explicit store binding enables the app; provisioning is idempotent and observable. |

### Employee assignment

| Current | Target |
| --- | --- |
| Hub member actions update app assignments | Core owns assignment lifecycle; app roles/scopes are versioned; revocation invalidates sessions or forces re-evaluation. |

### Billing to entitlement

| Current | Target |
| --- | --- |
| Billing truth is documented but projection path is not fully evidenced | Verified webhook → idempotent event record → Core entitlement projection → installation/binding/access decisions. |

### Hub dashboard metrics

| Current | Target |
| --- | --- |
| Stats/overview routes can read control-plane counts; app fan-out risk remains | Core read models with freshness, app-specific reports linked separately, and no synchronous multi-app database fan-out. |

### App launch

| Current | Target |
| --- | --- |
| Hub uses configured URLs and app access state | Core registry resolves URL/audience/version; Core evaluates installation/entitlement/assignment; launch token/handoff is short-lived and auditable. |

### Plugin install

| Current | Target |
| --- | --- |
| No generic Hub plugin runtime | First implement registry/consent/secret reference/lifecycle; runtime adapter stays in owning app. |

## 5. Phased implementation backlog

HUB-000 was the controlled baseline batch. HUB-001 route/origin cleanup, HUB-002 entitlement evaluation, and HUB-003 compatibility handshakes are implemented and verified. HUB-004 runtime tenant-security evidence is green, while HUB-005 remains the hard gate for the remaining shared-schema changes.

### HUB-000 — Baseline and ownership ledger

- **Priority/complexity:** P0 / M
- **Goal:** Produce authoritative route, port, table, writer, reader, contract, callback, and secret-reference inventories.
- **Why:** All later deletion and migration decisions depend on evidence.
- **Repos/files:** all in-scope repos; `scripts/*`, READMEs, migration directories, deployment manifests.
- **DB/API/contracts:** no schema mutation; inventory Core/OpenAPI/public tables and app manifests.
- **Security:** identify every trust boundary and direct database writer.
- **Dependencies:** none.
- **Steps:** freeze new duplicate control-plane objects; collect inventories; publish owners; add CI search checks.
- **Tests:** repository reference scan, route inventory check, migration-owner check.
- **Acceptance:** every shared table and endpoint has one owner, readers, writers, and lifecycle; the current baseline does not yet meet this acceptance because the ledger records unknown writers and conflicting authorities.
- **Risk/rollback:** documentation risk only; revert generated report if incorrect.

### HUB-001 — Canonical route and origin cleanup

**Status:** Scoped implementation complete and verified. Remaining migration, contract, entitlement, session, and tenant-security work is not included.

- **Priority/complexity:** P0 / S
- **Goal:** Make `:4330` and current modern routes the only supported Hub surface.
- **Why:** stale `:4321` and `/modern/organize` create inconsistent runtime behavior.
- **Repos/files:** Edge CORS/tests, Core onboarding response, Hub routes/docs, root launcher/docs.
- **DB/API/contracts:** update route contract and callback allowlists; no data migration.
- **Security:** remove stale origins and prevent open redirect/callback drift.
- **Dependencies:** HUB-000.
- **Steps:** inventory references; update contract/docs/tests; deprecate compatibility; observe telemetry.
- **Tests:** origin preflight matrix, onboarding route assertion, browser smoke.
- **Acceptance:** no supported runtime returns or requires removed route/port.
- **Risk/rollback:** old local clients may fail; retain explicit temporary compatibility only with expiry.

### HUB-002 — Fail-closed entitlement and assignment evaluation

**Status:** Implemented and verified in development. The projection is still transitional until HUB-005/HUB-010 move schema and billing ownership to Core/Infrastructure.

- **Priority/complexity:** P0 / M
- **Goal:** Ensure no development shortcut can grant production access.
- **Why:** current `allowed=true` shortcut is unsafe as an authorization primitive.
- **Repos/files:** Core entitlement/access endpoints, config validation, Hub launch UI, tests.
- **DB/API/contracts:** define reason codes and entitlement projection version.
- **Security:** environment assertion, deny-by-default, audit decisions.
- **Dependencies:** HUB-000; billing decisions OD-003/OD-006.
- **Steps:** separate local seed mode from evaluator; make production fail closed; add config guard; evaluate exact app/feature, subscription period, organization entitlement, store binding, and member assignment; expose bounded reason codes and projection version; keep Hub launch checks read-only and app-session issuance app-scoped.
- **Tests:** no entitlement, expired entitlement, wrong store, production config with dev flag, revocation.
- **Acceptance:** every protected action has an evaluated entitlement/assignment decision.
- **Implementation evidence:** `EntitlementEvaluator` rejects unknown/disabled apps, missing or inactive/expired subscriptions, disabled features, and disabled store bindings. Core creates an explicit 14-day `TRIALING` starter projection during organization onboarding rather than granting access with a bypass. `/api/v1/access` evaluates Hub sessions and supports a read-only Hub proxy for app launch checks; `/internal/auth/sessions/resolve` re-evaluates entitlement before returning an app principal. Decisions are logged with request ID, app, organization/store, reason, and projection version. Production-like Core startup rejects `AEVO_ALLOW_UNLIMITED_TESTING=true`.
- **Risk/rollback:** legitimate local fixtures may fail; use explicit local seed tooling, not runtime bypass.

### HUB-003 — Versioned application compatibility handshake

**Status:** Implemented and verified in local development. Legacy applications without the handshake remain explicitly `HEALTH_ONLY`/degraded; no application is treated as compatible from liveness alone.

- **Priority/complexity:** P0 / M
- **Goal:** Replace health-only connection testing with contract/capability verification.
- **Why:** `/health` does not prove protocol, auth, tenant, or feature compatibility.
- **Repos/files:** Core connection test, worker probe, `aevo-contracts`, each app health/handshake endpoint.
- **DB/API/contracts:** add handshake schema, protocol version, capability list, status/reason.
- **Security:** signed service request; no tenant secrets in response; bounded timeout.
- **Dependencies:** HUB-006, app contract owners.
- **Steps:** define envelope; implement app adapters; persist result; show safe status in Hub.
- **Tests:** healthy, incompatible, unauthorized, timeout, wrong signature, stale result.
- **Acceptance:** Hub distinguishes liveness from compatibility and records last verified version.
- **Implementation evidence:** `aevo-contracts` publishes the `aevo.application-handshake` v1 envelope and typed connection result. Core signs outbound probes with `AEVO_HANDSHAKE_SHARED_SECRET`, enforces a three-second timeout and 32 KiB response bound, validates protocol/app/contract/capabilities/readiness/freshness, persists bounded compatibility metadata, and falls back to `/health` only as `HEALTH_ONLY`/`DEGRADED`. POS and Play expose signed `/.well-known/aevo-handshake` endpoints; the background worker uses the same protocol and records compatibility metadata. Unauthorized, incompatible, stale, timeout, offline, and not-configured results remain distinct. `aevo-digital-sing` was not changed.
- **Verification:** Core tests passed (`64/64`); contract validation/typecheck/tests passed (`24/24`); POS API tests passed (`60/60`) and typecheck passed; Play API tests passed (`5/5`) and typecheck passed; background-worker tests passed (`4/4`) and typecheck passed; Hub live security smoke remained green (`2` tests, `39` expectations) after the runtime restart.
- **Risk/rollback:** old apps lack handshake; keep health-only status as explicitly degraded compatibility.

### HUB-004 — Tenant-security and RLS integration gate

- **Status:** `IMPLEMENTED_AND_VERIFIED` for the development security gate; remaining app-owned reader cutovers are tracked under HUB-005.
- **Priority/complexity:** P0 / L
- **Goal:** Prove tenant isolation across Core, Edge, Hub, POS, Play, Go, and Accounts.
- **Why:** shared transitional tables and client scope hints create bypass risk.
- **Repos/files:** Core authorization/data stores, Edge, app APIs/RLS, root tenant tests.
- **DB/API/contracts:** test transaction context, app session, org/store scope.
- **Security:** all denial cases in `18-security-and-tenant-boundaries.md`.
- **Dependencies:** HUB-000, HUB-002.
- **Steps:** seed two-tenant fixture; run matrix; fix findings; add CI gate.
- **Tests:** cross-tenant read/write, mismatched headers, revoked session, assignment mismatch, device move.
- **Acceptance:** zero unauthorized cross-tenant result; audit output explains denials.
- **Implementation evidence:** Core authorization and audit queries apply transaction-local `aevo.user_id`, organization, store, app, and platform-role context before reading/writing RLS-protected data. The migrator RLS check uses an existing non-bypass probe role, forces RLS for the assignment projection, proves owner-only visibility, rolls back, and proves the context is absent on the next transaction.
- **Verification:** Core tests `102/102`; live Hub smoke `4` tests / `75` expectations; root tenant-security gate `18/18`; RLS transaction-context check passed; `aevo-digital-sing` was tested in isolation and not modified.
- **Risk/rollback:** may expose existing app assumptions; block cutover until fixed.

### HUB-005 — Shared schema writer and migration authority convergence

- **Status:** `IMPLEMENTED_AND_VERIFIED`; Core/Infrastructure own the control-plane migration history and all confirmed Hub compatibility relations, readers, writers, and local session authorities are retired in development. Organization/store/membership domain tables remain shared application data with Core as the current write boundary.
- **Priority/complexity:** P0 / XL
- **Goal:** Core/Infrastructure become the only control-plane migration and write authority.
- **Why:** Hub/POS/Play historical migrations overlap on shared tables.
- **Repos/files:** Core migrations/data stores, Infrastructure migrator/IAM, Hub/POS/Play migrations.
- **DB/API/contracts:** table-by-table expand/backfill/dual-read/write transition.
- **Security:** least-privilege service accounts and DDL denial for app runtimes.
- **Dependencies:** HUB-000, HUB-004, OD-002.
- **Steps:** map schema; add missing target migrations; backfill; compare; switch writes; archive sources.
- **Tests:** clean install, upgrade, restore, reconciliation, concurrent migration lock.
- **Acceptance:** one migration ledger/lock and no unapproved shared-table writer.
- **Implementation evidence:** Core migrations `0013` through `0035` provide the authority ledger, canonical assignments/installations/bindings/billing projections, workspace template primitives, typed store application configuration, template configuration copy, dashboard projections, integration lifecycle, Hub role-permission alignment, feed feedback boundary, and final compatibility retirement. Hub, POS, and Play use Core sessions and Core authorization; app-owned migration trees no longer contain the retired control-plane files; the Core migrator is the only control-plane DDL owner.
- **Verification:** `39` applied Core migrations; migration verify/dry-run and legacy-removal checks passed; Infrastructure ownership check `10/10`; Core tests `124/124`; live Hub security smoke includes typed configuration/template coverage and organization permission resolution; root tenant-security, full integration, POS, Play, Go, and isolated Digital Sign checks passed.
- **Risk/rollback:** data divergence; retain source read-only and compensating migrations.

### HUB-006 — Contract release synchronization

- **Status:** `IMPLEMENTED_AND_VERIFIED` for deterministic route/method coverage; payload schema detail remains a follow-on.
- **Priority/complexity:** P0 / M
- **Goal:** Align runtime routes, OpenAPI, TypeScript types, README status, and client versions.
- **Why:** contract metadata currently understates/does not fully describe implementation.
- **Repos/files:** `aevo-contracts`, Core route inventory, Hub/Admin/app clients.
- **DB/API/contracts:** publish versioned Hub API contract and deprecation metadata.
- **Security:** model denial/error responses without leaking tenant existence.
- **Dependencies:** HUB-000, HUB-001.
- **Steps:** generate route list; compare to OpenAPI; update client; add compatibility fixture.
- **Tests:** contract snapshot, live contract test through Edge, backward compatibility.
- **Acceptance:** one release artifact describes every supported Hub route and response.
- **Implementation evidence:** `scripts/sync-hub-openapi.ts` parses Core Hub route sources, verifies the `54` versioned contract routes exist in Core, and deterministically refreshes OpenAPI. The artifact now contains `83` API paths and all `54` Hub route/method entries; root test runners perform contract synchronization before checks.
- **Verification:** OpenAPI validator, contracts typecheck, and contract tests passed (`52` tests / `198` expectations); Core/Hub/Admin linked installs were refreshed from the same `aevo-contracts` artifact.
- **Risk/rollback:** client drift; retain previous version during expand/migrate.

### HUB-007 — Manifest-backed app registry

- **Status:** `IMPLEMENTED_IN_PROGRESS`; Core manifest, installation, billing, and store-binding projections plus Hub/Admin consumers are live in development, while environment connection writers and compatibility catalogs remain transitional.
- **Priority/complexity:** P1 / L
- **Goal:** remove hard-coded app catalogs and make registry/manifest canonical.
- **Why:** Hub/Admin/legacy public `apps` metadata can drift.
- **Repos/files:** Core registry, `aevo-contracts`, Hub store/settings routes, Admin registry UI.
- **DB/API/contracts:** manifest schema, lifecycle, capability, origin, contract version fields.
- **Security:** registry mutation privileged; secrets by reference only.
- **Dependencies:** HUB-006, OD-005.
- **Steps:** reconcile codes; add manifest fields; expose typed catalog; migrate consumers.
- **Tests:** retired app, incompatible version, missing origin, manifest cache invalidation.
- **Acceptance:** every first-party app resolves one registry record and Hub has no authoritative hard-coded list.
- **Implementation evidence:** Core migration `0017_application_manifest.sql` adds manifest version, owner repository, contract version, audience, install scope, store scope, launch path, capabilities, configuration schema references, and lifecycle status. Hub settings derives assignable applications from the Core catalog; store features derive from manifest capabilities; Admin uses Core registry rows when connected and only uses known metadata while offline. Origins are read from Core connection metadata when present, with explicit local environment fallback for development; launch authorization and readiness are resolved by Core.
- **Verification:** `36` Core migration records are applied and checksum-verified; Core/Hub/Admin typechecks passed; live Hub response asserted POS `manifestVersion=v1`, `storeScoped=true`, and `catalog` capability; store-binding, installation, and billing projection checks passed with `0` mismatches; tenant-security gate passed `16/16`.
- **Risk/rollback:** metadata incomplete; keep fallback only as visibly deprecated read path.

### HUB-008 — Installation, entitlement, and store binding projections

- **Status:** `IMPLEMENTED_AND_VERIFIED`; Core installation, billing/entitlement, and store-binding projections are canonical in development and the confirmed public compatibility schema has been retired.
- **Priority/complexity:** P1 / XL
- **Goal:** converge organization installation and location binding into Core projections.
- **Why:** current public schema and Core routes overlap.
- **Repos/files:** Core data/migrations, billing projection, Hub store app actions, POS Core adapter, app provisioning adapters.
- **DB/API/contracts:** installation/binding/feature state, reason codes, idempotency keys.
- **Security:** evaluate org entitlement before store enablement and member assignment.
- **Dependencies:** HUB-002, HUB-005, HUB-007, HUB-010.
- **Steps:** reconcile; backfill; Core-only reads/writes; emit provisioning events; retire the compatibility schema.
- **Tests:** enable/disable, two stores, no entitlement, retry, duplicate request.
- **Acceptance:** one deterministic access decision and audit trail per app/store/member.
- **Implementation evidence:** Core migrations `0018`, `0020`, and `0021` created the canonical binding, installation, provisioning, billing, subscription, and entitlement projections. `0022` completed catalog metadata and plan-entitlement backfill; `0023` moved template instantiation to Core; `0019` moved workspace template/schema primitives to Core authority; `0024` retired public assignment, store-binding, billing, catalog, entitlement, and authorization-code compatibility relations; `0025` removed local sessions/registry; and `0026`/`0027` removed public admin/settings/query helpers and legacy Hub RPCs. `aevo-digital-sing` is excluded.
- **Verification:** `36` Core migration records are applied and checksum-verified; `--legacy-removal-check` passes; Core build/tests pass; RLS transaction-context check passes; tenant-security and migration ownership checks pass; live template/configuration coverage passes; and Digital Sign remains independently verified.
- **Remaining transition:** provider lifecycle/replay depth and app-specific domain work remain follow-on scope. No active Hub/POS/Play runtime reader or writer requires the retired public compatibility relations.
- **Risk/rollback:** app provisioning partial failure; status machine and compensating disable.

### HUB-009 — Workforce lifecycle and app assignments

- **Priority/complexity:** P1 / L
- **Goal:** complete invite/member/store/app assignment state machine.
- **Why:** identity and access are currently easy to conflate.
- **Repos/files:** Core member endpoints/data, Hub settings UI, app authorization adapters.
- **DB/API/contracts:** invitation, acceptance, suspension, expiry, role/scope contract.
- **Security:** revocation and session re-evaluation.
- **Dependencies:** HUB-004, HUB-008.
- **Steps:** define states; add idempotent actions; migrate assignment writers; update UI.
- **Tests:** invite replay, expired invite, store-limited member, downgrade, revoke session.
- **Acceptance:** organization, store, app, and domain permissions remain distinct.
- **Risk/rollback:** existing app roles differ; support mapping/compatibility aliases.

### HUB-010 — Billing and entitlement projection

- **Status:** `IMPLEMENTED_AND_VERIFIED`; the Core billing projection and POS forwarding boundary are live in development and the public billing compatibility relations are retired.
- **Date/operator:** 2026-09-25 / Codex
- **Repositories changed:** `aevo-core-api`, `aevo-pos`, `aevo-hub`, workspace migration/test scripts, and Hub migration-authority documentation.
- **Changes:** added Core migration `0021_billing_entitlement_projection.sql` with immutable `aevo_billing_webhook_events`, canonical `aevo_organization_subscriptions`, and canonical `aevo_organization_entitlements`; backfilled them from the historical public projections; added Core's secret-protected `/internal/billing/webhooks` projection endpoint with provider/event idempotency, unknown-customer handling, lifecycle status mapping, entitlement synchronization, installation synchronization, and an outbox audit event; switched Core entitlement evaluation and Hub subscription reads to the canonical projections; made POS forward verified production webhook events and subscription reads to Core; and removed the compatibility mutation/read paths in `0024`, `0026`, and `0027`.
- **Security boundary:** the browser and Hub UI cannot grant paid access. Provider signature verification remains at the billing ingress, Core owns the immutable event ledger and authorization projection, and assignment/store binding remain separate gates. Unknown providers/events/customers fail closed or become explicit `IGNORED` statuses without inventing organization access. `aevo-digital-sing` is excluded.
- **Verification:** Core tests `124/124`; migration verify and dry-run passed; `--legacy-removal-check` passed; unknown-customer webhook replay remains fail-closed/idempotent; POS typecheck and integration tests passed; and tenant-security passed `16/16`.
- **Remaining transition:** expand provider lifecycle coverage for cancel, downgrade, refund, out-of-order, and restore/replay scenarios in the canonical Core ledger; no public billing compatibility writer remains.
- **Priority/complexity:** P1 / L
- **Goal:** prove provider webhook source of truth and deterministic Core projections.
- **Why:** subscription tables and entitlements are duplicated/transitional.
- **Repos/files:** Admin billing UI, Core billing data/route, POS billing ingress adapter, worker/ingestion, Infrastructure secrets.
- **DB/API/contracts:** event idempotency, projection version, grace/revoke semantics.
- **Security:** signature verification and replay defense.
- **Dependencies:** HUB-002, HUB-005, OD-003.
- **Steps:** inventory provider flow; implement/verify verifier; project; reconcile; alert divergence; add lifecycle/replay fixtures; cut the remaining compatibility mutation path.
- **Tests:** activate, cancel, downgrade, refund, replay, out-of-order, unknown customer.
- **Acceptance:** Hub only reads billing projection and no UI action grants paid access.
- **Risk/rollback:** stale billing state; explicit grace policy and incident runbook.

### HUB-011 — Typed app configuration boundary

**Status:** `IMPLEMENTED_AND_VERIFIED` in local development. Hub presents Core-owned typed schemas; it does not own app-domain configuration tables or plaintext secrets.

- **Date/operator:** 2026-09-25 / Codex
- **Repositories changed:** `aevo-contracts`, `aevo-core-api`, `aevo-hub`, and the Core migration/inventory documentation.
- **Changes:** added typed schema and configuration request/response contracts; added Core catalog definitions for Play, POS, Kiosk, and Queue configuration schemas; added Core GET/PATCH routes with store scope, membership/permission checks, schema-version validation, field/type/range validation, unknown-key rejection, payload limits, secret-like key rejection, audit/outbox events, and default materialization; added RLS-protected `aevo_store_application_configurations`; and made Core template instantiation copy validated typed configuration to duplicated stores.
- **Security boundary:** only Core writes the configuration table. Hub is an orchestrator and renders schema-driven forms with dropdowns for boolean/select fields; secret/token/password/credential/private-key/API-key material is rejected rather than stored. Store app enablement, organization entitlement, member assignment, and configuration permission remain separate decisions.
- **Verification:** Core build passed; Hub typecheck passed; contracts synchronized to `54` route entries and `83` OpenAPI paths; migrations `0028`/`0029` applied and checksum-verified; live typed configuration smoke covered valid save, secret rejection, schema-version mismatch, disabled-app rejection, and template copy.
- **Remaining transition:** app-owned domain APIs still consume their own operational data; provider lifecycle/replay depth remains follow-on work after the HUB-012 launch handoff.

- **Priority/complexity:** P1 / L
- **Goal:** make app feature/config ownership explicit and versioned.
- **Why:** Hub currently presents static feature/catalog controls that may belong to apps.
- **Repos/files:** `aevo-contracts`, Core config routes, Hub store workspace, POS/Play config APIs.
- **DB/API/contracts:** schema version, scope, validation, secret references, audit event.
- **Security:** only assigned admins write; no plaintext secrets.
- **Dependencies:** HUB-006, HUB-007, OD-007.
- **Steps:** classify settings; define typed schemas; expose app adapters; migrate UI actions.
- **Tests:** invalid config, wrong scope, secret redaction, schema migration, unauthorized write.
- **Acceptance:** Hub orchestrates settings without becoming a second app-domain database.
- **Risk/rollback:** config incompatibility; versioned schema and default rollback.

### HUB-012 — Idempotent app launch and provisioning

**Status:** `IMPLEMENTED_AND_VERIFIED` for the secure launch-handoff slice in local development. PLAY and POS are supported; KIOSK and QUEUE remain explicitly unavailable until their callback runtimes exist. Aevo Go keeps its separate customer SSO flow and is not put behind organization/store workforce launch controls.

- **Date/operator:** 2026-09-26 / Codex
- **Repositories changed:** `aevo-core-api`, `aevo-contracts`, `aevo-hub`, `aevo-accounts`, `aevo-play`, `aevo-pos`, and the root integration runner/docs.
- **Changes:** added the versioned Core `POST /api/v1/hub/applications/:applicationCode/launch` contract; Core now resolves registry lifecycle, organization/store membership, app assignment, entitlement, target readiness, audience, contract version, and store scope before returning a target `/api/auth/start` URL. Readiness uses the signed application handshake, and every blocked/allowed result is recorded in Core audit without storing secrets. Hub Settings and Store workspaces now submit to Core and never authorize from a configured URL; Accounts, Play, and POS preserve the validated store context through the PKCE/authorization-code flow.
- **Security boundary:** assignment, entitlement, store scope, audience, expiry, PKCE, and replay remain server-side. KIOSK/QUEUE return `LAUNCH_NOT_SUPPORTED` rather than exposing a direct URL. Existing `AEVO_PLAY_URL`/`AEVO_POS_URL` values are callback destinations/readiness targets only; they do not grant access.
- **Verification:** contracts synchronized to `54` Hub routes and `83` OpenAPI paths; Core build/tests, Hub/Accounts/Play/POS typechecks, Hub security/tenant tests, and the full `test:all` matrix pass. Live local verification completed a store-scoped POS launch through a signed handshake and Accounts start redirect; a PLAY launch without an active test entitlement was correctly rejected with `ENTITLEMENT_INACTIVE`.
- **Remaining transition:** actual provider provisioning/reconciliation and additional app callback runtimes remain follow-on work. The old direct-link shortcut is removed from the supported Hub launch path.

- **Priority/complexity:** P1 / M
- **Goal:** launch the correct app with correct audience/session and report provisioning state.
- **Why:** URL launch alone is not an authorization or readiness guarantee.
- **Repos/files:** Core launch/handoff, Hub launch actions, Accounts exchange, app callback handlers.
- **DB/API/contracts:** registry URL/audience/contract version; short-lived launch code.
- **Security:** exact redirect allowlist, audience/nonce/replay checks.
- **Dependencies:** HUB-003, HUB-007, HUB-008.
- **Steps:** define launch protocol; migrate apps; log outcome; remove direct URL shortcuts.
- **Tests:** valid launch, wrong audience, expired/replayed code, unassigned member.
- **Acceptance:** launch succeeds only when identity, assignment, entitlement, and app readiness allow it.
- **Risk/rollback:** old app callback; maintain versioned handoff during migration.

### HUB-013 — Onboarding and recovery route completion

**Status:** `IMPLEMENTED_AND_VERIFIED` for the development onboarding/recovery slice. Password recovery now uses a server-side PKCE verifier and a one-time Core-encrypted grant; browser code never receives the provider access token. The Hub reset route renders actionable invalid/expired states and does not remain in an indefinite loading state.

- **Date/operator:** 2026-09-26 / Codex
- **Repositories changed:** `aevo-core-api`, `aevo-accounts`, `aevo-contracts`, `aevo-hub`.
- **Changes:** added Core recovery-grant storage/consumption and session revocation, Accounts private PKCE callback exchange, Core callback redirect, recovery CSRF cookie/header validation, and reset UI state handling. The existing passkey capability remains feature-gated and server-checked.
- **Verification:** Core build, Hub typecheck/build, Accounts tests (`11` passing), and the password recovery boundary checks passed. Recovery provider tokens remain private to the Core→Accounts service hop.

- **Priority/complexity:** P1 / M
- **Goal:** make onboarding, password recovery, passkey readiness, and setup navigation coherent.
- **Why:** current stale route and incomplete passkey contract cause apparent hangs/confusion.
- **Repos/files:** Core onboarding, Accounts recovery, Hub login/onboarding routes, contract tests.
- **DB/API/contracts:** onboarding session/checklist contract; no client authority.
- **Security:** token expiry, rate limits, CSRF, recovery audit, passkey recovery policy.
- **Dependencies:** HUB-001, HUB-004, open decision for WebAuthn.
- **Steps:** update route contract; define setup state; complete recovery/passkey design; instrument wait states.
- **Tests:** reload/resume onboarding, no-org user, member-required user, reset, passkey disabled/enabled.
- **Acceptance:** no infinite loading state; every pending/error state has an actionable safe outcome.
- **Risk/rollback:** provider callback mismatch; preserve old recovery flow only during explicit compatibility window.

### HUB-014 — Worker probe/event vertical

**Status:** `IMPLEMENTED_AND_VERIFIED` for the bounded worker delivery slice.

- **Date/operator:** 2026-09-26 / Codex
- **Changes:** added a versioned event envelope, direct/Google Pub/Sub parsing, tenant/event-id validation, Core durable-consume forwarding, bounded retries, explicit dead-letter acknowledgment, authenticated task dispatch, and worker metrics.
- **Verification:** worker tests (`10` passing, `26` expectations), worker typecheck, and Core build passed. Duplicate, malformed, unauthorized, transient-retry, and poison-delivery cases are covered; poison deliveries are not acknowledged as successful unless dead-lettered explicitly.

- **Priority/complexity:** P2 / L
- **Goal:** finish only the worker paths needed for probes/events/tasks with retries and DLQ.
- **Why:** infrastructure exists but event consumer is currently disabled.
- **Repos/files:** background worker, Core internal event endpoints, Infrastructure Pub/Sub/Tasks.
- **DB/API/contracts:** event envelope and probe result contract.
- **Security:** service token, signature, tenant fields, idempotency.
- **Dependencies:** HUB-003, HUB-006, HUB-018.
- **Steps:** implement consumer; persist/ack; retry/DLQ; expose metrics; run failure drills.
- **Tests:** duplicate, malformed, unauthorized, poison, timeout, replay.
- **Acceptance:** no event is acknowledged before durable handling or explicit safe dead-lettering.
- **Risk/rollback:** event backlog; feature flag consumer and preserve source outbox.

### HUB-015 — Dashboard projections and analytics freshness

**Status:** `IMPLEMENTED_AND_VERIFIED` in development.

- **Date/operator:** 2026-09-26 / Codex
- **Changes:** added Core migration `0032_hub_dashboard_projection.sql`, tenant/store scope keys, RLS policy, bounded `HubDashboardProjection` contract, Core overview/stats routes, five-minute cached read-model refresh, partial-source detection from Core connection state, and stale/unavailable fallback. Hub Workspace renders counts only from the projection and labels `fresh`, `partial`, `stale`, or `unavailable`.
- **Security/performance:** the projection query always filters the authenticated organization and optional store; the Hub page does not fan out to application APIs during navigation. Application source details are summarized by Core and no credential data is included.
- **Verification:** migration dry-run/apply/verify passed; Core build, contracts/OpenAPI sync, Hub typecheck, and live authenticated organization projection smoke passed. A missing/degraded Core source returns an explicit freshness state instead of fabricated metrics.

- **Priority/complexity:** P2 / M
- **Goal:** provide responsive Hub metrics without synchronous fan-out.
- **Why:** current page performance and cross-app reads are a known product concern.
- **Repos/files:** Core read models, worker projections, Hub overview routes, contracts.
- **DB/API/contracts:** bounded metric DTO with freshness/source timestamp.
- **Security:** tenant-filtered projections and export permission.
- **Dependencies:** HUB-004, HUB-014, app event decisions.
- **Steps:** define metric catalog; build projections; show freshness; add stale fallback.
- **Tests:** tenant scope, stale data, partial app outage, pagination/load.
- **Acceptance:** dashboard remains usable when an app is unavailable and never leaks another tenant.
- **Risk/rollback:** incorrect metrics; label as unavailable/stale rather than fabricate values.

### HUB-016 — Minimal integration/plugin control plane

**Status:** `IMPLEMENTED_AND_VERIFIED` for the first concrete integration lifecycle; the adapter remains isolated from the Core control plane.

- **Date/operator:** 2026-09-26 / Codex
- **Changes:** added Core migration `0033_core_integration_control_plane.sql`, a versioned `LINE_OFFICIAL_ACCOUNT` BETA manifest, organization/store-scoped lifecycle records, consent/connect/rotate/revoke routes, audit records, Hub settings controls, and strict `secret://`, `gcp-secret://`, `vault://`, or `env://` reference validation. No secret value is accepted or returned by Hub.
- **Verification:** live Core smoke covered list, raw-token rejection, consented connect, rotation, revoke, and post-revoke redaction. The final record was `REVOKED` with `secretConfigured=false`; contracts/OpenAPI, Core build, and Hub typecheck passed.

- **Priority/complexity:** P3 / L
- **Goal:** support concrete integrations without creating a generic remote-code runtime.
- **Why:** generic plugin behavior is not currently evidenced as a requirement.
- **Repos/files:** Core registry/secret references, Accounts OAuth allowlists, owning app adapters, Admin UI.
- **DB/API/contracts:** integration manifest, consent, secret reference, lifecycle.
- **Security:** secret rotation/revocation, least privilege, tenant scope.
- **Dependencies:** HUB-007, HUB-011, OD-010.
- **Steps:** select one concrete integration; prove lifecycle; generalize only after evidence.
- **Tests:** consent denial, uninstall, rotate, wrong tenant, expired token.
- **Acceptance:** no arbitrary executable code or secret value is introduced into Hub.
- **Risk/rollback:** integration-specific complexity; keep adapter isolated and removable.

### HUB-017 — Legacy adapter and migration compatibility removal

**Status:** `IMPLEMENTED_AND_VERIFIED` in development.

- **Date/operator:** 2026-09-26 / Codex
- **Changes:** the Hub-owned gateway/public legacy web process, legacy SDK/auth/db/adapter packages, old Hub migration writer, and retired compatibility migration files are removed from the active repository surface. The launcher starts Core, Accounts, Edge, and the modern console only; app-domain Supabase migration history remains separate and is not a runtime migration owner.
- **Verification:** Hub `auth:legacy-removal-check` passed; Core migrator `--legacy-removal-check` passed against the development database; migration ledger verification passed with `39` applied checksums; old-client/legacy-route denial checks remain in the Hub/Admin test suites. `aevo-digital-sing` was not changed.

- **Priority/complexity:** P2 / XL
- **Goal:** remove old runtime, adapters, duplicate writers, and compatibility code after gates.
- **Why:** deletion is the final step, not the migration strategy.
- **Repos/files:** Hub historical runtime/migrations, Edge stale compatibility, app-local control-plane writers, docs.
- **DB/API/contracts:** only after migration ledger/reconciliation and versioned API cutover.
- **Security:** ensure removal cannot re-enable insecure fallback.
- **Dependencies:** HUB-001 through HUB-012, HUB-004, telemetry observation window.
- **Steps:** deprecate; observe; archive; remove; verify clean install/upgrade.
- **Tests:** repository scan, deployment smoke, restore, old-client denial, tenant suite.
- **Acceptance:** no supported path depends on deleted surface and rollback plan is documented.
- **Risk/rollback:** hidden consumer/data loss; restore archive or revert deployment, not destructive DB reset.

### HUB-018 — Production rollout and operational gates

- **Priority/complexity:** P2 / L
- **Goal:** turn the target boundary into an observable, supportable deployment.
- **Why:** architecture correctness without runbooks/metrics is not operational readiness.
- **Repos/files:** Infrastructure, Core/Edge/Accounts/Worker, dashboards/runbooks, CI.
- **DB/API/contracts:** migration report, health/readiness, contract versions.
- **Security:** IAM review, secret rotation, audit/log redaction, WAF/rate evidence.
- **Dependencies:** all P0 and relevant P1 tasks.
- **Steps:** staged rollout; canary; monitor; validate rollback; declare cutover.
- **Tests:** smoke, load, failure drills, restore, security regression.
- **Acceptance:** defined SLOs, alerts, on-call runbooks, rollback trigger, and signed release checklist.
- **Risk/rollback:** service degradation; stop rollout and revert app version/projection writes safely.

## 6. Dependency graph

```text
HUB-000 ─┬─ HUB-001 ───────────────┐
         ├─ HUB-004 ───────────────┤
         ├─ HUB-005 ─────┬─────────┤
         └─ HUB-006 ─────┼─ HUB-007 ─┬─ HUB-008 ─┬─ HUB-009
                         │           │            ├─ HUB-011
                         │           │            └─ HUB-012
                         └─ HUB-003 ─┘

HUB-002 ───────────────────────────┘
HUB-010 ───────────────────────────┘
HUB-013 depends on HUB-001/HUB-004
HUB-014 depends on HUB-003/HUB-006
HUB-015 depends on HUB-014 and event decisions
HUB-016 depends on HUB-007/HUB-011
HUB-017 depends on all P0/P1 gates and telemetry
HUB-018 is the production gate
```

Parallel work is possible for inventory, contract reconciliation, UI state review, infrastructure least-privilege review, and app handshake design. Database ownership, entitlement security, and tenant tests are hard gates for irreversible migration.

## 7. Architecture to avoid

- a new Hub gateway that duplicates Edge/Core routing;
- a second Hub database for organization/store truth;
- browser-side authorization based on selected store headers;
- a generic “workspace” table that duplicates organization/location hierarchy;
- UI feature toggles that grant entitlements or permissions;
- copying credentials, sessions, devices, billing IDs, or audit history during duplication;
- health-only app connection testing;
- app runtimes performing control-plane DDL;
- synchronous Hub fan-out to every app on every navigation;
- a generic plugin runtime before a concrete integration proves the need;
- destructive deletion of compatibility data before reconciliation and restore evidence;
- including `aevo-digital-sing` in Hub resets or migration work.

## 8. Final handoff

The baseline deliverables are the sibling documents and machine-readable inventories in this directory. `BATCH-HUB-000` is complete; HUB-001 through HUB-012 and the safe transition slices of the control-plane work are implemented and locally verified. The next hard gates are provider lifecycle/replay/restore evidence, onboarding/recovery completion, app-domain ownership, and production rollout; no “documentation only” wording authorizes implicit production migration or destructive deletion.
