# Aevo Feed implementation plan

Audit snapshot: 2026-09-27

Status: controlled implementation in progress. FEED-000 through FEED-006 are verified for their controlled gates; the FEED-007 Core serving-projection slice is verified for its controlled gate; FEED-008 has a verified Core-only Aevo Go Explore test-client slice, unreferenced legacy Explore source cleanup, old `/traces` list-entry redirect cleanup, and a connected local Core-to-Edge-to-Go runtime smoke with concrete payload serialization; FEED-009-READ, FEED-009-MUTATION, and FEED-009-MODERATION have verified aevo-admin Feed control slices. BATCH-FEED-006 closes the Core event specification, bounded intake, signed session/item-token validation, idempotency, durable outbox/inbox, daily stats consumer, retention/dead-letter controls, contract publication, and worker forwarding. The Core moderation adapter is now applied and verified in the development database. A bounded read-only discovery outcome/guardrail snapshot is now exposed to Admin as ingestion-only evidence, the connected Supabase profile projection lifecycle now supports scoped rebuild/delete jobs plus account-delete anonymization, connected Supabase text policy now rejects high-confidence explicit sexual text before new/edit Post/Comment content can become public and provides a bounded historical remediation run, and a private development media quarantine boundary now fails closed before any public variant exists; rejected/deleted media now also has a server-only cleanup plan and worker propagation path. Core now exposes typed canonical source-health status for TRACE/PLACE/store-profile inventory, propagates generator failure/timeout state to affected discovery modules, re-checks active Core negative feedback during TRACE/PLACE hydration, rebinds public item tokens only after candidate/hydration type and identity checks, and serializes the concrete TRACE/PLACE union fields required by the Go parser. The shared/Go/OpenAPI module contract now exposes only the four modules backed by the connected TRACE/PLACE inventory; stale saved/booking/journey module IDs are no longer parseable. The standalone aevo-admin Feed routes now pass a connected authenticated local runtime smoke, including the legacy-config SSR fallback, source-health payload, and canonical local launcher boundary; production Terraform now wires the Core cursor secret and separate Feed event worker token contract, and Core/Worker production-like readiness now fails closed when Feed secret/origin wiring is missing, but values are not provisioned and no deploy has been executed. Causal attribution, availability quota policy, LIVE activation, client production enablement, deployed Pub/Sub/worker scheduling, complete FEED-010 suppression/privacy hardening, deployed authenticated browser evidence, automated media scanning, public evidence/media enablement, performance/load acceptance, and production rollout remain separate.

The controlled Core-owned authenticated canonical Place save projection is now
implemented for the Go test client with list/save/unsave routes,
public-projection gating, CSRF, idempotency, RLS, and exact reversibility. It
is an interaction projection, not the Customer favorites source of truth;
target-environment migration, deployed browser evidence, parity/ownership,
and production route rollout remain separate.

The canonical Go Map `Saved` filter is now Core-authoritative as well. Canonical
Map/Search requests send only an allow-listed `savedOnly` boolean; Core resolves
the GO session and saved canonical Place IDs, applies a parameterized projection
filter, binds saved Search cursors to the session principal, rate-limits the
personalized read, and disables public caching. Public Map/Search behavior is
unchanged when the filter is absent. Authenticated deployed browser evidence,
target-environment migration, Customer favorites parity/source ownership, and
production route rollout remain separate gates.

A controlled Core-owned reconciliation boundary is now available for the legacy
Customer favorites source during development/test maintenance. The privileged
`POST /api/v1/admin/go/feed/saved-places/reconciliation` route supports
`DRY_RUN`, `MIGRATE`, and explicitly confirmed `MIGRATE_AND_DELETE` modes with
bounded scope/limit, idempotency, audit, and an operator reason. It maps only
through an active, verified, primary, non-revoked `store_id` relationship to a
canonical Place; it never infers identity from names or slugs. A legacy row is
eligible only when the canonical identity and public projection checks pass,
while destructive deletion is exact-key and transactional after canonical save.
This is a controlled development/test maintenance path, not a claim that all
legacy rows are migrated or that production cleanup is approved. Customer
Gateway ownership/parity, target-environment migration, rollback/export policy,
deployed authenticated evidence, and production rollout remain open gates.

ARCHITECTURE REVIEW REVISION

This revision incorporates the updated architecture review. FEED-000 and its ADR are now mandatory before FEED-001. The first release is explicitly TRACE + PLACE, deterministic, SHADOW-only for personalization, and does not require full session materialization.

## Outcome

Build a server-owned Feed/Discovery delivery layer for Aevo Go that can safely mix public traces and places first, then add posts and creators when their moderation, privacy, and media contracts are ready. The Feed must support deterministic ranking, controlled personalization, diversity, stable pagination, explainability, event measurement, Admin configuration, and multi-repository contracts without moving ranking logic into the browser.

The first release is not a blank-slate recommendation rewrite. It preserves the existing TraceDee domain and ranking foundation, moves the current browser interleaving behind one API, and closes the control-plane/data-plane split that would otherwise make rollout unsafe.

## Current architecture and functionality

### What exists

- Aevo Go is a React/Vite Web/PWA/Capacitor client, not a Next.js app. It calls a typed Customer Gateway and keeps Supabase service credentials out of the client.
- The live Explore page requests TraceDee traces and public place discovery independently, then alternates the arrays in aevo-go/src/features/discovery/explore-page.tsx.
- TraceDee has first-class traces, stops, places, follows, saves, journeys, ratings, posts, comments, reports, notifications, blocks, mutes, projections, idempotency, moderation, and ranking evaluation tables/functions in the visible Supabase migration set.
- The TraceDee SQL feed function returns TRACE items only. The Go TraceDee response contract is TRACE-only.
- The discovery card UI can render TRACE, PLACE, POST, and TRACER, but the live server response does not provide a universal envelope for those variants.
- The existing TraceDee ranking path has deterministic scoring, taste personalization in SHADOW/LIVE modes, stable-hash cohort rollout, quality/taste projections, ranking evaluations, and guardrail reports.
- PostGIS geography and a visible/limited-place GiST index exist. Public store discovery validates bounded map boxes.
- RLS is enabled on the visible TraceDee tables and service-role-only RPC access is used for server operations.
- aevo-admin is the intended standalone privileged control plane and already owns the Core API BFF/session boundary.
- GCP Pub/Sub, dead letters, Cloud Tasks, Cloud Run, Cloud SQL, secrets, and observability modules exist in infrastructure.

### What is incomplete

- The live client/Edge deployment has not switched to the new Core Feed route yet. Core now exposes the matching public handler for controlled smoke, while the compatibility Go composition path remains unchanged.
- aevo-hub no longer owns a canonical API, so its Supabase repositories cannot be assumed to be a public gateway.
- Two config stores exist: Core aevo_go_feature_flags and Supabase tracedee_feature_flags. The current Core feature-flag update request does not include config, while the transitional ranking UI submits config.mode.
- The current Go Feed is not a server-owned mixed feed; the browser owns composition, deduplication, and page behavior.
- The current Go Feed cursor/composition path remains the compatibility implementation; the new Core Feed path now uses signed actor/request/config/ranking/session-bound cursors with ranked anchors, while the client route is still not switched.
- Core FEED-005 now provides the TRACE/PLACE diversity selector and explicit exploration stage. Broader projection/query-plan tuning and durable evaluation remain separate FEED-007/FEED-006 work.
- Core FEED-006 now owns the new event intake/outbox/inbox/stats path and exposes worker-authenticated consume/replay/retention routes. The existing TraceDee event outbox remains a compatibility sink and is not silently replayed; deployed Pub/Sub binding, coverage reporting, and client event transport remain separate rollout work.
- Current ranking SQL contains per-row correlated count work and broad matching that should be replaced or isolated behind projections before broad traffic.
- There is no production TraceDee media attachment pipeline, universal creator-feed policy, or canonical collection domain.
- aevo-hub/apps/admin has transitional TraceDee moderation/ranking/projection screens; aevo-admin now has the Core-backed Feed config and moderation controls, while the Hub screens remain compatibility/parity only.
- aevo-hub documentation says Core owns migration writes, while the concrete TraceDee schema is currently visible in aevo-hub Supabase migrations. Datastore/migration ownership is an explicit gate.

## Target architecture

    Aevo Go
      -> Aevo Edge Gateway
      -> Core API Customer Feed facade
      -> app-scoped session and policy
      -> active validated Feed config/session snapshot
      -> parallel candidate generators
      -> eligibility and suppression
      -> feature hydration
      -> deterministic or controlled personalized ranking
      -> diversity/exploration selector
      -> typed public hydration
      -> signed session-bound cursor response
      -> asynchronous event intake and consumers

Core API is the recommended public facade because the Edge Gateway already forwards to it, Core owns app-scoped sessions and platform authorization, and aevo-admin treats it as the source of truth. During the data transition, Core may use a private server-side adapter to the existing TraceDee/Supabase data plane. That adapter must be isolated behind a repository interface. Do not restore aevo-hub/apps/gateway as a second public gateway.

