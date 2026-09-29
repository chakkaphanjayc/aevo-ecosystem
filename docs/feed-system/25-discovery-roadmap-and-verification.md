# Discovery roadmap, verification, and approval gates

Audit date: 2026-09-27
Status: controlled implementation roadmap. The original direction audit did not start an
implementation batch; the explicitly authorized follow-up has now completed
the contract boundary, a bounded request/session-intent slice, a private
feature-projection guard, a controlled intent-ranking/re-ranking slice, a
typed discovery-config slice, a connected profile projection lifecycle
slice, and a private media cleanup worker boundary.
Runtime personalization, media, public evidence hydration, connected config
lifecycle, authenticated browser evidence, and production rollout remain
separate gates. The Core-owned moderation adapter has now been applied and
verified against the development database, and authenticated negative
feedback is now persisted through a Core-owned development slice; this is not
a production rollout. Generator failure/timeout state now reaches affected
server-owned shelves, and canonical hydration re-checks active negative
feedback for the bound actor; these are controlled Core/development safety
boundaries, not a production freshness or cache-invalidation claim.
The concrete TRACE/PLACE response union is now serialized correctly through
the Core interface boundary, and the local Core-to-Edge-to-Go path has passed
a connected browser smoke; this is local runtime evidence only, not deployed
origin, SLO, or production rollout evidence. A controlled authenticated Go
canonical-Place save projection is now owned by Core, keyed by canonical Place
ID, with CSRF, idempotency, RLS, list, save, unsave, and public-projection
checks; it is not a replacement for the Customer favorites source of truth.

## Controlled implementation follow-up

