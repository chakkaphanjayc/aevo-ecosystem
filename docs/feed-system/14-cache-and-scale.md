# Caching, database scaling, and performance

ARCHITECTURE REVIEW REVISION

## Performance target

Set an explicit initial SLO before tuning:

- p50 Feed response under 150 ms;
- p95 under 300 ms;
- p99 under 800 ms for a healthy deterministic request;
- event ingest does not block Feed response;
- optional generator timeout does not fail the request;
- no more than one database round trip per generator plus bounded hydration.

Measure at each pipeline stage rather than only at the edge.

## Cache layers

### Configuration cache

Cache the active validated config by environment/version in Core API. Include a short, bounded runtime TTL and publish invalidation. A stale config may continue only within the documented propagation bound; the last-known-good version is the fallback. Never cache drafts. Cache TTL is runtime-tunable only within an Admin-approved bound; connection pools, worker concurrency, retries, and unsafe query timeouts remain deployment configuration.

### Candidate/projection cache

Cache public candidate projections by normalized surface, filter, coarse location bucket, and version. Do not put actor-specific or private state in shared cache keys. Personalized features are applied after safe public candidates are read.

### Response cache

Anonymous, deterministic public discovery can be cached briefly if response privacy and cursor/session semantics are preserved. Personalized or authenticated pages should use private/no-store behavior until session-aware caching is proven. The current Edge Gateway deliberately sets no-store; changing this requires a measured design, not a header tweak.

### Stampede control

Use request coalescing, bounded stale-while-revalidate, and per-key timeouts. Never allow a cache miss to fan out into unbounded generator work.

## Database improvements

The current TraceDee ranking SQL contains correlated count subqueries and broad query matching. Before broad traffic:

- add maintained count/quality aggregates or materialized projections;
- use keyset indexes on eligibility, published time, and stable ID;
- add declared full-text/trigram search indexes;
- use partial spatial indexes for visible public places;
- index activity by actor/item/time and outbox by status/available_at;
- partition or archive high-volume event/impression data;
- avoid selecting JSON debug fields in the public path;
- bound hydration IDs and use batched joins.

Any projection must have a rebuild, version, freshness, and rollback story. The existing projection replay/rollback functions are a useful pattern, but they do not roll back Feed config or universal item projections.

## Scaling path

Start with one Core API Feed module and existing database primitives. Add a dedicated read model only after query plans and traffic demonstrate need. Add a separate Feed service only when sustained latency, deployment isolation, or independent scaling justifies a new operational boundary. Do not introduce Redis, a vector database, an ML ranker, or a model-serving service before a measured bottleneck exists.

## Load testing

Load tests must cover anonymous For You, authenticated For You, Following, query, area, nearby, cursor pages, config publication, event batching, generator failure, and moderation churn. Record candidate counts, query plans, cache hit rates, and database connection pressure.
