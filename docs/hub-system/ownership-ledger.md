# Aevo Hub Ownership Ledger — BATCH-HUB-000

**Baseline date:** 2026-09-24  
**Scope:** Aevo Hub control-plane boundary and its first-party application dependencies  
**Explicit exclusion:** `aevo-digital-sing` source, runtime, schema, and data  
**Status:** **HISTORICAL_BASELINE_SUPERSEDED**

This ledger is the decision boundary for the updated `hub_implementation_plan.md`. It records the observed current owner, the intended owner, and the transition state separately. A target owner is not evidence that a cutover has happened.

This document records the pre-cutover BATCH-HUB-000 baseline. The authorized
follow-on implementation and current verification state are recorded in
[`phase-notes.md`](phase-notes.md) and
[`hub-implementation-plan.md`](hub-implementation-plan.md); do not use the
historical `BLOCKED` labels below as the current runtime status.

## Status rule

The baseline is `BLOCKED` because several shared control-plane tables have multiple runtime or migration writers, Play/POS still have local `public.app_sessions` authority, the billing writer is POS-local while Core reads a different projection, and some assignment/scope tables have unknown writers. No later HUB task is started by this batch.

## Repository and runtime ownership

| Surface | Current owner | Target owner | State | Evidence |
| --- | --- | --- | --- | --- |
| Hub organization/admin UI | `aevo-hub` modern console | `aevo-hub` modern console | CURRENT = active | `aevo-hub/apps/hub` |
| Public ingress | `aevo-edge-gateway` | Edge/Cloudflare ingress | CURRENT = active, narrow responsibility | `aevo-edge-gateway/src/index.ts` |
| Identity broker | `aevo-accounts` | Accounts | CURRENT = active | `aevo-accounts/src/index.ts` |
| App session, assignment, organization/store control plane | Core API | Core API | CURRENT = active but data schema transitional | `aevo-core-api/src/Aevo.CoreApi/Program.cs`, `HubApiEndpoints.cs` |
| Privileged platform UI | `aevo-admin` | Admin | CURRENT = separate | `aevo-admin/README.md` |
| Customer and app domains | Go, POS, Play | owning app per domain | CURRENT = app-owned | `aevo-go`, `aevo-pos`, `aevo-play` |
| Async probes/events | Background Worker | Worker only for approved verticals | CURRENT = probe active, event consumer incomplete | `aevo-background-worker/src/index.ts` |
| Runtime/IAM/migrations | Infrastructure plus Core migration set | Infrastructure/Core | CURRENT = transitional ownership evidence | `aevo-infrastructure`, `aevo-core-api/db/migrations` |
| Shared transport contracts | `aevo-contracts` plus app-local types | `aevo-contracts` | CURRENT = partial adoption | `aevo-contracts/src/index.ts`, `openapi/v1.json` |

The removed `aevo-hub/apps/gateway` is not a supported runtime component. Legacy references and compatibility scans remain and are inventoried, not deleted, in this batch.

## Runtime route and origin ownership

| Boundary | Current authority | Intended authority | Transition finding |
| --- | --- | --- | --- |
| `/api/*` public transport | Edge forwards to Core and app backends | Edge remains ingress; Core owns control-plane behavior | Canonical transport boundary; Edge does not authorize tenants |
| `/v1/auth/*` | Accounts | Accounts | Canonical identity broker; Core issues/evaluates app sessions |
| `/api/auth/*` | Core API | Core API session-facing facade | Canonical for supported Hub flow; exact contract coverage is incomplete |
| `/api/v1/hub/*` | Core API Hub endpoints | Core API | Runtime route family exists; OpenAPI only describes a subset |
| `/api/v1/admin/*` | Core API and Admin UI | Core API + Admin | Separate privileged surface; not a Hub permission substitute |
| POS `/api/v1/hub/*` | POS API contains overlapping Hub-like routes | POS app domain only, or explicit Core proxy | Conflict requires route-by-route decision; no removal in HUB-000 |
| Play `/api` and `/api/v1` | Play API | Play app domain | App-owned booking/venue routes; control-plane reads must converge on Core |
| Hub modern web | `localhost:4330` | `localhost:4330` local supported origin | Current launcher is modern-only |
| Old Hub web | `localhost:4321` | none | Removed from the Hub Edge allowlist and example/runtime config in HUB-001; baseline evidence is retained |
| Onboarding navigation | Core previously returned `/modern/organize` in one flow | current Hub route contract | Corrected to `/modern` in HUB-001 |