| Batch | Status | What is implemented | Explicitly not enabled |
| --- | --- | --- | --- |
| `DISCOVERY-001` | VERIFIED FOR LOCAL CONTRACT SLICE | Shared/Core/Go candidate, evidence, safe reason, signal-confidence, metric-family, conservative legacy-event mapping, and entity-only candidate guards with negative tests | New event route names, LIVE ranking, public evidence hydration, media, schema migration, legacy deletion |
| `DISCOVERY-002` | VERIFIED FOR LOCAL REQUEST/SESSION SLICE | URL-owned `vibe/category/date/party` normalization, bounded intent context, cursor fingerprint binding, safe `vibe/category` candidate filters, Go transport/query-key propagation | Durable session table, exact-location retention, booking/availability fan-out, long-term profile writes |
| `DISCOVERY-003` | PARTIAL — CORE MODERATION ADAPTER + FAIL-CLOSED SERVING + TEXT POLICY GUARD + BOUNDED REMEDIATION + PRIVATE MEDIA BOUNDARY | Shared/Core/Go UGC status/kind/reason contracts; TRACE/PLACE eligibility and stale hydration fail closed; Core migration `0034_feed_moderation_adapter_boundary.sql` owns the optimistic moderation adapter; connected RPC test covers atomic review, exact replay, and stale-version conflict; connected Supabase text-policy migrations reject high-confidence explicit sexual text on new/edit Post/Comment RPCs, hold promotional links for review, provide bounded historical remediation, and keep development media in a private quarantine bucket with service-role-only versioned decisions; rejected/deleted assets retain a bounded server-only cleanup plan and the worker deletes only allowlisted private objects | Automated image/video scanning, production storage owner and upload API, approved-variant publication, appeals, cache invalidation, complete multilingual moderation, public evidence hydration, authenticated deployed/browser evidence |
| `DISCOVERY-004` | PARTIAL — PRIVATE TASTE GUARD + CONNECTED PROFILE LIFECYCLE | Existing taste rows are latest-version/cutoff bounded; Core applies minimum evidence, confidence, age decay, future/stale neutral fallback, and keeps values private; Supabase adds service-role-only profile-scoped rebuild/delete RPCs, durable job state, worker task boundary, and account-delete anonymization | Source-level evidence provenance, profile/entity freshness health, production scheduling/observability, authenticated deployed browser evidence |
| `DISCOVERY-006` | PARTIAL — CORE EXPLICIT-INTENT + CONTEXTUAL RE-RANKING + OUTCOME INGESTION + READ-ONLY EVALUATION SNAPSHOT | Core propagates category into the Trace query, matches bounded area/category/vibe facets conjunctively, blends explicit intent with deterministic/SHADOW scoring, applies typed category/area/business caps, carries a signed seen-key window across pages, consumes authenticated Core negative feedback, connected tests prove typed discovery outcomes reach durable stats, and Admin can read bounded aggregate outcome/guardrail counts | Full Candidate V2, durable anonymous persistence, session-level/causal outcome evaluation, deduplication and source freshness/availability quota policy, LIVE serving, authenticated Admin browser evidence |
| `DISCOVERY-006A` | VERIFIED FOR CONTROLLED CONNECTED NEGATIVE-FEEDBACK + HISTORY SLICE | Authenticated Go hide/unhide mutation is bound to app session, signed item token, Feed session, CSRF, idempotency, RLS, and Core-owned migrations `0035`/`0036`; active feedback suppresses TRACE/PLACE candidates, unhide clears suppression, and private append-only history retains the allowlisted transition; private history read route/UI is bounded to the authenticated GO actor; live anonymous entity hide/unhide is explicitly session-local and never calls Core | Durable anonymous persistence, outcome evaluation, deployed/browser evidence, production rollout |
| `DISCOVERY-008` | PARTIAL — TYPED CONFIG + CONNECTED LIFECYCLE SLICE | Shared/Core/OpenAPI/Admin discovery controls for explicit-intent precedence, taste evidence/decay, four bounded TRACE/PLACE-backed modules, evidence freshness, and fail-closed public evidence/media flags; development DB lifecycle now round-trips discovery fields through validate/publish/runtime/rollback; Admin can also read the Core-owned canonical source-health boundary | Public evidence/media pipeline, booking/save/journey projections, availability quota policy, LIVE personalization, authenticated connected Admin smoke |
| `DISCOVERY-007` | PARTIAL — MODULE CONTRACT + INVENTORY-BACKED PORTFOLIO + SOURCE HEALTH + CONTRACT CLEANUP + GRACEFUL SHELF STATE + CONTROLLED CANONICAL PLACE SAVE | Optional entity-first module refs now support `FOR_YOU`, `NEAR_SELECTED_AREA`, `NEW_AND_USEFUL`, and area-scoped `COMMUNITY_FAVORITES`; Core validates the bounded order, reserves module minimums before filling broad shelves, emits only disjoint TRACE/PLACE items, propagates only failed/timeout generator state to affected shelves, Admin exposes order controls, connected Core tests prove both the facade `FOR_YOU` path and a non-empty four-module canonical TRACE/PLACE fixture, the read-only source-health endpoint reports canonical TRACE/PLACE/store-profile availability, eligible counts, and bounded freshness state, and authenticated Go can list/save/unsave canonical Places through the Core-owned interaction projection; stale saved/booking/journey module IDs were removed from the shared/Go/OpenAPI public contract | Availability quota policy, booking/journey projections, public evidence, authenticated deployed/browser evidence, Customer favorites parity/source ownership |
| `DISCOVERY-009` | PARTIAL — CONTROLLED GO INTENT/UI SLICE | Live Go consumes modules, renders entity-only shelves, removes generic composer from live mode, and hides creator-trending panel outside demo | Contextual contribution mutations, public evidence cards, full responsive/device matrix, connected authenticated smoke |
| `DISCOVERY-009-TRACE-ENTRY` | VERIFIED FOR CONTROLLED GO SOURCE CLEANUP | The retired `/traces` list feed now redirects to canonical Core-backed Explore; the unreferenced list component and styles were removed, while `/traces/:traceSlug` detail and Trace Map read compatibility remain | Production origin switch, authenticated deployed/browser smoke, broader legacy data cleanup, and rollout |
| `DISCOVERY-009-CONNECTED-RUNTIME` | VERIFIED FOR CONNECTED LOCAL RUNTIME SMOKE | Core now serializes concrete TRACE/PLACE fields through `IFeedItemContract`; Edge returned `200` with hydrated fields and signed tokens, Go rendered 8 live items plus the `FOR_YOU` module shelf, and `/traces` redirected to canonical Explore. Core 166/166, Go 45 files/161 tests/build, and Contracts 54 tests/224 expectations passed | Deployed authenticated browser evidence, production origin switch, performance/load acceptance, public media/evidence owner, and rollout |

These are controlled source and test results, not a production rollout claim.
TraceDee/Supabase remains the canonical moderation domain during transition;
Core owns the server-to-server adapter and optimistic version boundary. Core
also owns the new Feed negative-feedback state and mutation boundary. The next
connected gate remains the unresolved `DISCOVERY-003` production media/evidence
boundary: a named storage/variant owner, automated image/video scan,
approved-variant publication, appeal lifecycle, cache invalidation, and
authenticated deployed/browser evidence are still required. The new text
guard is a deterministic high-confidence first layer only; it does not claim
complete multilingual text moderation or image/video safety. A bounded
service-role remediation RPC now moves matching historical public Post/Comment
rows to `UNDER_REVIEW` and records an operator run; it never hard-deletes
content or changes canonical Place/Trace rows. Rejected/deleted development
media now retains a server-only cleanup plan and the worker records completion
only after private Storage deletion; public media remains disabled.
The local Core feature guard is now paired with a connected development
profile rebuild/delete pipeline: a private Supabase job can rebuild one
profile's derived scores, delete its discovery state, and preserve an
anonymized append-only event ledger when the account is deleted. This still
does not imply source-level evidence provenance, profile/entity freshness
health, production scheduling, or a deployed browser path. The connected
module smoke proves the current bounded TRACE/PLACE portfolio path, but does
not imply source freshness/availability health, booking/journey projections,
or public evidence. The canonical Place save projection is a separate
controlled interaction slice and does not establish Customer favorites parity
or production route ownership.

