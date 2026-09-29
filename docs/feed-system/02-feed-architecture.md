# Target Feed architecture

ARCHITECTURE REVIEW REVISION

กราฟที่รวม config control plane กับ target request flow อยู่ที่ [`20-config-and-feed-flow-graphs.md`](20-config-and-feed-flow-graphs.md).

V1 is explicitly limited to TRACE and PLACE, deterministic serving, SHADOW-only personalization, no ML/vector retrieval, no creator/post/collection candidates, no full experimentation platform, and no mandatory materialized session candidate list.

## Target request flow

    Aevo Go
      -> Edge Gateway
      -> Core API / Customer Feed facade
      -> session and policy resolution
      -> config/session snapshot resolution
      -> parallel candidate generators
      -> eligibility and suppression
      -> feature hydration
      -> deterministic/personalized ranking
      -> diversity and policy constraints
      -> typed item hydration
      -> signed cursor/session response
      -> asynchronous event ingest

The browser sees one endpoint and one response contract. It does not know which generator produced an item, how weights were applied, or which database table supplied it.

## Recommended service boundary

Use aevo-core-api as the public Customer API facade because the Edge Gateway already signs and forwards to Core API, Core owns app-scoped sessions and authorization, and aevo-admin treats Core API as the privileged source of truth.

During the data transition, Core may use a private server-side adapter to the existing TraceDee/Supabase data plane. That adapter must be isolated behind a repository interface so a later Cloud SQL/read-model migration does not change the Go contract. Do not restore aevo-hub/apps/gateway as a second public gateway; aevo-hub README explicitly says Hub no longer owns that boundary.

If operating a second database connection from Core is rejected for network, ownership, or latency reasons, create a separately deployable customer-data service behind a private Core-to-service contract. Do not route the browser directly to Supabase or add ad hoc public handlers to aevo-hub.

## Server pipeline

### 1. Request normalization

Validate surface, tab, limit, query, area, category, location context, cursor, and client capability. Normalize Unicode search terms, clamp bounds, and derive a canonical request fingerprint. Resolve current time once per request.

### 2. Principal and policy

Resolve GO app session, anonymous principal, privacy preferences, blocks, mutes, account requirements, entitlements, and rate limits. Client-provided filters are hints; server policy can narrow them.

### 3. Config snapshot

Read the active immutable Feed config version and create a FeedSessionContext. The session snapshot includes feedSessionId, surface, startedAt, candidateCutoffAt or rankingEpoch, configVersion, rankingVersion, stable experimentSeed, requestFingerprint, expiration, candidate limits, diversity rules, rollout decision, and kill switch. Subsequent pages use the session reference time rather than recalculating freshness against wall-clock now.

### 4. Candidate generation

Run independent generators with bounded budgets. A slow or failed optional generator must not fail the whole Feed. Each result carries source name, candidate count, timing, and a bounded candidate list. The generator does not decide final ordering.

### 5. Eligibility and suppression

Filter the canonical moderation-to-eligibility projection, publication, visibility, delete state, block/mute relations, duplicate identities, policy exclusions, and already-served/session exclusions. Apply a second safety check after hydration. A remote moderation request is not a mandatory hot-path dependency.

### 6. Features and ranking

Hydrate only the features required by the active ranking version. Use deterministic ordering as the baseline and keep personalized ordering in SHADOW until guardrails have evidence. All tie-breakers must be deterministic.

### 7. Diversity and constraints

Apply creator, place, entity-type, area, topic, and repeated-lineage caps after scoring. Enforce exploration quotas as an explicit selection rule, not as an unexplained score bonus. Diversity output must be measured.

### 8. Hydration

Resolve typed public summaries and media variants. Hydration failure removes the item or uses a safe fallback; it never returns partial private fields.

### 9. Response and telemetry

Return typed items, nextCursor, requestId, feedSessionId, configVersion, rankingVersion, and server-supported event metadata. Enqueue delivery evidence asynchronously.

## Initial rollout boundary

The first universal endpoint should support TRACE and PLACE only, because those are the only two live sources currently composed by the Go explore page. It should preserve deterministic trace behavior and public place discovery while moving interleaving, deduplication, cursoring, and event identity to the server.

POST and TRACER should be added only after their eligibility, privacy, media, and moderation contracts are complete. Collections are not a current domain object and should not be invented as a Feed-only table.

## V1 contract

V1 serves TRACE and PLACE only. The server uses deterministic ranking and explicit entity-type calibration/diversity. Authenticated personalization may be computed in SHADOW, but it does not change served order. V1 excludes ML ranking, vector retrieval, creator candidates, POST candidates, Collection candidates, a full experimentation platform, and mandatory full-feed materialization.

V1 uses a stable session seed, a fixed candidate cutoff/reference time, deterministic keyset ordering, and a signed cursor. Materialized session candidate lists are a later option for expensive personalized exploration or when mutable sources make stateless keyset semantics insufficient.
