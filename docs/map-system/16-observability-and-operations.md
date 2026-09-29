# Observability and operations

Status: proposed operating model; no telemetry or alert implementation authorized

## Observability goals

Operators must be able to answer:

- Which Place projection/version did a user query?
- Was the response served from client, Edge, application, or database cache?
- Which bounds/filter/cursor policy was applied?
- How many rows were scanned and returned?
- Was the result stale, truncated, or attribution-limited?
- Which source/import run changed a Place?
- Why did a conflation, claim, verification, or submission decision occur?
- Which downstream Feed/Trace/booking projections were refreshed?

Do not log raw user locations, private evidence, service credentials, or
unbounded query payloads.

## Request metrics

Public Map/Search:

- request count by route/version/status;
- p50/p95/p99 latency;
- timeout/cancellation rate;
- 4xx by validation reason;
- 5xx by dependency;
- result count, truncation, payload bytes;
- cache hit/miss and ETag revalidation;
- projection version and freshness age;
- PostGIS rows scanned/index plan class where safe to expose internally.

Admin:

- queue age by type;
- review throughput and rejection/approval rates;
- claim conflict count;
- merge/split/rollback count;
- private evidence access failures;
- authorization denials and CSRF/idempotency failures.

## Ingestion metrics

Per source and run:

- fetch success/failure;
- HTTP status/rate-limit responses;
- bytes/records fetched;
- parse/validation failures;
- normalized/matched/unmatched counts;
- high/medium/low/conflict match counts;
- review queue age;
- published/rolled-back fields;
- source freshness and disappearance count;
- dead-letter/retry count;
- license/attribution configuration version.

## Logs and traces

Carry existing request IDs across:

~~~text
Edge -> Core API -> database/projection -> worker/job -> Admin action
~~~

Structured logs should include:

- route and contract version;
- request/job ID;
- bounded query fingerprint;
- actor/app/scope class, not sensitive identity fields;
- Place/source/submission/claim IDs;
- projection/import/revision versions;
- latency and result status;
- error class and dependency.

Traces must be sampled carefully for high-volume viewport reads. Preserve
enough trace context to diagnose slow PostGIS queries and projection lag.

## Alerts

Alert on:

- sustained public discovery p95/p99 regression;
- PostGIS connection pool exhaustion;
- index/query plan regression;
- high invalid-bounds or abuse rate;
- projection freshness beyond policy;
- source import failure or rate-limit circuit open;
- dead-letter backlog;
- attribution/config validation failure;
- claim/submission queue age;
- merge/rollback error;
- cache invalidation lag;
- missing audit event for a privileged mutation.

Alerts should link to a runbook and identify the owning repository/team.

## Operational runbooks

Minimum runbooks:

1. Public discovery timeout.
2. PostGIS/index or connection saturation.
3. Tile/style provider failure.
4. External source rate limiting/outage.
5. Source import partial failure.
6. Source disappearance/takedown.
7. Projection stale or rebuild failure.
8. Bad conflation/merge rollback.
9. Verification/claim abuse.
10. Community submission spam.
11. Cache invalidation failure.
12. Attribution/license configuration incident.
13. Admin/Core boundary unavailable.

Every runbook should state:

- detection;
- safe read-only checks;
- user impact;
- containment;
- rollback/replay;
- data integrity checks;
- communication/escalation;
- post-incident evidence.

## Data retention

Define retention separately for:

- public request metrics;
- raw source payloads;
- import runs;
- Place revisions;
- claims/evidence;
- community submissions;
- audit logs;
- device-location analytics.

Retention must respect privacy, legal hold, source terms, and operational
rollback needs. Do not retain raw device locations by default.

## Deployment and migration gates

Before production rollout:

- health/readiness includes the actual Place dependency state;
- feature flags fail closed;
- projection and source versions are visible;
- migration owner and rollback command are documented;
- dashboards exist before traffic is enabled;
- synthetic public query and Admin auth probes pass;
- attribution is checked in each supported UI state.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

Add separate operational dimensions for:

- Map overlay versus Search/Nearby versus Detail;
- projectionVersion/sourceRevision/freshness;
- map density/truncation and payload budget;
- geocoder provider, quota, attribution, cache, and failure;
- resolver depth, redirect loop/conflict, retired-ID write rejection;
- capability projection freshness versus live capability latency.

Projection rebuild dashboards must show requested version, applied version,
last-known-valid version, rebuild duration, failure reason, and invalidation
lag. Geocoder dashboards must not log raw user coordinates or private address
payloads.