## Latest connected Admin runtime gate

The standalone `aevo-admin` runtime now has a repeatable authenticated Feed
smoke at `scripts/check-feed-admin-runtime.ts`. It verifies the Admin session
and platform permission, Core-backed Feed config/guardrail/propagation/
revision/event-health/discovery-evaluation/projection-health/moderation reads,
the config payload shape, SSR for `/go/feed`, `/go/feed/moderation`, and
`/go/settings`, plus the anonymous redirect boundary. The connected run on
2026-09-26 passed all checks through the canonical local launcher (Accounts,
Core, Edge, and standalone Admin) without mutating Feed, config, moderation,
or user data:

```bash
cd /Users/jayc/Project/aevo-ecosystem/aevo-hub
bun run scripts/dev-admin.ts

# In a second terminal, while the launcher is running:
bun run ../scripts/check-feed-admin-runtime.ts
```

The canonical local launcher is wired to standalone `aevo-admin` on `:4335` and
starts the Accounts provider on `:8787`, Core on `:5099`, and Admin Edge on
`:4001`; the transitional workspace remains available only for
compatibility/parity until the production-origin switch and rollback evidence
are complete. A real
backwards-compatible SSR defect found by this gate was fixed: legacy active
Feed revisions without a `discovery` object now receive the typed safe default
instead of crashing the Admin route.

## Phase audit: preserve historical truth

The statuses below are based on the local `docs/feed-system/phase-notes.md`,
the authoritative root plan, checked source, and the recorded test evidence.
“Controlled” means the specified local slice passed; it is not a production
deployment claim.

| Phase | Documented/local status | Tests/evidence | Production readiness | Direction impact |
| --- | --- | --- | --- | --- |
| FEED-000 | VERIFIED/accepted ADR gate | ownership/security/documentation evidence in phase notes | Not a production deployment gate | EXTEND: discovery entity/evidence owner must be added to ADR follow-up |
| FEED-001 | VERIFIED contract boundary | contracts/Core/Edge checks recorded | Public origin/rollout remains separate | EXTEND: freeze Place/Trace/evidence/reason contract |
| FEED-002 | VERIFIED Core config control plane | config lifecycle/migration and validation evidence | Runtime deployment/propagation still gated | EXTEND: add typed discovery sections, retain bounded lifecycle |
| FEED-003 | VERIFIED facade/session | authenticated/anonymous/cursor/config evidence | deployed Edge/Core smoke remains separate | KEEP: FeedSessionContext is the base for intent/session split |
| FEED-003A | VERIFIED database/auth integration | migration apply/verify, DB integration, RLS, outbox, HTTP smoke | environment-specific deployment still separate | KEEP: ownership/RLS gates remain mandatory |
| FEED-004 | VERIFIED TRACE+PLACE generators | Core build/unit/DB/HTTP mixed-feed evidence | production route switch not claimed | KEEP/EXTEND: sources remain discovery candidates |
| FEED-005 | VERIFIED ranking/calibration/diversity/exploration | 50/50 unit and DB/HTTP overlap evidence | live personalized serving still gated | EXTEND: formal intent hierarchy, modules, evidence confidence |
| FEED-006 | VERIFIED Core controlled event pipeline | Core/worker/event intake/outbox/consumer checks | deployed Pub/Sub, coverage, rollout separate | EXTEND: add discovery semantic events and retention policy |
| FEED-007 | VERIFIED Core serving projection slice | projection integration, EXPLAIN/index/concurrency evidence | broader load/SLO campaign separate | EXTEND: entity/evidence/profile projection only where justified |
| FEED-008 | VERIFIED test-client slice | Go typecheck/test/build; Core-only adapter/event checks | production route switch/browser backend smoke separate | REVISE: client types/demo must not imply Post/Tracer live candidates |
| FEED-009-READ | VERIFIED controlled read slice | Admin/contracts read checks and SSR smoke | connected/authenticated deployment separate | KEEP: Admin is control-plane base |
| FEED-009-MUTATION | VERIFIED controlled mutation slice | Admin/Core/contracts checks; 105 Core tests; local SSR smoke | DB-backed lifecycle/auth browser evidence open | KEEP: reuse typed publish/rollback for discovery config |
| FEED-009-MODERATION | VERIFIED controlled moderation slice | 108 Core tests; static migration checks; stubbed BFF/browser smoke | DB/RPC/RLS/deployed browser, propagation, legacy cleanup open | EXTEND: media/relevance/authenticity/appeal controls required |
| FEED-010 | partial connected moderation adapter + facade/hydration safety; full safety hardening open | Core migration/RPC/idempotency/version-conflict evidence recorded; public facade drops candidate/hydration identity or concrete-contract mismatches and re-issues Core-signed item tokens; canonical TRACE/PLACE hydration re-checks active actor feedback; no public UGC/media enablement | not ready for production | REVISE into discovery safety/media/evidence work with a named storage owner |
| FEED-011 | planned post-V1 expansion | no completed phase evidence | not ready | DEPRECATE as generic Post/Tracer expansion; replace with evidence-first work |
| FEED-012 | planned production rollout/runbook | no completed phase evidence | not ready | KEEP as final shadow/canary/production gate |