The universal Feed starts with TRACE and PLACE. POST and TRACER remain disabled until their safety/privacy/media contracts pass. Collections are not a current canonical domain object and should not be invented as a Feed-only table.

## Feed V1 scope

V1 serves only:

- entities: TRACE and PLACE;
- serving ranking: deterministic;
- personalization: SHADOW only initially;
- session model: stable seed, fixed candidate cutoff/reference time, deterministic keyset pagination, signed cursor, no mandatory full materialization.

V1 excludes ML ranking, vector databases, creator candidates, POST candidates, Collection candidates, a full experimentation platform, and mandatory fully-materialized Feed candidate lists. These are post-V1 decisions.

## Now versus later

### Do now

- Approve FEED-000 and ADR-000 before any Feed schema migration.
- Choose and document the data-plane/migration owner.
- Publish one versioned Feed contract in aevo-contracts.
- Implement one Core-owned public Feed facade and one event intake path.
- Move TRACE + PLACE composition, deduplication, ranking, diversity, and pagination server-side.
- Use deterministic ranking as the serving baseline; keep taste ranking in SHADOW.
- Add signed session-bound cursors and item tokens.
- Make Core-owned versioned config the source of truth, with runtime propagation/health.
- Connect event/outbox consumers and a single reporting source.
- Port Feed Admin controls to aevo-admin.
- Add query-plan, load, tenant/security, moderation, rollback, and degraded-mode tests.

### Do not do yet

- Do not move all business entities into a new microservice or vector database.
- Do not add arbitrary Admin JSON/SQL ranking expressions.
- Do not serve posts with client-provided media URLs as a production Feed candidate.
- Do not enable LIVE personalization before event coverage and guardrails are trustworthy.
- Do not add Feed-specific logic to aevo-play, aevo-pos, aevo-digital-sing, or Aevo Accounts.
- Do not add new Feed controls to both Admin applications.
- Do not expose raw ranking scores, creator reputation, private preferences, block/mute state, or exact location to clients.

## Database and infrastructure changes

### Proposed Core-owned control-plane data

Add Core migration-owned tables only after FEED-000 is approved and the migration owner is recorded:

- feed_config_revisions;
- feed_config_publications;
- feed_config_validation_results;
- feed_experiment_definitions;
- feed_experiment_variants;
- feed_experiment_overrides, only when a manual override is required;
- feed_config_audit_events;
- optionally feed_config_propagation for runtime health.

Revisions are immutable, validated, reasoned, audited, and activated by pointer. Existing aevo_go_feature_flags and tracedee_feature_flags should be treated as compatibility inputs only, then retired or made read-only after migration.

### Proposed Feed data/projections

Keep canonical domain state in its existing owner. Add only projections/aggregates that remove repeated ranking joins:

- feed_item_projection;
- feed_item_stats_daily or equivalent bounded aggregate;
- feed_event_intake/outbox/inbox;
- feed_evaluation_summary;
- media_asset/media_attachment when Post candidates are approved.

Every projection needs freshness, version, rebuild, and rollback behavior. No new Feed migration is permitted before FEED-000. V1 does not require a materialized session candidate list.

### Infrastructure

Reuse the existing Edge, Cloud Run, Pub/Sub, dead-letter, Cloud Tasks, secret, and observability modules. Connect the Feed event consumer and projection jobs before high-volume impressions are enabled. Add a warehouse dataset/sink only with a named owner, retention policy, and privacy review; current infrastructure does not show a connected Feed warehouse sink.

## Admin runtime versus infrastructure configuration

### Runtime-tunable

aevo-admin may control only typed, bounded, server-validated Feed values: surface/source enablement, candidate budgets/minimums, ranking weights/mode, freshness, geo radius, trending thresholds, diversity/source ratios, exploration quota, cache TTL within a safe bound, event sampling, rollout percentage, variants, and kill switches.

### Infrastructure/deployment-only

aevo-admin must not expose SQL, table/RPC names, ranking expressions, database or storage credentials, Pub/Sub/Cloud Tasks/Cloud Run settings, unbounded worker concurrency, or unsafe timeout/query/connection-pool limits. Every runtime field defines type, minimum, maximum, default, validation, and safe fallback.

## Task sequence

### FEED-000 — Approve Feed data ownership and migration ADR

Goal: resolve the canonical domain/data owner, migration owner, Core/Supabase boundary, transitional adapter, secrets/network boundary, long-term destination, and rollback strategy before implementation.

Why now: the updated review prohibits new Feed migrations until ownership is explicit, while the current TraceDee implementation spans Supabase/aevo-hub and Core API.

Repos: root Feed docs, aevo-core-api, aevo-hub, aevo-infrastructure, aevo-contracts; security and data owners for approval.

Files/areas: docs/feed-system/ADR-000-feed-data-ownership.md; aevo-core-api/docs; aevo-hub README/data boundary; infrastructure secret/network documentation.

DB/API: no schema or runtime change. Record existing Supabase TraceDee/public discovery data as the V1 domain source, Core API/Core SQL as the Feed control-plane owner, Core-only ownership for new Feed schema, and a private Core-to-Supabase adapter for transition.

Dependencies: none.

Steps:

1. Review and accept ADR-000 or record an amended decision.
2. Name the repository allowed to create new Feed schema migrations.
3. Record network, credential, RLS, access, and rollback boundaries.
4. Record the long-term Core-owned Feed read-model destination without making it a V1 prerequisite.
5. Freeze unowned/new Feed Supabase migration work until approval.

Tests: documentation/architecture review, repository ownership check, secret-boundary review, and rollback tabletop exercise.

Acceptance: ADR-000 is marked accepted by designated Core/API, Supabase/TraceDee, infrastructure, and security owners; no unresolved duplicate config/data authority remains; FEED-001 is explicitly unblocked.

Risk/rollback: low implementation risk, high governance value. Amend the ADR before code; no data rollback is needed because this task changes no runtime state.

Complexity: M.

### FEED-001 — Establish the Feed data-plane and contract boundary

Goal: make the public API owner, datastore transition, shared contract, and compatibility rules explicit.

Why now: aevo-go calls public TraceDee routes that are not present in the inspected Core API/Edge path, and aevo-hub no longer owns a public API.

Repos: aevo-core-api, aevo-contracts, aevo-edge-gateway, aevo-hub, aevo-go.

Files/areas: Core Program.cs and ApiContracts.cs; new Core Feed folder; aevo-contracts/src; Edge origin/routing configuration; aevo-go/src/lib/customer-api.ts; aevo-hub README/data package boundary documentation.

DB/API: no production schema change. Define versioned FeedRequest, FeedResponse, FeedItem variants, FeedEvent, and error codes. Establish the private adapter/service boundary selected by FEED-000; actual candidate reads and composition remain in FEED-003/004. Core remains the session/policy authority.

Dependencies: FEED-000 approval.

Steps:

1. Inventory actual deployed origins and add an explicit route matrix.
2. Define the first endpoint, preferably GET /api/v1/public/feed, with surface/tab/query/area/location/cursor/limit.
3. Define response fields including feedSessionId, configVersion, rankingVersion, nextCursor, degraded, and typed items.
4. Define compatibility mapping from current TraceDee and public discovery responses.
5. Document the migration owner and secrets/network boundary.

Tests: contract serialization/parsing, route inventory, app-scoped session, anonymous/authenticated policy, no-browser-service-key, and compatibility fixtures.

Acceptance: one approved contract is published; no client or Admin code needs to know the data source; the FEED-000 datastore/migration decision is recorded; implementation does not resurrect Hub Gateway.

Risk/rollback: low code risk, high architectural leverage. Roll back by retaining existing client routes while the new contract remains unused.

Complexity: M.

### FEED-002 — Build versioned Feed configuration with publish/rollback

Goal: replace immediate mutable flags with one Core-owned, typed, auditable configuration lifecycle.

Why now: Core and Supabase flags can diverge, and the current Core update request cannot persist ranking config.mode.

Repos: aevo-core-api, aevo-contracts, aevo-admin, aevo-background-worker, aevo-infrastructure; transitional aevo-hub only for compatibility read removal.

Files/areas: Core db/migrations; Core Feed config service; Core admin Program.cs/Contracts; aevo-contracts Admin types; aevo-admin Go routes; worker publication consumer; infrastructure secrets/event bindings.

DB/API: Core-owned `0010_feed_config_control_plane.sql` now defines immutable revisions/validation, one active pointer, structured audit, propagation observations, and a seeded deterministic baseline. Core exposes GET active/revisions/guardrails/propagation and POST draft/validate/publish/rollback endpoints; the shared Admin contract is versioned and rejects infrastructure controls. Do not expose raw JSON as the normal UI.

Dependencies: FEED-000 approval and FEED-001 contract stabilization. FEED-002 and FEED-003 may proceed partly in parallel after the contract is stable.

Steps:

1. Define schemaVersion, generator budgets, ranking weights/mode/version, diversity caps, rollout, kill switch, safety, and analytics policy.
2. Validate unknown fields, bounds, enums, cross-field rules, and concurrency.
3. Persist immutable revisions and structured audit records.
4. Publish active pointer and runtime propagation event — implemented through the existing Core outbox path.
5. Add fallback to last valid config, then deterministic code baseline — implemented and unit-tested.
6. Make existing flags read-only/compatibility-mapped and add a mismatch health check — implemented as Core read-only telemetry.

Tests: schema/property validation, config bounds/default/fallback, draft/publish concurrency, rollback, idempotency, permission/CSRF/audit, stale-cache fallback, propagation mismatch, infrastructure-field rejection, deterministic experiment bucketing, and kill switch.

Acceptance for this batch: one Core-owned active version is represented by the typed lifecycle and is consumable by the future Feed facade; Admin lifecycle routes, validation, rollback, audit, fallback, and compatibility telemetry are implemented; old direct Supabase writes are not needed. Database apply/verify and Feed-facade consumption were subsequently verified by BATCH-FEED-003A.

Risk/rollback: medium. Keep old deterministic behavior and a compatibility flag reader until propagation is verified; rollback activates the prior immutable revision.

Complexity: L.

### FEED-003 — Implement the Core Customer Feed facade and feed sessions

Goal: expose one server-owned Feed request path with policy, config snapshot, signed cursor, and session identity.

Why now: browser-side composition cannot guarantee stable pagination, actor policy, or experiment attribution.

Repos: aevo-core-api, aevo-contracts, aevo-edge-gateway; aevo-go only for later client adoption.

Files/areas: new Core Feed endpoint/service/repository interfaces, request validation, cursor signer, session context, middleware/policy; contract package; Edge route tests/config.

DB/API: implement GET /api/v1/public/feed and a batch event route contract, but keep event implementation in FEED-006. Define FeedSessionContext with feedSessionId, surface, startedAt, candidateCutoffAt/rankingEpoch, configVersion, rankingVersion, experimentSeed, requestFingerprint, and expiration. Cursor payload is signed and binds to that context.

Dependencies: FEED-001 contract stabilization. FEED-003 may start with the deterministic code baseline while FEED-002 config control-plane work proceeds in parallel.

Steps:

1. Resolve GO session/anonymous principal server-side.
2. Normalize request and bind all pages to one request fingerprint/config/session snapshot.
3. Create a short-lived FeedSessionContext with fixed candidate cutoff/reference time and stable experiment seed.
4. Enforce limits/rate limits and return typed errors.
5. Add private repository interfaces for candidate generation and hydration.
6. Sign/verify opaque cursors and reject tampering/reuse/expiry.

Tests: auth/session isolation, cursor tamper/change/expiry, page stability, rate limits, request fingerprint, request IDs, no tenant/actor override, deterministic session ordering, and content insertion between page one and page two.

Acceptance: the endpoint can return an empty typed page safely; no raw table/SQL/client actor data crosses the boundary; a cursor cannot be reused with a different request context.

Risk/rollback: medium. Keep current TraceDee and discovery routes as compatibility fallback until FEED-008 passes.

Complexity: L.

Verification handoff: BATCH-FEED-003A verified the real Core migration, active config resolution, authenticated GO session path, anonymous/cross-app isolation, RLS role boundary, publish/rollback, idempotency/concurrency, outbox persistence, and real-config HTTP smoke. FEED-004 remains a separate candidate-generation batch; no candidate, ranking, event, UI, or rollout work is included here.

### FEED-004 — Add TRACE and PLACE generators and server-side mixed composition

Goal: move current Explore composition into independent server candidate generators.

Why now: these are the only two live sources currently rendered in the universal Explore surface.

Repos: aevo-core-api; aevo-hub data adapter/Supabase SQL only if the FEED-000 transition decision selects it; aevo-contracts.

Files/areas: new Trace/Place generator and adapter modules; existing tracedee repository/RPC mapping; public discovery repository; typed item hydrators; source/version telemetry.

DB/API: no new domain tables required. If performance requires it, add an owned projection/aggregate migration after the boundary decision. Initial output is TRACE and PLACE variants in FeedResponse.

Dependencies: FEED-003.

Steps:

1. Reuse TraceDee eligibility and map it to Candidate rather than public item.
2. Adapt public store/place discovery and define canonical identity deduplication.
3. Run generators with independent timeouts and candidate budgets.
4. Apply block/mute/moderation/public checks before final output.
5. Hydrate typed summaries and safe relationship state.
6. Remove browser interleaving only after the new route is verified.

Tests: mixed ordering, duplicate place identity, generator timeout/degraded fallback, moderation race, block/mute, query/area, anonymous/authenticated, and typed response parsing.

Acceptance: one page from the new endpoint contains server-composed Trace/Place items with no browser merge; source failure is isolated; no private or removed entity appears.

Risk/rollback: medium. Feature-gate the Go surface and fall back to the existing parallel queries.

Complexity: L.

Verification handoff: BATCH-FEED-004 is verified in `docs/feed-system/phase-notes.md`. Core now reads the canonical TraceDee/public-discovery tables through a private typed adapter, runs bounded independent TRACE/PLACE generators, enforces moderation/public/identity/block/mute eligibility, deduplicates `store:{id}`/`place:{id}`, hydrates only the v1 allowlist, and serves deterministic mixed pages with signed ordering anchors. Core build, 28 focused/unit tests, 2 real PostgreSQL candidate/hydration/nearby tests, 5 selected database integration tests, migration verification, and real HTTP mixed-feed/pagination/policy smoke passed. No new migration or client/route switch was made. FEED-005 ranking/calibration/diversity/exploration remains a separate gate.

### FEED-005 — Implement ranking, diversity, and safe explanations

Goal: make ordering a versioned pipeline rather than hard-coded interleaving or raw SQL score output.

Why now: the existing TraceDee score is useful baseline logic but does not cover mixed types or explicit diversity.

Repos: aevo-core-api; aevo-hub projection/RPC adapter as required; aevo-contracts; aevo-admin config consumers.

Files/areas: ranking feature extraction, deterministic scorer, SHADOW comparator, diversity selector, reason-code mapper, evaluation writer.

DB/API: use active config/ranking versions and existing quality/taste projections. Add evaluation fields for candidate/served IDs, stage timings, cohort, config/ranking version, and fallback reason.

Dependencies: FEED-002, FEED-004.

Steps:

1. Extract entity-specific TRACE and PLACE features.
2. Calibrate each entity type into a common normalized 0..1 feature space.
3. Keep deterministic baseline serving for the first release.
4. Add source budgets/minimums, entity-type maximum ratios, consecutive caps, place repetition caps, Trace lineage caps, and exploration quota.
5. Assign safe public reason codes; remove internal debug reasonParams.
6. Record deterministic versus personalized comparison in protected telemetry using stable experiment bucketing.

Tests: deterministic ordering/ties, weights/bounds, TRACE/PLACE calibration, source domination, diversity caps, exploration behavior, explanation allowlist, SHADOW no-serve mutation, deterministic experiment assignment, config kill switch, and ranking evaluation idempotency.

Acceptance: mixed pages are diverse under configured constraints, deterministic fallback is reproducible, no internal feature vector is public, and Admin can see the exact active version.

Risk/rollback: medium. Kill switch returns deterministic baseline and disables optional personalization.

Complexity: L.

Verification handoff: BATCH-FEED-005 is verified in `docs/feed-system/phase-notes.md`. Core now extracts private TRACE/PLACE feature inputs from existing quality/taste/interaction projections, calibrates them into a bounded common space, applies active typed-config weights, keeps deterministic order as the only served order, computes authenticated SHADOW comparison privately, and selects diverse/exploratory candidates before pagination. Safe reason codes remain allowlisted, ranked cursor anchors include score plus millisecond-stable cutoff semantics, and the public response contains no feature vector or raw score. Core build, 50 focused/unit tests, 3 real PostgreSQL canonical/ranking tests, 6 selected database integration tests, migration verification, and HTTP mixed-feed/pagination/policy smoke passed. No new migration or client/route switch was made. FEED-006 events and FEED-007 query-plan/load/projection work remain separate.

### FEED-006 — Decouple Feed events and connect consumers

Goal: implement the versioned Feed event specification and make impressions/interactions durable, idempotent, asynchronous, and measurable without blocking Feed responses.

Repos: aevo-core-api, aevo-contracts, aevo-background-worker, aevo-hub transitional adapter, aevo-infrastructure, aevo-admin analytics.

Files/areas: event route/validator, intake/outbox/inbox consumer, Pub/Sub handler, projection consumer, retention job, Feed client event transport.

DB/API: add or adapt event intake/outbox/inbox with schemaVersion, eventName, session/feedSession/itemToken binding, client event ID, timestamps, bounded metadata, candidate source, config/ranking version, and experiment variant. Define impression/engaged-view/open/click/save/share/trace-start/trace-complete/place-open/booking-click semantics before implementation. Use existing GCP Pub/Sub/dead-letter/Cloud Tasks/Cloud Run primitives; do not add Cloudflare Queue only for symmetry.

