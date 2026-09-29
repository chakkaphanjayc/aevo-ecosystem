# Config validation, versioning, and experiments

ARCHITECTURE REVIEW REVISION

อ่านกราฟภาพรวมของ config lifecycle, fallback และ Feed runtime ได้ที่ [`20-config-and-feed-flow-graphs.md`](20-config-and-feed-flow-graphs.md).

## Typed configuration

Define one versioned schema shared by Core API validation, runtime deserialization, and aevo-admin form contracts. The schema must reject unknown fields, invalid enums, non-finite numbers, out-of-range percentages, negative limits, and unsafe combinations.

Illustrative sections:

    schemaVersion
    enabled
    killSwitch
    candidateSources
    ranking
    diversity
    rollout
    budgets
    safety
    analytics

Use a server-owned JSON schema or strongly typed record plus explicit cross-field validators. JSONB is acceptable as storage; it is not a substitute for validation.

## Cross-field rules

Examples:

- LIVE requires a rankingVersion that exists and guardrails enabled;
- rollout percent must be within 0..100;
- a disabled generator cannot have a non-zero required quota;
- diversity caps cannot make a page impossible when the candidate pool is below the cap;
- exploration quota is bounded and cannot bypass eligibility;
- event retention cannot be shorter than the evaluation window;
- a kill switch overrides LIVE and selects deterministic behavior;
- config expiry requires an operator review or a safe fallback;
- only allow-listed reason codes and feature families may be enabled.

## Revision storage

Proposed Core-owned tables:

    feed_config_revisions
    feed_config_publications
    feed_config_validation_results
    feed_experiment_definitions
    feed_experiment_variants
    feed_experiment_overrides
    feed_config_audit_events

Do not create feed_experiment_assignments per user by default. Store experiment definitions, variants, rollout rules, salts, and narrowly scoped manual overrides only when needed. Use deterministic bucketing from experiment ID, stable server-resolved user/anonymous key, and salt. Record exposure through Feed events.

Persisted assignment is an exception for cross-device continuity requirements, regulated holdouts, support override/audit, or another documented need. It must have expiry, scope, privacy review, and an explicit reason.

Store normalized config, schema version, status, author, reason, source revision, validation result, created/published timestamps, and an immutable content hash. The active pointer should include an optimistic concurrency version.

## Rollout

Assign cohorts with a stable keyed hash of experiment ID + stable server key + salt. Never use Math.random per request for a rollout. Record the variant/exposure in evaluation telemetry and include only a non-sensitive experiment seed/variant in the Feed session context.

SHADOW compares candidate/order outcomes without changing serving. LIVE canary rollout is stepped only after guardrails pass. A kill switch must be available at the runtime layer and tested under cache staleness.

## Version propagation

On publish:

1. Core commits the immutable revision and active pointer;
2. Core emits a config publication event;
3. runtime adapters refresh or receive the version;
4. Feed responses report the observed version;
5. propagation health is visible in Admin;
6. rollback publishes a new pointer/event.

If runtime has no valid config, serve the last known valid version. If none exists, use a code-defined deterministic safe baseline and raise an alert. Never serve an unvalidated draft.

## Field safety contract

Every runtime setting defines:

- type;
- minimum;
- maximum;
- default;
- validation;
- safe fallback.

Config validation tests must cover bounds, unknown fields, cross-field combinations, last-known-good fallback, kill-switch behavior, and rejection of infrastructure-only values.

## FEED-002 implemented field-safety matrix

The Core validator `feed-config-v1` implements the following bounded runtime contract. An invalid revision never becomes active; runtime resolution uses the last valid revision, a cached last-known-good snapshot during a transient database outage, and then the deterministic code baseline.

| Field | Type / default | Bounds or enum | Safe fallback | Runtime-tunable |
| --- | --- | --- | --- | --- |
| `schemaVersion` | string / `1` | fixed enum `1` | baseline `1` | No |
| `enabled` | boolean / `true` | boolean | baseline | Yes |
| `killSwitch` | boolean / `false` | boolean; overrides LIVE and rollout | deterministic mode | Yes |
| `candidateSources.*.enabled` | boolean / `true` | boolean | baseline source state | Yes |
| `candidateSources.*.budget` | integer / `100` | `0..200`; disabled source must be `0` | baseline budget | Yes |
| `candidateSources.*.minimum` | integer / `1` | `0..50`, never above budget; disabled source must be `0` | baseline minimum | Yes |
| `ranking.mode` | enum / `DETERMINISTIC` | `DETERMINISTIC`, `SHADOW`, `LIVE`; LIVE requires guardrails | deterministic | Yes |
| `ranking.version` | safe identifier / `deterministic-v1` | 1–64 alphanumeric/`._-` characters | `deterministic-v1` | Yes |
| `ranking.freshnessWindowHours` | integer / `168` | `1..720` | `168` | Yes |
| `ranking.weights.*` | decimal / `0.4, 0.2, 0.2, 0.2` | each `0..1`, total exactly `1.0` | baseline weights | Yes |
| `diversity.maxConsecutiveSameSource` | integer / `2` | `1..5` | `2` | Yes |
| `diversity.maxSourceRatio` | decimal / `0.75` | `0.5..1`; a single source must be allowed to fill a page | `0.75` | Yes |
| `diversity.explorationQuota` | decimal / `0.1` | `0..0.25`; cannot bypass eligibility | `0.1` | Yes |
| `geo.maxCoarseRadiusMeters` | integer / `50000` | `100..50000`; coarse only | `50000` | Yes |
| `rollout.percent` | integer / `100` | `0..100` | `100` with no experiment | Yes |
| `rollout.experimentId` / `salt` | safe identifier / `null`, `feed-v1` | 1–64 safe characters when present | no experiment | Yes |
| `rollout.variants` | array / `[]` | max 8; unique keys; percentages total `100` | no experiment | Yes |
| `budgets.pageSize` | integer / `24` | `1..50`; cannot exceed enabled candidate budget | `24` | Yes |
| `budgets.cacheTtlSeconds` | integer / `30` | `0..300` | `30` | Yes |
| `safety.guardrailsEnabled` | boolean / `true` | LIVE requires `true` | `true` | Yes |
| `safety.requireModerationProjection` | boolean / `true` | must remain `true` | `true` | No (safety invariant) |
| `safety.maxEligibilityAgeSeconds` | integer / `60` | `5..3600` | `60` | Yes |
| `analytics.enabled` | boolean / `true` | boolean | `true` | Yes |
| `analytics.samplePercent` | integer / `100` | `0..100` | `100` | Yes |
| `analytics.retentionDays` | integer / `90` | `7..365` | `90` | Yes |

Unknown fields, SQL/table/RPC names, ranking expressions, credentials, provider/storage settings, Pub/Sub/Cloud Tasks/Cloud Run settings, worker concurrency, connection-pool/timeout/retry controls, and arbitrary JSON paths are rejected recursively. Experiment assignment is a stable keyed hash of experiment ID, a server-resolved stable user/anonymous key, and salt; no assignment table is created by default.