Historical notes must not be edited to claim that a future direction was part
of an older phase. The new documents and root revision record the impact
without renumbering or rewriting completed evidence.

## New phase sequence

The new namespace is intentionally separate from FEED history.

### DISCOVERY-001 — Discovery entity, evidence, signal, and success contract

**Goal.** Freeze the `PLACE`/`TRACE` candidate boundary, community-evidence
boundary, discovery event taxonomy, safe reason codes, success metrics, and
guardrails before runtime changes.

**Why.** Current Core is TRACE/PLACE-only, but Go demo/client types still
include POST/TRACER and the current event vocabulary does not distinguish
confidence. A contract prevents accidental social-feed drift.

**Reuse.** `aevo-contracts` Feed schemas, Core Feed contract/config, Go
adapter/event tests, TraceDee activity/outbox and phase notes.

**Repositories/files likely affected.** Root docs; `aevo-contracts` Feed
types/OpenAPI; Core Feed contract/validator/tests; Go adapter/event tests. No
database migration.

**Database/API/config/events/UI.** No schema. Add only versioned contract/test
coverage if approved; do not change public serving or Explore UI. Define event
names and reason mappings without enabling new collection.

**Security/privacy.** Preserve app-scoped Core authority, no precise location,
no browser secrets, no raw score/private affinity fields.

**Dependencies.** This audit, ADR-000, FEED-001/002/003/005/006/009 gates.

**Steps.** Inventory canonical entity IDs; define candidate/evidence union;
map existing events; define confidence classes and outcome/guardrail owners;
write negative contract tests; document external-policy decisions.

**Tests/acceptance.** Core public response can only contain approved candidate
types; POST/TRACER adapter drift fails tests; reason codes are allowlisted;
event metadata has privacy bounds; product/data/trust owners accept metrics.

**Rollback/risk/complexity.** Docs/contracts revert without data rollback;
medium product ambiguity; **M**. Out of scope: ranking, UI, migrations,
media, LIVE personalization, legacy deletion.

### DISCOVERY-002 — Explicit intent and session context

**Goal.** Make query, area, vibe, category, time, availability, map context,
and bounded recent interactions an explicit server-owned context hierarchy.

**Why.** Current URL controls are partly client/demo filters; long-term taste
must not override a request such as “Japanese dinner in Thonglor”.

**Reuse.** `FeedSessionContext`, signed cursor/cutoff, Go URL state, Trace Map
URL state, existing event session IDs.

**Repositories/files likely affected.** Core Feed request/session normalizer and
tests; contracts; Go `explore-page.tsx`, `feed-api.ts`, map URL adapter;
possibly Edge route schema. No new distributed session table by default.

**Database/API/config/events/UI.** Extend request/session contract for approved
facets; keep request-local/session state; add event mapping for search/filter/
area/vibe/map commit only after privacy review; add config for precedence.

**Security/privacy.** Coarse location only for retained context; exact map
coordinates remain operational; no silent profile writes.

**Dependencies.** DISCOVERY-001; FEED-003/008.

**Tests/acceptance.** Explicit intent wins over taste in deterministic fixtures;
cursor restarts when intent changes; anonymous and authenticated requests use
the same safe contract; precise location does not enter event/public reason.

**Rollback/risk/complexity.** Disable new facets and use existing query/area
contract; medium URL/API compatibility risk; **M**. Out of scope: profile
materialization, ranking weights, module shelves.

### DISCOVERY-003 — UGC policy, evidence, and media safety boundary

**Goal.** Make community evidence safe, relevant, authentic, and private until
approved; define the media lifecycle and scoped UGC policy.

**Why.** Current reports/states/audit are useful but no inspected TraceDee
media quarantine or automated text/image/relevance pipeline is proven.

**Reuse.** TraceDee lifecycle/report/moderation functions, Core/Admin
FEED-009 routes, RLS/security boundary, existing event/outbox.

**Repositories/files likely affected.** Named migration owner (to be approved),
Core eligibility/hydration, contracts, worker/media owner, aevo-admin safety,
Go detail contribution states. Exact files/provider remain a design decision.

**Database/API/config/events/UI.** Eventual media asset/attachment/policy/
evidence projection only after owner approval; public upload intent and safe
status contract; moderation outcome/invalidation events; detail UI states.