The full route inventory is machine-readable at [`inventory/routes.json`](inventory/routes.json). It includes authentication, authorization, tenant scope, edge exposure, and contract status fields. A route being present in a source file is not proof that it is a supported public route. The inventory is the HUB-000 snapshot; HUB-001 follow-on changes are recorded in [`phase-notes.md`](phase-notes.md).

## Domain semantics and data authority

| Domain concept | Observed meaning | Current data | Target authority | Decision state |
| --- | --- | --- | --- | --- |
| Organization | Account-level control-plane container used by Hub/Core and app membership | `public.organizations` | Core API | **TRANSITIONAL / BLOCKED** because Core, POS, and Play migration/runtime paths overlap |
| Business/brand | A separate concept is implied by `public.brands`, but hierarchy and lifecycle are not fully specified | `public.brands` | Core only if cross-app semantics are approved | **NEEDS PRODUCT/DATA DECISION** |
| Store | Physical or operational site with address/timezone/currency and app enablement behavior | `public.stores` | Core API location control plane | **TRANSITIONAL / BLOCKED**; do not rename to Location in this batch |
| Location | Intended conceptual term for a physical site, but no canonical `locations` table/API was proven | none canonical | Core only after product decision | **NOT IMPLEMENTED** |
| Venue/court | Play-specific operational domain | Play-owned tables/routes | Play | **APP-OWNED**; not a Hub store replacement |
| Store template | Reusable store configuration/duplication behavior | `public.store_templates` | Core API | **CORE WRITER, TRANSITIONAL SCHEMA** |
| Member | User-to-organization relationship | `public.memberships` | Core authorization | **TRANSITIONAL / MULTI-WRITER** |
| Store membership scope | User-to-store relationship | `public.membership_stores` | Core authorization | **BLOCKED / UNKNOWN WRITER** |

A Store currently functions as the shared physical-site key across Hub, POS, and Play. That does not prove that every app's notion of a location is identical. A Store-to-Location migration would change identifiers and semantics, so it is explicitly outside BATCH-HUB-000.

## Table and migration ownership

| Table family | Current migration/runtime writers | Intended owner | Transition procedure | State |
| --- | --- | --- | --- | --- |
| Organization/store/membership public tables | Hub, POS, Play migration trees; Core and POS runtime writes | Core/Infrastructure | Expand → backfill → reconcile → switch writer → observe → read-only old path → remove later | **BLOCKED** |
| Member app assignment | Core runtime writer; app migration trees and app readers | Core | Reconcile identifiers and revocation; then switch readers | **TRANSITIONAL** |
| Member app scopes/roles | Readers exist; complete writer not proven | Core | Identify every writer before any migration | **BLOCKED** |
| Store app access | Core runtime writer; Hub migration history | Core | Verify entitlement/assignment distinction, then reconcile | **TRANSITIONAL** |
| `public.app_sessions` | POS and Play local session managers | none; Core `aevo_app_sessions` is target | Prove adapter-only behavior → switch → observe revocation → read-only → remove later | **BLOCKED** |
| `public.app_authorization_codes` | Legacy migration/compatibility surface | Core `aevo_authorization_codes` | Replay/expiry/audience evidence first | **TRANSITIONAL** |
| Public registry/catalog | `public.apps`, `public.application_registry`, hard-coded consumers | Core registry and declarative manifest | Reconcile app codes/metadata before manifest cutover | **BLOCKED** |
| Billing and entitlement tables | POS writes provider/customer/webhook data; Core reads projections | Billing source + Core projection | Decide source of truth → dual-read/reconcile → switch → observe | **BLOCKED** |
| Audit | Core and POS public audit writers; Core `aevo_audit_logs` scaffold | Core control-plane audit + app-domain extension | Correlate, reconcile, then move writer | **BLOCKED** |
| Devices | Core and POS writers/readers | Core device identity | Reconcile device ownership and revoke semantics | **BLOCKED** |
| Legacy events/outbox | app and database paths; worker consumer incomplete | Core outbox/Worker for approved events | Define taxonomy, replay, idempotency, then migrate | **TRANSITIONAL** |
| Core `aevo_*` tables | Core migration set / Infrastructure execution path | Core/Infrastructure | Preserve as canonical candidates; prove RLS context and app adoption | **TARGET CANDIDATE, NOT FULLY CUT OVER** |