Dependencies: FEED-001 public contract stabilization and FEED-003 session/item-token semantics. It can be specified in parallel with FEED-005; production consumer wiring follows the event spec.

Steps:

1. Write and approve Feed event specification v1 with 50%/1-second impression, 50%/3-second engaged-view, batching, retry, timestamp-skew, offline, and duplicate rules.
2. Implement batch event validation and idempotency.
3. Connect durable publish and worker acknowledgement.
4. Consume events into bounded stats/projection tables.
5. Replay existing TraceDee outbox safely or mark a measured compatibility cutoff.
6. Add retention/deletion handling and dead-letter replay.

Tests: browser/Web/PWA/Capacitor semantic consistency, viewport/duration thresholds, duplicate/replay/conflicting payload, invalid token/session, timestamp skew, bounded offline queue, consumer retry, dead-letter, partial consumer failure, backpressure, no precise location leakage, and no Feed response coupling.

Acceptance: a valid impression can be accepted without a synchronous ranking-table write; consumer lag and coverage are visible; replay is safe.

Risk/rollback: high operational risk. Retain the old activity route as a compatibility sink until the new path has coverage; disable high-volume impression reporting if backlog grows.

Complexity: XL.

Verification handoff: BATCH-FEED-006 is verified for the Core controlled event pipeline in `docs/feed-system/phase-notes.md`. `POST /api/v1/public/feed/events` validates signed session/item-token bindings, event semantics, visibility thresholds, timestamp skew, bounded metadata, deterministic sampling, and idempotency before writing Core-owned intake/outbox rows. The worker forwards `FEED_EVENT_ACCEPTED` delivery to the Core consumer; inbox dedupe and daily stats are replay-safe, and health/retention/dead-letter controls are available. Core build, 81 focused/unit tests, targeted real PostgreSQL schema/RLS/intake/consumer tests (selected suite 7/7), contract checks, worker checks, migration dry-run/apply/verify, and HTTP event smoke passed. No client route switch, infrastructure deployment, historical TraceDee replay, or production impression enablement was made.

### FEED-007 — Replace hot-path count work with projections and load-test

Implementation status: Core controlled slice implemented on 2026-09-25. Client adoption, production route migration, and deployed worker scheduling remain separate gates.

Goal: make candidate/ranking queries predictable at production scale.

Repos: aevo-core-api, aevo-hub data/migration owner, aevo-background-worker, aevo-infrastructure.

Files/areas: query plans, feed_item_projection, aggregate rebuild/rollback, worker schedule, indexes, load-test harness.

DB/API: add only owned, additive projections and indexes. Preserve canonical domain tables. Include projection version, freshness, rebuild run, failure, and rollback metadata.

Dependencies: FEED-004 and query-plan/load evidence. FEED-007 must not unnecessarily block FEED-008 client integration; any new schema still requires FEED-000 migration approval.

Steps:

1. Capture current explain plans and baseline latency.
2. Replace per-row counts with maintained aggregates/materialized joins.
3. Add keyset/full-text/spatial/eligibility indexes.
4. Run rebuild/replay and verify counts.
5. Load test all surfaces/pages and failure modes.

Tests: query plans, projection rebuild/rollback, stale-read behavior, tenant/public boundary, concurrency, and traffic profiles.

Acceptance: agreed SLOs are met for the first slice with bounded connection/query pressure; no projection is treated as authoritative domain state.

Risk/rollback: high database risk. Additive migrations, feature-gated reads, dual-read comparison, and projection rollback are required.

Complexity: XL.

Controlled implementation slice:

- Core migration `0019_feed_serving_projection.sql` adds versioned run metadata, active/previous control, and an RLS-protected TRACE/PLACE metrics projection. Canonical domain tables remain authoritative.
- `AEVO_FEED_PROJECTION_MODE` is backend-only and defaults to `off`; `shadow` reads the projection path without changing served features; `active` uses fresh projection metrics and falls back per item to canonical work when a row is missing or stale.
- TRACE and PLACE candidate queries use the projection for global counts/latest quality while actor-specific safety, eligibility, dedupe, spatial filtering, hydration, ranking, diversity, and cursor semantics remain in the existing Core pipeline.
- Worker-authenticated Core routes provide rebuild and rollback; Admin `go.analytics.read` health reports active/previous run, freshness, row count, and allowlisted error status. A production worker schedule is intentionally not bound in this slice.
- Verification covers migration schema/RLS/indexes, rebuild/rollback, stale-read behavior, indexed `EXPLAIN`, concurrent TRACE/PLACE reads, and bounded test traffic in real PostgreSQL. See [Feed serving metrics projection v1](docs/feed-system/feed-serving-projection-v1.md).

### FEED-008 — Migrate Aevo Go to the unified Feed contract

Goal: make the customer client consume the server-owned Feed while preserving accessible loading, empty, error, retry, and stale states.

Implementation status: test-client slice implemented and verified on 2026-09-25; the unreferenced legacy Explore implementation cleanup was verified on 2026-09-26, the old `/traces` list-entry cleanup was verified on 2026-09-27, and the connected local Core-to-Edge-to-Go payload/browser smoke was verified on 2026-09-27. `aevo-go` now has a strict Core Feed response/event parser, one Core infinite-query stream for Explore, server-order preservation, server cursor handling, opaque item-token/session event batching, an authenticated Core-backed hide mutation, and a canonical Place save action backed by the Core interaction projection. In canonical mode, the Saved page now reads the Core saved-place list/detail projection, supports reversible remove through the Core DELETE route, and the Profile count reads the same projection. The hide/save paths are bound to the app session, signed item token where applicable, Feed session where applicable, CSRF, idempotency, and Core RLS; anonymous discovery remains non-durable. Core's public serializer now preserves concrete TRACE/PLACE fields through the interface-typed response collection, so Go receives the same hydrated payload that Core selected. The legacy Explore adapter, `VITE_FEED_API_MODE` flag, unreferenced `LegacyExplorePage` implementation, and unreferenced `TraceDeeFeedPage` list implementation are retired. `/traces` now redirects to `/?tab=for_you&category=trace`; the retained `/traces/:traceSlug` detail route and Trace Map read adapter remain compatibility boundaries because Core Feed v1 currently exposes `surface=explore` only. No production route switch or data-destructive legacy migration was executed.

Repos: aevo-go, aevo-contracts, aevo-core-api/contract tests.

Files/areas: customer-api.ts, feed-api.ts, contracts/feed.ts and legacy tracedee/customer contracts, discovery Explore page, discovery cards/action state, impression/event transport, React Query keys and pagination.

DB/API: switch Explore to GET /api/v1/public/feed and server nextCursor/feedSessionId. Continue detail/action routes unchanged unless contract work requires an additive change.

Dependencies: FEED-001 public contract stabilization and FEED-004 typed candidates. FEED-006 is required before production impression reporting, but UI work may proceed in parallel.

Steps:

1. Add the strict response parser and Core item-to-card adapter.
2. Replace two live queries/client interleave with one infinite query.
3. Preserve item-type cards and action behavior using server relationship state.
4. Send server-issued item tokens/session IDs with impressions/interactions.
5. Remove client rank/merge assumptions and keep demo mode isolated.

Tests: strict Core response/event parsing, infinite cursor pages, stale/error/retry, Core route transport, impression threshold, event batching/retry, live/demo separation, accessibility, Web/PWA/Capacitor smoke, and a source/config scan proving the Explore legacy adapter and mode flag are absent.

Acceptance: Go displays the same first-slice product behavior from one endpoint; no browser ranking/interleaving remains; invalid/removed items are handled safely.

Risk/rollback: medium. Client rollback is bounded to the prior route-level compatibility surfaces (the `/traces` redirect, `/traces/:traceSlug` detail route, and Trace Map); Explore has no legacy transport flag. Core detail/action routes remain unchanged, and the server contract remains the source of truth. If concrete payload serialization regresses, the converter regression test and Go strict parser fail before a production route switch; the safe fallback is an empty/degraded page rather than client-side rehydration.

Complexity: L.

### FEED-009 — Port Feed configuration, ranking, and moderation to aevo-admin

Goal: make aevo-admin the only long-term Feed control plane.

Implementation status: read-only control slice implemented and verified on 2026-09-25; the typed draft/validate/diff/publish/rollback mutation slice and the typed moderation queue/evidence/action slice were implemented and verified on 2026-09-26. `aevo-admin` now exposes `/go/feed` and `/go/feed/moderation` with server-authorized reads and typed lifecycle controls. Core remains the mutation authority: permission, CSRF, idempotency, optimistic version/status checks, immutable revision history, audit, and outbox are enforced server-side. FEED-010 suppression/privacy hardening, connected-DB/authenticated browser evidence, production origin switch, and destructive data operations remain separate follow-up work.

Repos: aevo-admin, aevo-core-api, aevo-contracts, and the aevo-hub Supabase migration owner; aevo-hub/apps/admin is retained only for compatibility/parity verification.