**Security/privacy.** Private object by default, no public URL before approval,
service-role isolation, RLS, PII/NSFW/illegal-content policy, audit/appeal
decision, deletion and cache invalidation.

**Dependencies.** DISCOVERY-001; FEED-009-MODERATION connected DB/RPC gate;
security/privacy/legal and storage owner approval.

**Tests/acceptance.** Quarantine-to-approved lifecycle; unsafe/unknown state
fails closed; policy scope suppresses cached/new content; owner delete/reject
revokes public variants; moderation action propagates; no precise/private
evidence leaks.

**Rollback/risk/complexity.** Disable UGC/media source and serve canonical
Place/Trace; high trust/privacy risk; **XL**. Out of scope: generic Post Feed,
ML moderation vendor selection, broad account suspension until approved.

### DISCOVERY-004 — Profile and entity discovery feature projections

**Goal.** Produce versioned, confidence/freshness-aware long-term taste and
entity features without duplicating canonical domain state.

**Why.** Existing taste/quality/projection data is useful but not yet a clear
discovery profile/evidence contract.

**Reuse.** `tracedee_taste_affinities`, profile/expertise scores,
`tracedee_content_quality_scores`, `aevo_feed_item_metrics_projection`, public
store profiles, TraceDee completions/ratings.

**Repositories/files likely affected.** Core data port/projection reads, worker
consumer/projection jobs, contracts/internal types, Admin health views. Schema
only if an approved owner proves an existing projection cannot be extended.

**Database/API/config/events/UI.** Prefer projection/version fields over a new
table; no public raw vector. Add profile/entity version/freshness to internal
health/evaluation, not public response. Consume qualified events asynchronously.

**Security/privacy.** Actor deletion/rebuild, anonymous isolation, no purchase
details, bounded profile access, tenant/app boundaries.

**Dependencies.** DISCOVERY-001/002/003; FEED-006/007; projection owner.

**Tests/acceptance.** Minimum evidence, decay, missingness, delete/rebuild,
stale fallback, profile/entity consistency, no impression-only strong taste.

**Rollback/risk/complexity.** Disable projection reads and use deterministic
neutral features; medium data quality risk; **L**. Out of scope: embeddings,
vector DB, ML profile.

### DISCOVERY-005 — Candidate Generation V2 and entity calibration

**Goal.** Add bounded Place/Trace source generators and normalize their raw
features before mixed scoring.

**Why.** Existing `trace-v1`/`place-v1` are a sound base but do not expose the
full intent/evidence/availability source separation needed for discovery.

**Reuse.** Core generator interfaces/budgets, canonical store queries,
eligibility filters, place identity adapter, projection health, existing cursor.

**Repositories/files likely affected.** Core `FeedCandidateGenerators.cs`,
`FeedCanonicalDataStore.cs`, ranking/config contracts/tests; possibly worker
projection adapters. No Play/POS canonical state duplication.

**Database/API/config/events/UI.** Internal source metadata/config budgets;
public response remains TRACE/PLACE; no SERVICE/EVENT unless a separate domain
decision proves it. Candidate source telemetry is internal/admin.

**Security/privacy.** Eligibility before/after hydration, tenant-safe store
profile, no exact location/public debug fields.

**Dependencies.** DISCOVERY-002/003/004; FEED-004/005/007.

**Tests/acceptance.** Generator isolation/budget/timeouts, canonical dedupe,
Place/Trace calibration, source domination, query plans, safe degradation,
pagination stability, no POST/TRACER candidate injection.

**Rollback/risk/complexity.** Disable V2 source individually and fall back to
existing generators; high query/performance risk; **L**. Out of scope: LIVE
personalized ordering and modules.

### DISCOVERY-006 — Contextual ranking, reasons, and re-ranking

**Goal.** Serve explainable deterministic personalization in SHADOW first,
with explicit intent hierarchy, calibration, negative feedback, and diversity.

**Why.** Existing Core already has deterministic and shadow ranking; the
revision makes the semantics discovery-first and adds a separate re-rank stage.

**Reuse.** `FeedRankingPipeline`, `FeedDiversitySelector`, versioned Feed config,
reason code contract, stable seed/cursor.

**Repositories/files likely affected.** Core ranking/re-ranking/config,
contracts, tests, Admin read/health surface; Go reason localization tests.

**Database/API/config/events/UI.** Typed bounded weights/versions and reason
codes; shadow evaluation records; no raw scores public; no UI route switch in
this phase.

**Security/privacy.** No private affinity disclosure, no sensitive location,
no business/creator manipulation override, auditable config.

**Dependencies.** DISCOVERY-004/005; FEED-005/009.

**Tests/acceptance.** Intent beats taste, entity calibration, diversity/seen/
lineage rules, deterministic tie-break, shadow no-serve mutation, reason
correctness, rollback to deterministic baseline.

