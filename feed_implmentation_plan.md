Review the existing Feed implementation plan before any production implementation.

Do NOT modify application code, migrations, dependencies, infrastructure, or runtime configuration yet.

Update the existing Feed design and implementation documents based on the following architecture review.

==================================================

1. # ADD FEED-000 — DATA OWNERSHIP DECISION

Create an explicit FEED-000 task and ADR before FEED-001.

Resolve and document:

- canonical Feed/domain datastore owner
- migration owner
- Core vs Supabase ownership
- transitional adapter responsibility
- which repository is allowed to create schema migrations
- data access/network/secrets boundary
- long-term destination
- rollback strategy

No new Feed database migration may be implemented until FEED-000 is approved.

================================================== 2. STABLE FEED SESSION SEMANTICS
==================================================

The current signed cursor plan is necessary but insufficient to guarantee stable pagination.

Define a FeedSessionContext containing at least:

- feedSessionId
- surface
- startedAt
- candidateCutoffAt or rankingEpoch
- configVersion
- rankingVersion
- experimentSeed
- requestFingerprint
- expiration

Freshness and time-sensitive ranking for subsequent pages must use the Feed session reference time rather than recalculating against wall-clock now.

Design V1 to avoid mandatory full feed materialization.

Prefer:

stable session seed

- fixed candidate cutoff/reference time
- deterministic ranking
- keyset pagination
- signed cursor

Explain when materialized session candidate lists would become necessary later.

Update cursor tests to cover content inserted between page 1 and page 2.

================================================== 3. EXPERIMENT ASSIGNMENT
==================================================

Do not create a per-user feed_experiment_assignments table as the default architecture.

Use deterministic bucketing such as:

hash(experiment_id + stable_user_key + salt)

for stable assignment.

Persist only:

- experiment definitions
- variants
- rollout rules
- manual overrides if required

Record exposure through Feed analytics events.

Explain exceptions where persisted assignment is necessary.

================================================== 4. ADMIN CONFIGURATION SAFETY BOUNDARY
==================================================

Clearly divide:

A. Runtime tunable Feed configuration
B. Infrastructure/deployment-only configuration

aevo-admin may control safe runtime values such as:

- feed/surface enablement
- candidate source enablement
- candidate budgets
- ranking weights
- ranking mode
- freshness
- geo radius
- trending thresholds
- diversity caps
- exploration quota
- cache TTL within bounded limits
- event sampling
- rollout percentage
- kill switches

aevo-admin must NOT expose arbitrary:

- SQL
- table names
- RPC names
- ranking expressions
- database credentials
- Pub/Sub configuration
- storage credentials
- unbounded worker concurrency
- unsafe timeout/query limits

Every runtime setting must define:

- type
- minimum
- maximum
- default
- validation
- safe fallback

================================================== 5. MIXED ENTITY SCORE CALIBRATION
==================================================

TRACE and PLACE do not share identical engagement semantics.

Add an explicit feature normalization/calibration layer.

Architecture:

candidate
→ entity-specific feature extraction
→ entity-specific calibration
→ common normalized feature space
→ global scoring
→ diversity/composition selector

Document how TRACE and PLACE signals map to common score ranges.

Add configuration for:

- source candidate budgets
- optional source minimums
- entity-type maximum ratios
- consecutive entity caps
- place repetition caps
- Trace repetition/lineage caps

Prevent a high-volume generator from dominating the final Feed simply because it produced more candidates.

================================================== 6. EVENT SEMANTICS
==================================================

Before FEED-006 implementation, create a versioned Feed event specification.

Precisely define:

- impression
- engaged view
- open
- click
- save
- share
- trace start
- trace complete
- place open
- booking click

Define browser/Web/PWA/Capacitor behavior consistently.

Document:

- viewport threshold
- duration threshold
- duplicate suppression
- batching
- retry
- timestamp skew
- offline behavior
- idempotency

Event envelope should include appropriate fields such as:

eventId
schemaVersion
eventName
occurredAt

userId or anonymousId
sessionId
feedSessionId

itemToken

surface
position

entityType
entityId

candidateSource

configVersion
rankingVersion
experiment variants

Do not persist precise user location in analytics unless explicitly required and reviewed.

Prefer coarse region/geo-cell/distance buckets where possible.

================================================== 7. MODERATION HOT-PATH DESIGN
==================================================

Do not make a remote moderation check a mandatory synchronous Feed dependency.

Prefer:

canonical moderation state
→ eligibility projection
→ Feed candidate filtering

Use last-known-good eligible state where safe.

Unknown/new content without a valid eligibility state must fail closed.

Document:

- projection freshness
- invalidation
- deletion propagation
- suspension propagation
- stale cache bounds
- outage fallback

================================================== 8. IMPLEMENTATION PARALLELISM
==================================================

Revise dependency planning.

Suggested structure:

FEED-000
→ FEED-001

then:

FEED-002 config control plane
and
FEED-003 Feed facade

can partly proceed in parallel after contracts stabilize.

FEED-004 depends on FEED-003.

FEED-005 depends on Feed candidates and config.

After the public contract is stable:

FEED-006 event pipeline
FEED-008 Aevo Go integration
FEED-009 aevo-admin UI

should be able to progress partly in parallel.

FEED-007 projection optimization should be evidence-driven from query plans/load testing and should not unnecessarily block client integration.

FEED-010 remains a production launch requirement.

FEED-011 POST/TRACER remains post-V1.

================================================== 9. DEFINE FEED V1 EXPLICITLY
==================================================

Document the exact first production scope.

Default recommendation:

Entities:

- TRACE
- PLACE

Serving ranking:

- deterministic

Personalization:

- SHADOW only initially

No V1:

- ML ranker
- vector database
- creator feed candidate
- POST candidate
- Collection candidate
- full experimentation platform
- mandatory fully-materialized feed

Clearly mark anything outside V1.

================================================== 10. REUSE EXISTING GCP ASYNC INFRASTRUCTURE
==================================================

The repository audit found existing:

- GCP Pub/Sub
- dead-letter support
- Cloud Tasks
- Cloud Run
- observability infrastructure

Prefer those existing primitives for Feed events unless there is a measured reason to introduce another queue system.

Do not add Cloudflare Queue only for architectural symmetry.

Cloudflare may still remain appropriate for Edge/CDN/R2 responsibilities.

================================================== 11. UPDATE ACCEPTANCE TESTS
==================================================

Add tests for:

- item insertion between Feed page requests
- deterministic session ordering
- entity-type score calibration
- candidate-source domination
- experiment deterministic assignment
- config bounds
- last-known-good config
- moderation projection outage
- analytics event semantic consistency
- no precise location leakage
- cross-repo contract compatibility
- old Go client against new backend where compatibility applies
- new Go client during rollback to compatibility route

================================================== 12. OUTPUT
==================================================

Update:

feed-implementation-plan.md

and all affected docs/feed-system documents.

Clearly mark changed sections with:

ARCHITECTURE REVIEW REVISION

At the end provide:

1. Decisions changed
2. Tasks added/removed
3. Revised dependency graph
4. Revised V1 scope
5. Remaining architecture blockers
6. Exact approval gate for beginning FEED-000 / FEED-001

Then STOP.

Do not implement production code yet.