Files/areas: Admin routes/navigation, BFF API client, typed config and moderation forms, allowlisted evidence snapshots, audit viewer links, permission guards, guardrail/propagation views, and safe degraded/error states.

DB/API: consume FEED-002 config/guardrail/propagation plus Core-owned moderation queue/action endpoints. The Core adapter calls the existing moderation queue/action functions through a service-role-only expected-status wrapper migration; no direct Supabase reads or writes are exposed to Admin/browser.

Dependencies: FEED-001 public contract stabilization and FEED-002 config contract. UI shell, read-only guardrails, typed config forms, and moderation controls depend on Core authorization and the existing TraceDee moderation functions; connected database migration apply remains an external gate.

Controlled steps:

1. Add read-only active config, guardrail, propagation, revision, event-health, and projection-health pages. **Completed in this slice.**
2. Add draft/validate/diff/publish/rollback flow. **Completed in FEED-009-MUTATION; publish and rollback use hold-to-confirm in Admin.**
3. Port moderation queue/evidence/actions with expected-status conflicts. **Completed in FEED-009-MODERATION for the controlled Core/Admin slice.**
4. Add event/outbox/projection health and audit links.
5. Run standalone preview, then switch production origin.

Tests: shared contract/OpenAPI validation, platform permission routing, app-scoped Admin API reads, read-only denied/degraded states, unavailable Core API, typed mutation forms, CSRF/idempotency/audit/version/status-conflict behavior in Core tests, moderation cursor validation, hold-to-confirm config and high-impact moderation actions, responsive Admin build, and no direct database credential. Connected-DB moderation RPC tests, authenticated browser tests, and production-origin tests remain separate.

Acceptance: every Feed mutation is sent through Core and visible in the Core audit boundary; old Hub Admin has no unique Feed control needed for routine operations, while its legacy moderation route remains a compatibility boundary until the dedicated cleanup/hardening gate.

Risk/rollback: medium. Core remains the source of truth and every lifecycle mutation is guarded by `go.settings.manage` or `content.moderate`; config rollback is a new audited pointer publication, not history deletion, and moderation actions use an expected-status conflict guard. Revert the Admin mutation UI/action wiring while leaving Core revisions/history intact, or remove the `/go/feed` and `/go/feed/moderation` navigation/routes while Core state remains canonical.

Complexity: L.

### FEED-010 — Harden moderation, suppression, and privacy across all generators

Goal: make safety checks consistent before candidate output, before ranking, and after hydration.

Repos: aevo-core-api, aevo-hub data adapter/migrations as selected, aevo-admin, aevo-contracts.

Files/areas: eligibility policy, moderation adapter, block/mute resolver, report/action routes, public field allowlist, audit and cache invalidation.

DB/API: reuse existing TraceDee moderation/report/block/mute tables; add only missing version/conflict/audit fields through the chosen migration owner.

Dependencies: FEED-004 and FEED-006 safety/event contracts; remains a production launch requirement alongside FEED-009.

Steps:

1. Define per-item-type eligibility matrix.
2. Enforce canonical moderation-to-eligibility projection filtering and fail-closed unknown safety states.
3. Bind Admin actions to Core platform permission/content.moderate.
4. Remove internal reason/debug fields and precise location from public responses.
5. Add suppression and deletion propagation.

Tests: moderation race, block/mute, deleted/removed, eligibility projection outage, freshness-bound last-known-good state, report duplicate, Admin permission, stale cache, privacy field snapshots, no precise location leakage, and account deletion.

Acceptance: no hidden/private/blocked content reaches a public response; moderation action is auditable and takes effect within the stated cache bound.

Risk/rollback: high trust risk. Disable affected generator and use deterministic safe fallback if policy data is unavailable.

Complexity: L.

### FEED-011 — Post-V1 POST/TRACER candidates only after media/privacy readiness

Goal: expand beyond TRACE/PLACE with safe community and creator items.

Repos: aevo-core-api, aevo-hub/domain adapter or Core migration owner, aevo-go, aevo-admin, aevo-background-worker, aevo-infrastructure.

Files/areas: post/tracer generators, public detail contracts, media_asset/media_attachment, upload/process worker, Creator visibility policy, Go cards/actions.

DB/API: add media attachment/storage lifecycle only after rights and provider approval. Add public post/tracer contracts and moderation evidence.

Dependencies: FEED-010 and an explicit post-V1 media/privacy decision. This task is outside Feed V1.

Steps:

1. Define public post/tracer eligibility and detail routes.
2. Implement media upload, scan, variants, deletion, and Admin preview.
3. Add generators with independent budgets.
4. Add diversity caps and event mappings.
5. Enable in SHADOW, then canary only after guardrails.

Tests: media state transitions, unsafe/deleted media, creator privacy, moderation, generator degradation, cross-page duplicates, and mobile rendering.

Acceptance: Post/Tracer items are fully typed, safe, measurable, and reversible independently of Trace/Place.

Risk/rollback: high product/safety risk. Keep sources disabled by config and remove them without a client release.

Complexity: XL.

### FEED-012 — Production rollout, observability, and runbook

Goal: release the Feed incrementally with evidence, safe rollback, and operational ownership.

Repos: all Feed-owning repos; aevo-infrastructure and aevo-background-worker are required.

Files/areas: dashboards/alerts, SLO docs, load tests, migration verification, feature rollout defaults, incident runbook, deployment manifests.

DB/API: no new domain model unless a rollout gap is discovered. Seed deterministic safe config and rollout 0/SHADOW defaults.

Dependencies: FEED-000 through FEED-010 for the first V1 slice; FEED-011 remains post-V1.

Steps:

1. Run contract, tenant/security, migration, integration, load, and browser/Capacitor checks.
2. Deploy behind Go feature flag with deterministic compatibility fallback.
3. Verify event coverage, config propagation, moderation, cursor stability, and SLOs.
4. Roll out anonymous deterministic, then authenticated SHADOW, then only approved canary.
5. Document kill switch, rollback, replay, and ownership.

Tests: production-like smoke, canary, chaos/dependency failure, rollback, and alert verification.

The controlled workspace now includes `scripts/check-feed-load.ts`, a bounded
read-only Core-to-Edge harness that validates the public TRACE/PLACE response,
module references, private-field absence, error rate, and p50/p95/max latency.
It is local-only by default and is evidence for contract/runtime behavior, not
a substitute for deployed SLO, autoscaling, canary, or chaos verification.

Acceptance: operators can identify config/ranking/data versions, disable personalization/generators, replay events safely, and restore the prior known-good state.

Risk/rollback: operational. Roll back active config, disable unified client flag, or route to compatibility endpoints without deleting data.

Complexity: L.

## Revised dependency order

    FEED-000
        -> FEED-001
             ├── FEED-002 config control plane
             └── FEED-003 Feed facade/session
                       -> FEED-004 candidates
             FEED-002 + FEED-004
                       -> FEED-005 calibration/ranking
    FEED-001 + FEED-003
        ├── FEED-006 event specification/pipeline
        ├── FEED-008 Aevo Go integration
        └── FEED-009 aevo-admin UI
    FEED-004 + query/load evidence
        └── FEED-007 projection optimization
    FEED-006 + FEED-007 + FEED-009
        -> FEED-010 production safety requirement
        -> FEED-012 rollout/runbook
    FEED-011 remains post-V1

FEED-002 and FEED-003 can proceed partly in parallel after FEED-001 contracts stabilize. FEED-007 is evidence-driven and must not unnecessarily block FEED-008 or FEED-009. FEED-006, FEED-008, and FEED-009 can progress partly in parallel after the public contract and session/item-token semantics are stable.

## Definition of done for the first TRACE + PLACE release

- one versioned public Feed endpoint is reachable through the intended Edge/Core path;
- Core resolves GO session and policy; the browser cannot choose actor, tenant, rank, source, or SQL;
- TRACE and PLACE are server-composed, deduplicated, diverse, and cursor-paginated;
- cursor/session/config/ranking versions are signed/bound and observable;
- FeedSessionContext fixes candidate cutoff/reference time and experiment seed so inserted content cannot reorder an existing session;
- deterministic ranking is the serving baseline; personalization is SHADOW or disabled;
- TRACE and PLACE features are calibrated into a common normalized space and source/entity-type domination is bounded;
- public reason codes are safe and raw internal scores/debug fields are absent;
- moderation, block/mute, deletion, and stale hydration checks are enforced;
- Core drops mismatched candidate/hydration identities and re-issues signed
  item tokens at the public facade boundary;
- moderation eligibility uses a bounded last-known-good projection; unknown/new content fails closed after the freshness bound;
- Feed config has draft/validate/publish/rollback/audit and one source of truth;
- event intake is durable/idempotent/asynchronous with consumer lag and coverage metrics;
- event semantics are versioned and consistent across Web/PWA/Capacitor, with no precise location leakage;
- aevo-go uses one response contract with accessible loading/error/empty/retry states;
- aevo-admin is the operator surface; transitional Hub Admin is not required for Feed operation;
- migration owner, rollback, SLOs, retention, and runbook are documented;
- all relevant contract, security, tenant-boundary, database, load, and client tests pass.