**Rollback/risk/complexity.** OFF/kill switch and baseline rank; high product
trust risk; **L**. Out of scope: ML ranker, live canary.

### DISCOVERY-007 — Module selector, public evidence, and graceful shelves

**Goal.** Replace one social-looking stream with server-owned discovery modules
that contain Place/Trace entities and bounded evidence.

**Why.** Sidebars already imply modules, but selection is currently UI/demo
composition rather than a server contract.

**Reuse.** Core selection/order/cursor, evidence projection, Go card/module
primitives, booking route and map link.

**Repositories/files likely affected.** Core module selector/public contracts,
contracts/OpenAPI, Go discovery card/shelf rendering, Admin module controls.

**Database/API/config/events/UI.** Module IDs/order/quotas/reason codes;
evidence block/public field allowlist; optional booking module health; no
per-card availability calls.

**Security/privacy.** Evidence eligibility/public variants; safe fallback when
module data is missing; no moderation/private fields.

**Dependencies.** DISCOVERY-003/005/006; FEED-007.

**Tests/acceptance.** Module fill/fallback, no entity repetition, booking/evidence
outage, anonymous/cold-start, public contract, cursor/module consistency,
responsive Web/PWA/Capacitor rendering.

**Rollback/risk/complexity.** Serve existing flat TRACE/PLACE list; medium
presentation/API risk; **L**. Out of scope: creator/post modules as primary.

### DISCOVERY-008 — Admin personalization, modules, evidence, and safety controls

**Goal.** Extend the existing typed Core/Admin lifecycle so operators can
observe and change discovery behavior without code or SQL.

**Why.** Discovery config is unsafe if only code or legacy flags can change it.

**Reuse.** `go-feed.tsx`, Core `FeedConfigService`, validation/publish/rollback,
moderation route, permissions/audit/hold-to-confirm.

**Repositories/files likely affected.** `aevo-admin`, `aevo-core-api`,
`aevo-contracts`, Admin tests/OpenAPI, docs. No new Hub admin Feed control.

**Database/API/config/events/UI.** Typed personalization/source/ranking/
diversity/module/evidence/safety/measurement fields; health and audit links;
no arbitrary SQL/code.

**Security/privacy.** ADMIN app-scoped session; `go.settings.manage`,
`content.moderate`, `go.analytics.read`; CSRF/idempotency/version/audit;
platform/org separation.

**Dependencies.** DISCOVERY-001/003/006/007; FEED-009.

**Tests/acceptance.** Bounds/defaults, unknown field rejection, permission,
rollback, degraded Core, race/version conflict, no credential leakage, mobile/
keyboard/high-impact controls.

**Rollback/risk/complexity.** Hide new controls and preserve last-known config;
medium operational risk; **M**. Out of scope: arbitrary operator SQL.

### DISCOVERY-009 — Aevo Go discovery UI and contextual contribution migration

**Goal.** Make Explore communicate intent and discovery outcomes, while moving
community contribution into Place/Trace/Journey contexts.

**Why.** Current UI is technically Core-only live but its demo vocabulary still
models Post/Tracer as peer Feed items.

**Reuse.** Existing Explore/master-detail, URL state, cards, map, booking,
Trace detail, comments, optimistic/degraded/accessibility primitives.

**Repositories/files likely affected.** `aevo-go` discovery components,
contracts/adapters, tests/styles; no Core ranking logic in browser.

**Database/API/config/events/UI.** Consume module/evidence/reason contracts;
contextual contribution routes; update event semantics; no direct Supabase.

**Security/privacy.** Server-authoritative publish/edit/delete/report,
media quarantine state, no fake booking, no private reason fields.

**Dependencies.** DISCOVERY-001/002/003/007/008; connected environment smoke.

**Tests/acceptance.** Entity-only For You, Post/Tracer regression, intent
override, cold-start/degraded/booking failure, detail contribution, Web/PWA/
Capacitor accessibility and browser runtime smoke.

**Rollback/risk/complexity.** Keep compatibility card/detail routes and disable
new modules; medium UX migration risk; **L**. Out of scope: deleting legacy
data or rewriting Trace detail history.

### DISCOVERY-010 — Shadow evaluation, canary, production rollout, and cleanup

**Goal.** Compare deterministic and personalized discovery, then release only
with evidence, guardrails, rollback, and named operations ownership.

**Why.** Build success, HTTP 200, or local demo behavior is not production
readiness.

**Reuse.** Core event/outbox/worker/health, Admin config rollback, existing
phase acceptance gates, infrastructure Pub/Sub/dead-letter/Cloud Run.

**Repositories/files likely affected.** All connected Feed owners,
`aevo-infrastructure`, Core/worker/Admin/Go operational paths and runbooks.

**Database/API/config/events/UI.** No destructive legacy cleanup until export,
dependency, parity, and rollback evidence; canary config/metrics; production
route switch only after authenticated origin/browser checks.

