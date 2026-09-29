# Analytics and observability

ARCHITECTURE REVIEW REVISION

## Request telemetry

Every Feed request and event ingest should have:

- requestId;
- trace/span ID when available;
- application and environment;
- surface/tab;
- feedSessionId;
- config/ranking version;
- principal type, not raw identity in logs;
- generator outcome/timing;
- candidate and final item counts;
- cache outcome;
- degraded/fallback reason.

Keep content text, precise location, and private preference values out of logs.

## Metrics

Operational metrics:

- request rate and status by surface;
- p50/p95/p99 total and stage latency;
- generator timeout/error/degraded rate;
- candidate pool size and empty response rate;
- duplicate/dropped/suppressed count;
- diversity/concentration measurements;
- TRACE/PLACE calibration drift and source/entity-type domination;
- cache hit/miss and coalescing rate;
- cursor invalid/expired rate;
- event accepted/rejected/duplicate rate;
- outbox lag, retry, dead-letter, and consumer age;
- projection freshness and rebuild failures;
- moderation eligibility projection freshness and invalidation lag;
- config propagation age/version mismatch;
- media ready/quarantine/failure rate.

Product metrics:

- impressions to open;
- open to save/follow/share;
- quick-back and dismiss;
- completion/rating where applicable;
- report rate;
- cohort uplift versus deterministic baseline;
- anonymous versus authenticated coverage.

Feed exposure telemetry must include the selected experiment variant/seed without requiring a per-user assignment table by default.

## Traces and logs

Create child spans for config load, each generator, ranking, diversity, hydration, and event enqueue. Log one structured summary per request and detailed generator diagnostics only at a sampled/debug level.

Use stable error codes such as FEED_CONFIG_UNAVAILABLE, FEED_CURSOR_INVALID, FEED_GENERATOR_DEGRADED, FEED_HYDRATION_EMPTY, FEED_EVENT_REJECTED, and FEED_RATE_LIMITED. Do not expose internal SQL or credential errors to clients.

## Guardrail dashboard

aevo-admin should display the evaluation window, active config/version, cohort, latency, creator concentration, diversity, hide/quick-back, report rate, event lag, and propagation health. A green UI state must mean the server has sufficient observations and all required checks pass, not merely that a config flag is enabled.

## Data quality

Monitor event coverage: response-served count versus valid impression count, duplicate token rate, event timestamp skew, missing item version, invalid session, and out-of-order consumer updates. Missing telemetry must be visible as an instrumentation problem rather than silently treated as zero behavior.