## Explicit stop condition

This plan executes one controlled batch at a time. FEED-000 through FEED-003 are recorded under the project-owner controlled-implementation authorization; FEED-002 migration apply/verify and FEED-003 authenticated database integration await an approved environment. Stop after each batch and record its evidence before starting the next prompt. Do not start FEED-004 in the same invocation, and do not claim production migration or customer-route state until the environment gates are satisfied.

## Implementation batch protocol

When implementation is explicitly authorized, do not hand an agent the whole FEED-001–FEED-012 sequence. Execute the phase pack in `docs/feed-system/19-phase-execution-and-verification.md`, one prompt and one repository verification gate at a time:

1. `BATCH-FEED-000-ADR` — review and accept ownership; documentation only.
2. `BATCH-FEED-001-CONTRACT` — publish the versioned contract and boundary; no schema migration.
3. `BATCH-FEED-002-CONFIG` — implement the Core-owned typed config lifecycle after FEED-000 approval.
4. `BATCH-FEED-003-FACADE` — implement the Core Feed facade, session context, and signed cursor boundary.

Each batch has a copy-paste prompt under `docs/feed-system/prompts/`, an allowed-repository/file boundary, a required test matrix, a stop condition, and a handoff note. A batch is not complete because it compiles: its acceptance checks, security/ownership checks, and per-repository verification evidence must be recorded in `docs/feed-system/phase-notes.md` before the next batch starts. The baseline execution order is sequential (`FEED-002` before `FEED-003`) even though the architecture permits limited parallel work after FEED-001; parallel execution is allowed only when file ownership is explicitly disjoint and both notes reference the same accepted contract.

## Supporting documents

- docs/feed-system/00-current-state.md
- docs/feed-system/01-domain-model.md
- docs/feed-system/02-feed-architecture.md
- docs/feed-system/03-candidate-generators.md
- docs/feed-system/04-ranking.md
- docs/feed-system/05-pagination-and-sessions.md
- docs/feed-system/06-events-and-analytics.md
- docs/feed-system/07-media-pipeline.md
- docs/feed-system/08-location-and-nearby.md
- docs/feed-system/09-search-and-query-boundary.md
- docs/feed-system/10-moderation-and-safety.md
- docs/feed-system/11-security-and-tenant-boundary.md
- docs/feed-system/12-admin-config-workflow.md
- docs/feed-system/13-config-validation-and-experiments.md
- docs/feed-system/14-cache-and-scale.md
- docs/feed-system/15-analytics-and-observability.md
- docs/feed-system/16-failure-modes-and-recovery.md
- docs/feed-system/17-polyrepo-contracts-and-ownership.md
- docs/feed-system/18-open-questions.md
- docs/feed-system/ADR-000-feed-data-ownership.md
- docs/feed-system/19-phase-execution-and-verification.md
- docs/feed-system/20-config-and-feed-flow-graphs.md
- docs/feed-system/21-discovery-direction.md
- docs/feed-system/22-personalization-architecture.md
- docs/feed-system/23-community-evidence-and-ugc.md
- docs/feed-system/24-discovery-ui-and-admin.md
- docs/feed-system/25-discovery-roadmap-and-verification.md
- docs/feed-system/FEED-000-approval-request.md
- docs/feed-system/phase-notes.md
- docs/feed-system/prompts/FEED-000-ADR.md
- docs/feed-system/prompts/FEED-001-contract.md
- docs/feed-system/prompts/FEED-002-config.md
- docs/feed-system/prompts/FEED-003-facade-session.md

## Architecture review revision report

ARCHITECTURE REVIEW REVISION

### 1. Decisions changed

- Added FEED-000 and ADR-000 as a mandatory ownership gate.
- V1 now explicitly serves TRACE + PLACE with deterministic ranking and SHADOW-only personalization.
- Stable pagination now uses FeedSessionContext, fixed candidate cutoff/reference time, ranking epoch, and experiment seed; full materialization is not mandatory.
- Per-user experiment assignment persistence was removed as the default; deterministic bucketing is the default.
- Admin configuration is divided into bounded runtime values versus infrastructure/deployment-only values.
- TRACE and PLACE now require entity-specific extraction/calibration before common scoring.
- Moderation hot path now uses a canonical-state-to-eligibility projection with a bounded last-known-good policy, not a mandatory remote moderation call.
- Feed events now have a versioned semantic specification and use existing GCP Pub/Sub/dead-letter/Cloud Tasks/Cloud Run infrastructure.

### 2. Tasks added/removed

- Added FEED-000 — Data ownership decision and ADR.
- Revised FEED-001 to begin only after FEED-000 approval.
- Revised FEED-002/003 for parallel progress after contracts stabilize.
- Revised FEED-005 for calibration/source domination controls.
- Revised FEED-006 for the event specification prerequisite and GCP async path.
- Revised FEED-007 so query-plan/load evidence drives optimization and does not block client integration.
- Marked FEED-011 explicitly post-V1.
- Removed feed_experiment_assignments from the default schema plan; definitions/variants/exceptional overrides remain.

### 3. Revised dependency graph

FEED-000 -> FEED-001 -> parallel FEED-002 and FEED-003 -> FEED-004 -> FEED-005. After the public contract/session semantics stabilize, FEED-006, FEED-008, and FEED-009 can proceed partly in parallel. FEED-007 is evidence-driven. FEED-010 and FEED-012 are production launch gates. FEED-011 remains post-V1.

### 4. Revised V1 scope

TRACE and PLACE only; deterministic serving; personalization in SHADOW only; stable session seed/cutoff/keyset/signed cursor; no ML, vector database, creator/post/collection candidates, full experimentation platform, or mandatory fully materialized candidate lists.

### 5. Remaining architecture blockers

- FEED-000 ADR approval and named migration owner;
- confirmation that Core can use the private Supabase adapter or decision to deploy a private customer-data service;
- exact public endpoint deployment/origin mapping;
- canonical Place identity mapping between tracedee_places and customer_store_profiles;
- measured SLO/traffic baseline;
- event warehouse/reporting source and retention owner;
- moderation eligibility freshness/invalidation bounds;
- media/privacy decision for post-V1 content.

### Architecture-review acceptance additions

The revised test plan explicitly includes:

- content inserted between page requests without reordering an existing session;
- deterministic session ordering and experiment bucketing;
- TRACE/PLACE calibration and candidate-source domination;
- config bounds, defaults, infrastructure-field rejection, and last-known-good fallback;
- moderation eligibility projection outage/freshness behavior;
- event semantic consistency across Web/PWA/Capacitor, retry/offline/idempotency, and no precise location leakage;
- cross-repository contract compatibility;
- old Go client against the new backend and new Go client during rollback to compatibility routes.

### 6. Exact approval gate for beginning FEED-000 / FEED-001

The initial architecture-review revision required FEED-000/ADR-000 acceptance before implementation. The project owner then issued the explicit instruction `always approve` on 2026-09-23. That instruction is recorded in ADR-000 as controlled-implementation authorization, with the migration owner set to `aevo-core-api/db/migrations`; it does not waive RLS, app-scoped authorization, service-key isolation, migration dry-run/verify, rollback, or production/environment review. FEED-001 has been implemented and verified. FEED-002 and FEED-003 have been implemented under their own Core gates, and BATCH-FEED-003A subsequently verified migration apply/verify, database-backed lifecycle, authenticated integration, RLS role boundaries, and real-config Feed smoke. FEED-004 is the next separate candidate-generator batch.

## DISCOVERY PRODUCT DIRECTION REVISION — 2026-09-26

This section is the authoritative reassessment after the product direction
changed from a potentially social-feed-shaped experience to a place and
experience discovery system. It does not rewrite or renumber FEED-000 through
FEED-012. Historical phase notes remain evidence of the scope that was
implemented at the time. New work uses the `DISCOVERY-*` namespace because
FEED-010 and later are already occupied in the local plan.

The earlier architecture-review paragraph still says FEED-004 was the next
candidate-generator batch; that sentence is retained as historical evidence.
The current product-direction gate supersedes it for new work: do not start
FEED-004 or a discovery runtime batch until `DISCOVERY-001` has frozen the
entity/evidence/signal contract.

### Product boundary

TraceDee / Aevo Go is a place and experience discovery network. The primary
user outcome is:

    discover -> evaluate -> plan -> visit -> book -> experience

The public Feed therefore recommends canonical discovery entities. The current
safe boundary is:

    first-class candidates: TRACE, PLACE
    future candidates only after canonical proof: SERVICE, EVENT, structured EXPERIENCE
    community evidence: REVIEW, RATING, PHOTO, TIP, COMMENT, creator provenance

`POST` is not a forbidden domain object. It is an existing contextual
contribution primitive, and it must not become the default For You candidate.
The same rule applies to `TRACER`: creator identity may explain a Trace or
provide provenance, but creator popularity is not the product objective.