**Security/privacy.** App-scoped sessions, RLS, secret isolation, event
retention, suppression propagation, audit, legal/privacy sign-off.

**Dependencies.** All prior discovery phases; FEED-010 safety hardening,
FEED-012 deployment/observability gates; product/trust/privacy/ops approval.

**Tests/acceptance.** Shadow no-serve, outcome/guardrail comparison, canary,
load/SLO, event coverage/dead letter, moderation/appeal/propagation, rollback,
authenticated browser/runtime, Web/PWA/Capacitor, incident tabletop.

**Rollback/risk/complexity.** Publish deterministic baseline and disable modules
or sources; high operational/product risk; **XL**. Out of scope: irreversible
legacy deletion without a separate approved cleanup batch.

## Parallel work map

After `DISCOVERY-001` is accepted:

```text
                         DISCOVERY-001
                               |
            +------------------+------------------+
            |                  |                  |
       DISCOVERY-002     DISCOVERY-003      DISCOVERY-008
       intent/session    UGC/media safety   Admin design
            |                  |                  |
            +---------+--------+------------------+
                      |
                DISCOVERY-004
             profile/entity projections
                      |
                DISCOVERY-005
             candidate V2/calibration
                      |
                DISCOVERY-006
             rank/re-rank/reasons
                      |
                DISCOVERY-007
             modules/evidence
                      |
                DISCOVERY-009
             Go UI/contribution
                      |
                DISCOVERY-010
             shadow/canary/production
```

Documentation, contract review, query-plan review, Admin information
architecture, and UI screen design can proceed in parallel when file
ownership is disjoint. Runtime changes must not bypass the preceding safety,
contract, or migration gate.

## Revised V1 / V2 definitions

### Discovery V1

Discovery V1 is the smallest trustworthy product boundary:

- canonical candidates: `PLACE`, `TRACE`;
- explicit area/query/category/vibe intent where the server contract supports it;
- deterministic ranking, stable pagination, eligibility, block/mute, and
  diversity;
- safe localized reasons;
- concise Place/Trace cards with optional approved evidence;
- map, plan, and canonical booking links;
- anonymous discovery and deterministic cold start;
- no generic Post/creator candidate, no ML/vector/LLM modules, no unmoderated
  media publication.

### Personalized Discovery V1

Personalized Discovery V1 adds:

- explicit intent precedence;
- bounded session preference;
- explainable long-term taste with evidence/confidence/decay;
- geographic context separation;
- Place/Trace entity calibration;
- deterministic contextual score and re-ranking;
- seen suppression, category/area/business/lineage diversity;
- server-owned discovery modules;
- SHADOW -> canary -> LIVE controls;
- community evidence confidence and verified-experience labels only when
  trustworthy.

### V2

V2 may evaluate richer collaborative/item similarity, additional canonical
entities, advanced availability/Service sources, improved media/evidence
projections, and ML retrieval/ranking only after V1 demonstrates adequate
event coverage, trust, latency, and data volume. It is not an automatic
permission to add a vector database or an LLM.

## Performance and scale constraints

- candidate generators query bounded indexed/projection paths in parallel;
- feature hydration is batched by entity/source, not one remote call per card;
- community evidence is precomputed or batch-hydrated, not N+1 review queries;
- availability is a bounded projection/module dependency, not per-candidate
  synchronous booking calls;
- event writes remain asynchronous through Core intake/outbox/worker;
- profile/entity projections have freshness, version, rebuild, and last-known-
  good behavior;
- module selection operates on a bounded ranked inventory;
- queries have explicit timeout/budget/degraded behavior;
- `EXPLAIN`, representative production-shaped load, and cross-source identity
  dedupe are acceptance evidence, not optional cleanup.

## Failure-mode acceptance

| Dependency failure | Safe result |
| --- | --- |
| Personalized profile | deterministic Place/Trace using explicit intent/session |
| Session context | request intent + local quality/diversity |
| Profile/entity projection | neutral/missing feature; no false reason |
| One candidate generator | remaining safe generators; internal degraded flag |
| Moderation/eligibility unknown | fail closed for affected UGC/source |
| Media scan/quarantine | asset remains private; no public card media |
| Evidence read model | entity served without evidence block |
| Booking/availability | omit bookable module/CTA; keep discovery |
| Event pipeline | Feed serves; retry/dead-letter asynchronously |
| Config | last-known-good validated snapshot or OFF baseline |
| Map | Feed remains; map surface explains unavailable context |

## Test strategy update

### Semantics and contract

- `POST`/`TRACER` cannot accidentally become Core public candidates;
- Review/Photo/Comment are evidence/detail objects, not standalone V1 items;
- only canonical Place/Trace IDs are hydrated;
- public reasons are allowlisted and localized;
- public responses do not contain raw scores, private affinity, precise geo,
  moderation snapshots, or booking/purchase details.