Table-by-table detail, including the seven HUB-005 lifecycle gates, is in [`inventory/tables.json`](inventory/tables.json). Writer/readers evidence is in [`inventory/writers.json`](inventory/writers.json). Those files intentionally use `UNKNOWN` when a writer could not be proven; unknown is not treated as safe.

## Identity, session, and authorization

### Identity

Accounts owns provider-facing identity operations, redirect/PKCE policy, registration, password operations, and logout. Core owns the application identity projection and authorization-facing session issuance. Provider tokens must not be exposed to the browser. Accounts does not grant organization or store permission.

### Session

Core defines app-specific cookies and the `aevo_app_sessions` store. The observed canonical cookies include `aevo_hub_session`, `aevo_admin_session`, `aevo_go_session`, `aevo_play_session`, `aevo_pos_session`, `aevo_kiosk_session`, and `aevo_queue_session`; Digital Sign is recorded but excluded from Hub changes. POS and Play still contain local application-session packages that read/write `public.app_sessions`. This is a dual authority and blocks migration/deletion.

### Authorization

The required decision chain is identity → app assignment → organization membership → store scope → app installation/entitlement → app-domain role/scope. Client organization/store headers are hints, not authority. Edge forwards requests and adds a gateway signature; it does not resolve tenant authorization. Current public-table predicates and Core `aevo_*` RLS policies have not been proven to share a complete transaction context, so tenant isolation is not claimed by this batch.

## Registry, installation, entitlement, and billing

The application code set is shared in `aevo-contracts` (`HUB`, `ADMIN`, `GO`, `PLAY`, `POS`, `KIOSK`, `QUEUE`, `DIGITAL_SIGN`). The Core `aevo_application_registry` is the development canonical registry, while `public.apps`, `public.application_registry`, hard-coded UI lists, and POS compatibility subscription consumers remain transitional. Core installation and provisioning projections are now represented by `aevo_application_installations` and `aevo_provisioning_operations`; Digital Sign remains outside Hub scope.

Store enablement is now Core-canonical in `aevo_store_application_bindings` (HUB-008), while `public.store_application_access` remains a synchronized compatibility projection. It is distinct from organization entitlement, member assignment, and app-domain feature configuration. A store may only use an app after the organization has a valid entitlement and the store binding is explicitly enabled; POS compatibility action/reader cutover and restore evidence remain open gates.

POS still exposes billing portal/webhook routes and verifies provider signatures, but production webhook events now forward to Core. Core owns the immutable `aevo_billing_webhook_events` ledger and canonical `aevo_organization_subscriptions`/`aevo_organization_entitlements` projections; public billing tables remain synchronized compatibility projections until lifecycle, replay, restore, and POS trial-action gates pass.

## Settings, devices, audit, query, and events