### What remains valid

- Core owns the public Feed facade, signed session/cursor boundary, typed
  `TRACE`/`PLACE` contract, server-side candidate generation, deterministic
  ranking, diversity selection, hydration, and event intake.
- Existing TraceDee canonical state remains useful: traces, stops, places,
  saves, follows, journeys, completions, Trace ratings, posts, comments,
  reports, blocks, mutes, quality/taste projections, audit, idempotency, and
  outbox/event primitives.
- `aevo-admin` is the intended privileged control plane. Typed config
  revisions, validation, publish/rollback, moderation queue/action routes,
  app-scoped permission checks, CSRF, idempotency, expected-version/status
  checks, and audit boundaries remain the correct control model.
- Explicit area/query/coarse-location request context, stable cursors,
  deterministic fallback, and SHADOW-before-LIVE are retained.
- Aevo Play availability/hold/confirm remains server-authoritative. Feed may
  link to it or consume bounded availability evidence; Feed must not duplicate
  booking state.

### What changes

- The target pipeline becomes:

      Candidate Generation
        -> Eligibility
        -> Feature Hydration
        -> Entity Calibration
        -> Contextual Scoring
        -> Re-ranking
        -> Module Selection
        -> Public Hydration

- Intent is split from session preference, long-term taste, and geographic
  context. Explicit current intent has the highest contextual authority and
  can override historical taste.
- Community material is attached to the discovery entity as evidence. It is
  not promoted to a top-level candidate merely because it has engagement.
- Discovery modules/shelves become a server-owned presentation contract over
  discovery entities. A module may contain evidence highlights, but it is not
  a social timeline.
- Discovery success is measured by useful downstream actions and trust, not
  time spent, likes, comments, shares, follower growth, or creator velocity.
- New development is tracked as `DISCOVERY-*`; old FEED phase history is not
  relabeled.

### Explicit classification of current functionality

| Capability | Current local state | Decision | Migration direction |
| --- | --- | --- | --- |
| Core Feed facade | `/api/v1/public/feed`; typed TRACE/PLACE response; signed session/cursor | KEEP | Extend contract only through discovery batches |
| TRACE candidates | `trace-v1`; publication, visibility, moderation, block/mute and profile checks | KEEP | Add source separation and entity calibration |
| PLACE candidates | `place-v1`; TraceDee places plus public store profiles; PostGIS/coarse area path | KEEP | Add quality/evidence/availability features by projection |
| Generic POST Feed candidate | Core public contract does not include it; demo client does | DEPRECATE AS CANDIDATE | Preserve contextual post APIs; keep out of For You |
| Post/Trace composer | `DiscoveryComposer`; demo-local publish creates POST/TRACE in local state | MODIFY | Replace main-feed posting prompt with discovery intent; move contribution to detail/journey contexts |
| Creator/TRACER candidate | Client/demo type and Trending Tracers panel; no Core live candidate contract | DE-EMPHASIZE | Keep creator provenance/follow as secondary signal |
| Follows | Trace/tracer follow tables and Following tab exist | KEEP, SECONDARY | Do not make follower growth the ranking objective |
| Trace ratings/reviews | First-class `tracedee_trace_ratings`; review text may start UNDER_REVIEW | KEEP | Use as Trace evidence; design Place review boundary separately |
| Place ratings/reviews | Public store profile has aggregate rating/review count; no inspected first-class Place review entity | EXTEND CAREFULLY | Confirm canonical owner before adding a Place review model |
| Comments/replies | Post thread + depth-bounded comments (0/1), helpful reaction, edit/delete/report | KEEP, BOUND | Detail-surface discussion/evidence, not Feed candidates |
| Media | Public/profile/demo URLs and UI galleries; no TraceDee media asset/quarantine pipeline found | REVISE | Private upload -> moderation -> approved public variants |
| Moderation | States, reports, evidence/current snapshots, audit, block/mute, Core/Admin controlled slice | EXTEND | Add automated text/image/relevance/authenticity checks, policy scopes, propagation, appeals decision |
| Feed config | Typed, versioned, bounded Core lifecycle with Admin publish/rollback | KEEP | Add typed discovery signals/modules/evidence controls; no arbitrary SQL/code |
| Feed events | Core strict intake/outbox/inbox/stats plus TraceDee activity compatibility sink | EXTEND | Add discovery semantic taxonomy and retention/privacy classification |
| Session context | Request-derived FeedSessionContext, query/area/coarse location, fixed cutoff/cursor | KEEP | Add session preference from bounded recent events; no database by default |
| Long-term taste | TraceDee taste affinities and Core affinity signal; not a clearly separated discovery profile contract | EXTEND | Add explainable versioned projection with decay/confidence |
| Location | PostGIS places, map viewport, area/coarse geohash boundaries | KEEP | Separate operational map location from retained personalization location |
| Ranking | Deterministic baseline plus personalized SHADOW/LIVE mode and quality/taste/popularity/penalty features | EXTEND | Add entity calibration, intent hierarchy, discovery objective, reasons |
| Re-ranking/diversity | Core diversity selector and exploration stage exist | KEEP/EXTEND | Add category/area/business/lineage/seen rules and module quotas |
| Modules | UI sidebars exist; no server Module Selector | ADD | Server-owned modules over TRACE/PLACE inventory |
| Community evidence | Scattered ratings, counts, comments, activity and quality projections | ADD PROJECTION | Define evidence contract and confidence; do not add a Feed candidate type |
| Admin | `/go/feed` and `/go/feed/moderation` typed Core boundary | KEEP/EXTEND | Add Personalization, Sources, Modules, Evidence, Safety panels |
| Booking integration | Canonical Hub booking/hold/confirm and Go public APIs | KEEP BOUNDARY | Availability is optional feature/module input, never duplicated Feed state |
| Analytics/experimentation | Events/health plus bounded read-only outcome and guardrail snapshot exist; causal/session attribution remains incomplete | EXTEND | Shadow evaluation, metric ownership, guardrails, canary, rollback |

### Current-state matrix and evidence index

The detailed matrix, file/symbol evidence, UI map, and documented-vs-code
comparison are in [21-discovery-direction.md](docs/feed-system/21-discovery-direction.md).
Personalization, signal hierarchy, candidate V2, modules, config graphs and
Admin additions are in [22-personalization-architecture.md](docs/feed-system/22-personalization-architecture.md).
Community evidence, UGC/NSFW policy, media gap, review/comment boundary,
privacy and eventual data model are in
[23-community-evidence-and-ugc.md](docs/feed-system/23-community-evidence-and-ugc.md).
The screen-level Aevo Go and aevo-admin plan is in
[24-discovery-ui-and-admin.md](docs/feed-system/24-discovery-ui-and-admin.md).
New phases, dependency graph, V1/V2 definition, performance/failure/test
strategy, approvals and next-batch gate are in
[25-discovery-roadmap-and-verification.md](docs/feed-system/25-discovery-roadmap-and-verification.md).

### FEED-009-MODERATION truth boundary

`BATCH-FEED-009-MODERATION` remains a controlled local source/build/unit and
stubbed BFF/browser slice, but its Core moderation adapter now has connected
development-database evidence. Core migration
`0034_feed_moderation_adapter_boundary.sql` was applied through the Core
migration runner and the real TraceDee RPC boundary passed duplicate-report
dedupe, atomic review, exact idempotent replay, soft remove/restore, and stale
expected-status conflict checks. This is
not production moderation completion: deployed-origin/browser evidence,
cache/suppression propagation, media variants, appeals, and legacy Hub
moderation cleanup remain open. No legacy data was deleted.

### DISCOVERY-004 profile projection lifecycle truth boundary

TraceDee/Supabase remains the canonical owner of the existing profile/taste
projection tables. Migrations `tracedee_profile_projection_lifecycle` and
`tracedee_profile_deletion_propagation` now provide service-role-only,
profile-scoped `REBUILD`/`DELETE` job RPCs, retryable worker task routing, and
account-delete anonymization that preserves only aggregate-safe activity event
shape. A connected development test created a generated test user, rebuilt
one profile from canonical signals, deleted every seeded derived row, deleted
the auth user successfully, verified zero profile/evaluation residuals, and
removed the exact temporary job rows. The append-only test activity event was
retained only in anonymized form by design.

This is not a production profile platform claim: source-level provenance,
freshness/coverage health, job metrics and dead-letter observability,
production scheduling, authenticated deployed browser evidence, media/storage
ownership, and LIVE personalization remain open. The worker task boundary is
fail-closed without `SUPABASE_SECRET_KEY`; browser roles receive no table or
RPC grant. No canonical Trace/Place content or legacy compatibility data was
deleted.

### DISCOVERY-006A authenticated negative feedback truth boundary