### Personalization

- explicit intent overrides conflicting historical taste;
- session adapts faster than long-term profile;
- profile decay, minimum evidence, confidence, missingness, deletion/rebuild;
- impression alone cannot create strong interest;
- cold-start/anonymous/authenticated behavior;
- negative feedback and abuse-resistant repeated skip;
- SHADOW computes but does not mutate served order.

### Candidate/ranking/re-ranking

- generator budgets/timeouts/degraded paths;
- Trace/Place entity calibration and source domination;
- eligibility before rank and after hydration;
- stable cursor/cutoff/seed under insertion;
- seen/entity/area/category/business/lineage diversity;
- module quotas/fill/fallback and reason correctness;
- deterministic rollback to baseline.

### UGC/safety/privacy

- explicit sexual/adult, nudity, graphic violence, hate/harassment, PII,
  illegal/dangerous, spam, fake/review-bomb, off-topic, duplicate and
  promotional abuse are not public;
- media remains private until approved and becomes inaccessible after reject,
  delete, removal, or account deletion;
- unknown moderation/media state fails closed;
- scoped Place UGC restriction propagates to cache/read models;
- bounded comments, helpful/report/edit/delete/version conflicts;
- verified experience reveals only an approved public label;
- exact location is operational only; coarse context is the retained boundary;
- anonymous data is not silently linked into a durable profile.

### Booking and runtime

- no fake availability or success;
- availability outage removes only booking-dependent UI;
- hold/confirm/idempotency remain server authoritative;
- event retry/duplicate/dead-letter behavior;
- authenticated Core/Admin browser smoke against a connected environment;
- Web/PWA/Capacitor interaction and reduced-motion/accessibility checks.

## Highest-risk decisions

1. Who owns the canonical Place review/evidence model?
2. Who owns media storage, scanning, variants, deletion, and public URL policy?
3. What trust source qualifies as `Verified visit` without exposing purchase data?
4. What is the authoritative moderation/appeals policy and classifier boundary?
5. Which booking availability projection can satisfy Feed freshness without
   per-item remote calls?
6. What event/retention/anonymous-profile policy is approved by privacy/legal?
7. When is event coverage and traffic volume sufficient for LIVE personalization?
8. What is the exact public Place identity mapping across `tracedee_places`,
   `customer_store_profiles`, store, venue, and booking IDs?

## Product-owner approvals required before implementation

- accept “TraceDee is discovery, not a generic social network” as the product
  boundary;
- accept PLACE/TRACE-only first-class Feed V1 and POST/TRACER evidence/provenance
  treatment;
- accept no NSFW mode and the explicit sexual/adult/unsafe UGC policy;
- select the canonical owner for Place reviews, media, verification, and
  scoped UGC policy;
- approve privacy/retention classes and anonymous behavior;
- approve discovery outcome/guardrail metric ownership;
- approve the `DISCOVERY-*` namespace and the proposed dependency order;
- approve the exact migration owner before any schema change;
- approve legacy composer/Trending Tracers de-emphasis and the compatibility
  period before any deletion/cleanup;
- approve when Core connected DB/RPC and authenticated browser evidence is
  sufficient to change FEED-009 from controlled to environment-complete.

## Exact next implementation batch

`DISCOVERY-001` and the bounded `DISCOVERY-002` request/session slice are now
implemented and verified locally. A controlled Go slice of `DISCOVERY-007` and
`DISCOVERY-009` is also complete: module refs are resolved only against
server-issued TRACE/PLACE tokens, live mode uses an intent surface instead of
the demo generic composer, and the flat fallback remains available. The Core
module selector now has a bounded source/contract portfolio for four
TRACE/PLACE-backed modules, with Admin order controls and tests. The connected
development smoke now proves a non-empty four-module response
from scoped canonical TRACE/PLACE fixtures. The connected Core
moderation-adapter slice of `DISCOVERY-003` is also verified in development;
the source-health read boundary is now implemented and connected through Core,
contracts, Admin, and the canonical runtime smoke. The controlled canonical
Place save projection is also implemented through Core and Go with connected
RLS/idempotency/reversibility tests. The remaining implementation gates are
the availability quota policy, booking/journey projection ownership,
media/evidence owner boundary, Customer favorites parity, and authenticated
browser evidence.

TraceDee/Supabase is the canonical moderation owner during the transition and
Core owns the adapter migration. The media/storage/variant owner is still not
named, so no upload table, public media URL, public evidence hydration, or
generic Post Feed may be enabled. The new save projection is development-only
until its target environment is migrated and browser evidence is captured; it
does not delete or rewrite legacy favorites. No broad legacy data was deleted.
Continue with the safe TRACE/PLACE baseline until the owner, RLS/asset
lifecycle, connected portfolio health, and authenticated deployed/browser
evidence are available.