| Capability | Current authority | Target boundary | Finding |
| --- | --- | --- | --- |
| Hub settings and app/store feature configuration | Core Hub routes plus app-owned settings | narrowest enforcing owner with typed contract | Partial; no redesign in HUB-000 |
| Go settings/feed configuration | Core admin Go routes and Core tables | Go domain with Core platform config boundary | Existing Core surface; contract synchronization incomplete |
| Devices | Core and POS public device paths | Core identity, app behavior | Multi-writer transition |
| Audit | Core `aevo_audit_logs`, public audit paths, POS logs | Core control-plane audit plus app-domain logs | Duplicate writers |
| Query platform | Historical Hub migrations/schema and skill-defined contract | versioned Query AST/model registry + app adapters | Schema residue and bypass risk; investigate, do not delete |
| Outbox/events | Core outbox scaffold, legacy public outbox, provisioned Pub/Sub/Tasks, disabled worker consumer | Core/Worker only for approved events | Provisioned infrastructure is not proof of active processing |
| Analytics | Core product/feed events and app metrics | projections/read models and app reports | Warehouse pipeline not proven |

The query platform remains subject to the tenant-safe universal query contract. Any future query work must use the query-platform skill and must not become an ad-hoc SQL escape hatch.

## App manifest and plugin safety boundary

The future manifest may declare app code, display metadata, supported contract versions, capabilities, origins, health/handshake endpoints, and installable feature metadata. It must not contain arbitrary remote executable code, a remote script URL that is executed as a trust extension, or an unreviewed permission grant. Runtime adapters remain in the owning app repository. This is the preparation gate for HUB-007 only; no manifest schema or registry mutation is performed here.

## Infrastructure and event authority

Cloud Run, Cloud SQL, IAM service accounts, Secret Manager, Pub/Sub/DLQ, Cloud Tasks, Cloudflare DNS, and observability are provisioned in Infrastructure. Core and Worker service boundaries are identifiable. Pub/Sub/Tasks are provisioned but no active consumer path was proven; Worker `/internal/pubsub` returns not-configured behavior. Migration credentials and app runtime credentials must remain separate. No secrets are included in these inventories.

## Redundancy ledger

The baseline identified 11 redundancy surfaces:

| Count | Classification | Surfaces |
| ---: | --- | --- |
| 1 | Keep but narrow | Public Edge gateway |
| 5 | Consolidate | migration authority, registry/catalog, session authority, entitlement stores, organization/store writers |
| 1 | Remove only after evidence | Hub legacy gateway/adapter |
| 1 | Deprecate after migration | Old `:4321` local origin/config |
| 2 | Investigate | Query platform schema, billing writer |
| 1 | Keep independent | Digital Sign |

The machine-readable list is [`inventory/redundancy.json`](inventory/redundancy.json). It is a lifecycle inventory, not a deletion authorization.

## Contract and coverage authority

`aevo-contracts/src/index.ts` lists 49 Hub route entries and application codes. Core's `HubApiContract.Routes` also lists 49 route entries, and the synchronized `openapi/v1.json` now contains 76 total paths with all 49 Hub route entries represented after placeholder normalization. The artifact is the current development contract authority; endpoint payload schemas remain a follow-on promotion task. No route is removed by this inventory update.

## Required follow-up decisions before any irreversible work

1. Name one migration authority and one writer for every shared control-plane table.
2. Resolve Core `aevo_app_sessions` versus POS/Play `public.app_sessions` and prove adapter-only behavior.
3. Complete provider lifecycle/replay/restore evidence before switching public billing/webhook tables to read-only compatibility.
4. Identify remaining unknown writers for membership-store scope, app scopes, app roles, and POS trial compatibility paths.
5. Approve the Organization → Business/Brand → Store/Location semantic model without renaming Store in place.
6. Prove RLS transaction context for both `public.*` and `aevo_*` paths and then run the HUB-004 tenant-security matrix.
7. Reconcile registry/catalog metadata and publish a versioned contract before manifest-backed installation work.

Until these decisions are evidenced, this ledger remains `BLOCKED`. HUB-001, HUB-002, HUB-004, HUB-005, HUB-006, HUB-007, and later implementation tasks are not started by BATCH-HUB-000.