Core migrations `0035_feed_negative_feedback.sql` and
`0036_feed_negative_feedback_history.sql` are the single owner for
authenticated Go Feed hide state, private transition history, and the
server-only idempotency ledger. The
public mutation accepts only a Core-signed item token plus the matching Feed
session; Core resolves the actor from the GO app session, requires CSRF and a
bounded idempotency key, and stores no anonymous cookie identity. Active
feedback is applied before ranking/hydration by the canonical TRACE/PLACE
candidate queries. Connected development evidence covers exact replay,
idempotency conflict, token/session binding, candidate suppression/restoration,
RLS, and append-only hide/unhide history. Go now provides allowlisted reason
selection and a last-action undo affordance. Anonymous live Explore
hide/unhide is deliberately session-local: it never sends a negative-feedback
mutation or anonymous identity to Core, while an authenticated hide records
its `core` persistence mode so an expired session cannot silently clear the
durable state. The policy unit test and full Go checks cover this boundary.
The private history read route and Go panel are now bounded to the
authenticated GO actor and return no raw token/hash fields. Connected
development profile rebuild/delete propagation is now verified separately;
deployed browser evidence and production rollout remain separate. No legacy
data was deleted.

The new direction makes this boundary more important: moderation must cover
community evidence and media before public hydration, and a safe/visible item
must also be relevant, authentic, and useful for the target place/Trace.

### Revised success objective

The ranking system may use discovery feedback as features, but product
success is evaluated separately. The primary outcome family is useful
discovery progression: qualified Place/Trace open, save, map/directions,
booking open/start/complete, Trace start/complete, useful review interaction,
and valid revisit/return signals. Trust guardrails include moderation
exposure, hide/not-interested rate, report rate, duplicate/repetition rate,
quality complaints, fake-engagement anomalies, and creator/business
concentration. No single outcome is promoted to a hard production weight in
this audit.

### Revised dependency graph

    DISCOVERY-001
    direction + entity/evidence/signal contract
          |
          +-------------------+-------------------+
          |                   |                   |
    DISCOVERY-002       DISCOVERY-003       DISCOVERY-008
    intent/session      UGC/media safety    Admin config design
          |                   |                   |
          +---------+---------+-------------------+
                    |
              DISCOVERY-004
              profile + entity features
                    |
              DISCOVERY-005
              Candidate Generation V2
                    |
              DISCOVERY-006
              calibration + contextual score
                    |
              DISCOVERY-007
              re-rank + modules + public evidence
                    |
              DISCOVERY-009
              Go UI/contribution migration
                    |
              DISCOVERY-010
              shadow -> canary -> production rollout

`DISCOVERY-002`, `DISCOVERY-003`, and `DISCOVERY-008` can be designed in
parallel after `DISCOVERY-001`, provided they share the accepted typed
contract. Runtime implementation must still respect the security, migration,
and deployment gates in ADR-000 and the existing FEED notes.

### Exact next implementation batch

`DISCOVERY-001` and the bounded `DISCOVERY-002` request/session slice are now
implemented and verified locally. A controlled Go slice of
`DISCOVERY-007` and `DISCOVERY-009` is also complete: module refs are resolved
only against server-issued TRACE/PLACE tokens, live mode uses an intent surface
instead of the demo generic composer, and the flat fallback remains available.
The connected Core moderation-adapter slice of `DISCOVERY-003` and the
connected Core runtime smoke for the entity-only `FOR_YOU` module in
`DISCOVERY-007` are now verified. The Core selector also has a bounded
TRACE/PLACE-backed portfolio for `FOR_YOU`, `NEAR_SELECTED_AREA`,
`NEW_AND_USEFUL`, and area-scoped `COMMUNITY_FAVORITES`; shared contracts,
OpenAPI, Admin order controls, and Core tests pass. A connected Core smoke also
uses scoped canonical TRACE/PLACE fixtures to prove a non-empty response for
all four supported modules. Core now exposes a read-only source-health boundary
through the typed Admin route, reporting canonical TRACE/PLACE/store-profile
availability, eligible counts, and bounded freshness state; it does not claim
availability quota policy or owning projections for booking/journey. The facade smoke proves
that canonical TRACE data survives the real pipeline and that module references
match the signed hydrated item. TraceDee/Supabase is the
canonical moderation owner during the transition and Core owns the adapter
migration. The development media boundary now includes a server-only
rejected/deleted cleanup plan and an authenticated worker task that removes
only allowlisted private objects; the production media/storage/variant owner
is still not named. Therefore public media/evidence hydration, a new upload
table, generic Post candidates, and broad legacy deletion remain disabled. The
controlled canonical Place save projection is implemented through Core and Go
with connected RLS/idempotency/reversibility tests, but is not a Customer
favorites replacement or a production route switch.

## Controlled implementation evidence — `DISCOVERY-001` / `DISCOVERY-002`

The user explicitly authorized implementation after the direction audit. The
controlled local slice is complete:

- `DISCOVERY-001`: shared/Core/Go contracts now freeze `TRACE`/`PLACE` as
  first-class candidates, keep community material as evidence/provenance,
  allowlist safe reasons/evidence fields, classify signal confidence, separate
  outcome/guardrail/operational metrics, map legacy events conservatively, and
  fail closed when `POST`/`TRACER` candidates are injected.
- `DISCOVERY-002`: Core validates URL-owned `vibe/category/date/party`, binds
  the request-local context into the signed cursor fingerprint, and applies
  deterministic vibe/category filters to candidate queries. Go forwards the
  same context and resets its query-key pagination when intent changes.
- Contract-only `DISCOVERY-003` safety work adds fail-closed UGC/media status
  and no-NSFW-bypass contracts across shared/Core/Go.
- A partial `DISCOVERY-007` module boundary adds optional entity-only modules
  with opaque item refs and safe context reasons while preserving the flat
  `items` compatibility response. The bounded source portfolio currently
  supports `FOR_YOU`, `NEAR_SELECTED_AREA`, `NEW_AND_USEFUL`, and
  area-scoped `COMMUNITY_FAVORITES`; Core validates the order and selects only
  TRACE/PLACE inventory, while Admin exposes the order controls. Go consumes
  refs through a token-matching adapter, renders entity-only shelves, dedupes
  module items, and falls back to the flat response when modules are absent. A
  connected Core integration tests verify the real canonical TRACE → ranking
  → hydration → module-reference path with signed item tokens, including a
  non-empty four-module TRACE/PLACE fixture; evidence/availability health,
  booking/save/journey projections, and deployed browser evidence remain open.
  The module selector reserves each configured shelf's minimum entity set
  before filling broad shelves and therefore does not repeat an entity across
  emitted modules; unsupported saved/booking/journey module identifiers are
  removed from the shared, Go, and OpenAPI contracts.
- A controlled `DISCOVERY-009` Go slice replaces the generic live composer
  with a request-local discovery-intent prompt and keeps the Post/Tracer
  composer explicitly demo-only. The live sidebar no longer presents a
  follower-centric Trending Tracers panel.
- A partial `DISCOVERY-004` Core feature guard now reads the latest matching
  taste projection version as of the signed Feed cutoff, carries evidence and
  calculated-at metadata only inside Core, and applies minimum evidence,
  confidence, half-life decay, future/stale neutral fallback, and bounded
  affinity before SHADOW comparison. This does not claim an async profile
  rebuild/delete worker or source-level provenance for the projection.
- A partial `DISCOVERY-008` typed config slice now carries explicit-intent
  precedence, taste evidence/decay policy, bounded server-owned module limits,
  evidence freshness, and fail-closed public evidence/media switches through
  the shared contract, Core validator, OpenAPI, and Admin form. Old revisions
  normalize to safe defaults, and public evidence/media `true` is rejected
  until the connected pipeline exists. A connected Core lifecycle test now
  proves that non-default discovery weight/module settings round-trip through
  the real database draft/validate/publish/runtime/rollback path; authenticated
  Admin browser evidence and the public safety pipeline remain open.
- A partial `DISCOVERY-006` Core ranking seam now propagates explicit category
  intent into the Trace candidate query, matches known area/category/vibe
  facets conjunctively, and blends explicit intent with deterministic and
  SHADOW scores using the bounded, versioned `discovery.intentMatchWeight`
  config. The contextual re-ranker now applies typed category/area/business
  caps and carries a bounded signed seen-key window across cursor pages. The
  default intent weight is `0.35`; raw intent, scores, seen state, and private
  taste remain server-only. A connected event test now proves that signed
  `PLACE` outcomes (`impression`, `open`, `place_open`, `booking_click`) are
  accepted, consumed, and projected into daily stats; this is ingestion
  evidence only, not causal outcome evaluation or LIVE activation. Core now
  exposes `GET /api/v1/admin/go/feed/discovery-evaluation?days=1..90` to show
  bounded outcome counts and guardrails with the explicit
  `INGESTION_ONLY_NO_CAUSAL_ATTRIBUTION` status; it is read-only and does not
  change ranking.
- Core migration `0034_feed_moderation_adapter_boundary.sql` was applied only
  to the development database through the Core migration runner and verified
  as migration 37. No public media pipeline, new event collection, LIVE
  personalization, booking fan-out, or legacy deletion was performed.

Verification evidence is recorded in
`docs/feed-system/phase-notes.md` under the Discovery batch entries.
