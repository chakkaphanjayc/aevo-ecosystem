# Caching and scaling

Status: proposed performance design; no cache or tile infrastructure change authorized

## Current cache behavior

The existing Go Map query uses TanStack Query with a bounded key containing
viewport/filter state, previous-data behavior, and a short stale window.
The OSM client adapter keeps a five-minute in-memory cache and in-flight
deduplication. These are useful client safeguards, but they do not provide
shared server cache, stable canonical data, or cross-instance invalidation.

Evidence:

- aevo-go/src/features/map/use-map-discovery.ts
- aevo-go/src/features/map/osm-service.ts
- aevo-go/src/features/map/map-page.tsx

## Cache layers

### Layer 1: browser query cache

Keep the current separation:

- camera state is not automatically a committed query;
- query key includes normalized bbox, zoom, filters, mode, and sort;
- stale responses are cancelled/ignored;
- previous results may remain visible with loading state;
- user-specific filters are never shared through a public cache key.

### Layer 2: Edge/public response cache

For anonymous public Place reads:

- normalize query ordering and numeric precision;
- use a bounded TTL and ETag/conditional requests;
- include projection/version in the cache key;
- vary by locale only when response fields differ;
- do not cache authenticated/private responses in a shared cache;
- preserve attribution and freshness metadata;
- apply request/rate limits before expensive cache misses.

### Layer 3: Core/application cache

Use only for stable public projections and metadata:

- category/area dictionaries;
- Place detail read model;
- capability summary with explicit freshness;
- source attribution metadata.

Do not cache live booking decisions as if they were Place facts.

### Layer 4: database/read projection

Use PostGIS indexes and a compact public discovery projection. Refresh it
through approved domain events/jobs or deterministic rebuilds. Keep rebuild
and rollback observable.

### Tile/style provider cache

Tile and style caching follows provider terms. Aevo should not assume that a
tile response can be freely stored or re-served. Place overlay tiles, if
introduced, need their own license, versioning, invalidation, and attribution
policy.

## Invalidation

Invalidate or revalidate on:

- canonical Place revision;
- merge/split/redirect;
- status publish/close/remove;
- verification badge change;
- capability projection change;
- source import accepted/reverted;
- category/taxonomy change;
- attribution/license change.

Prefer versioned projection keys and targeted invalidation. A full global
cache flush should be an emergency tool, not the normal workflow.

## Scale path

### Stage A: bounded API

- canonical relational projection;
- PostGIS viewport/nearby reads;
- compact JSON response;
- browser/Edge cache;
- client clustering;
- list fallback.

### Stage B: read projection and load tuning

- measure query plans, rows scanned, connection use, payload size;
- precompute stable search keys/facets;
- add keyset indexes only with evidence;
- use projection refresh jobs and stale markers;
- separate detail/capability reads from viewport payload.

### Stage C: vector tiles

Use only if Stage B cannot meet measured payload/latency goals:

- versioned tile generation from canonical Place projection;
- canonical Place ID in every feature;
- dynamic capability data fetched separately;
- tile invalidation by region/projection version;
- list/search API remains available;
- attribution follows all source/provider terms.

### Stage D: global/very large scale

Reassess storage, regional partitioning, source coverage, and provider
contracts. Do not pre-provision a global tile/search architecture for the
current evidence.

## Load-test scenarios

Use realistic fixtures for:

- dense Bangkok viewport;
- dense Chiang Mai viewport;
- sparse/rural viewport;
- large zoomed-out viewport with truncation;
- category and price filters;
- search this area;
- nearby with repeated panning;
- popular Place detail;
- source import/projection refresh while users query;
- merge/status invalidation during cache hits.

Measure:

- p50/p95/p99 latency;
- rows scanned and index use;
- response bytes and marker count;
- Postgres connections and pool wait;
- Edge/application cache hit ratio;
- stale projection age;
- cancellation and error rates;
- tile payload/hit ratio if Stage C is enabled.

Targets should be agreed from current product traffic before hard-coding
SLOs. Record both warm-cache and cold-cache results.

## Failure and stale-data policy

If source ingestion fails, serve the last valid canonical projection and expose
its freshness internally. If the projection is too stale for a capability,
remove the capability badge or mark it stale; do not fail open to unverified
external data.

If cache invalidation fails:

- keep revision/version checks in responses;
- allow short TTL expiry to converge;
- alert on stale keys;
- provide targeted Admin revalidation;
- preserve audit of the failed invalidation.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

Map overlay and ranked Search/Nearby use separate cache classes and budgets.
Overlay cache keys contain normalized viewport, zoom, public filters,
projectionVersion, locale/attribution variant, and source policy. Search/Nearby
keys contain ranking/filter/cursor state and must not be shared with overlay
payloads. Detail and live capability have their own freshness and cache rules.

The public discovery projection must expose projectionVersion, sourceRevision,
generatedAt, freshness, rebuild status, invalidation key, and last-known-valid
version. Rebuilds are asynchronous and auditable; a failed rebuild continues
to serve the last valid projection with an explicit stale signal.

Vector tiles, if introduced, consume the same overlay projection and canonical
IDs. They cannot contain live booking/queue state. A tile/JSON migration must
not require Search, Detail, Feed, Trace, or Save identity changes.
