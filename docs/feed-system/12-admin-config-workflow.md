# Admin configuration workflow

ARCHITECTURE REVIEW REVISION

Visual map of the config lifecycle and runtime fallback: [`20-config-and-feed-flow-graphs.md`](20-config-and-feed-flow-graphs.md).

## Ownership

aevo-admin is the long-term Feed control plane. Core API and its canonical migration/database boundary own the configuration lifecycle and authorization. The UI is a server-rendered/BFF client of Core API and never writes Supabase flags directly.

aevo-hub/apps/admin is transitional. It already contains useful moderation, projection, reputation, and ranking screens, but it must not become a second source of truth. Port those capabilities into aevo-admin, then remove the old workspace only after the standalone deployment and Core handlers are healthy.

## Configuration lifecycle

    DRAFT
      -> VALIDATING
      -> VALID
      -> PUBLISHED
      -> ACTIVE
      -> SUPERSEDED
      -> ROLLED_BACK or ARCHIVED

A published revision is immutable. The active pointer changes atomically. Rollback activates a previously validated revision and creates a new audit event; it does not mutate history.

## Admin flow

1. Read active revision and recent drafts.
2. Create or edit a typed draft.
3. Validate server-side and show errors/warnings.
4. Display a field-level diff against active revision.
5. Require reason/incident ticket and confirmation.
6. Publish through Core API with idempotency and CSRF.
7. Persist audit and config publication event.
8. Invalidate runtime config caches and verify propagation.
9. Show active version, rollout, last propagation status, and rollback action.

The UI should group controls by candidate sources, ranking, diversity, rollout, safety, and observability. It should not expose arbitrary JSON as the normal workflow.

## Runtime versus infrastructure boundary

### Runtime-tunable values

aevo-admin may control safe, validated values:

- Feed/surface enablement and candidate-source enablement;
- candidate budgets and optional source minimums;
- ranking weights, mode, freshness, geo radius, and trending thresholds;
- diversity caps, exploration quota, source ratios, and repetition caps;
- cache TTL within bounded limits;
- event sampling;
- rollout percentage, experiment variants, and kill switches.

### Infrastructure/deployment-only values

aevo-admin must not expose:

- SQL, table names, RPC names, ranking expressions, or database credentials;
- Pub/Sub, Cloud Tasks, Cloud Run, or storage configuration;
- storage credentials;
- unbounded worker concurrency;
- unsafe timeout, query, connection-pool, or retry limits.

Infrastructure values are reviewed and deployed through infrastructure/repository ownership, not a runtime Feed config form.

Every runtime setting must declare type, minimum, maximum, default, validation rule, and safe fallback. Core API enforces these values even when a field is not rendered by the current Admin UI.

## API surface

Recommended Core API resources:

- GET /api/v1/admin/go/feed/config;
- GET /api/v1/admin/go/feed/config/revisions;
- POST /api/v1/admin/go/feed/config/drafts;
- POST /api/v1/admin/go/feed/config/drafts/{id}/validate;
- POST /api/v1/admin/go/feed/config/drafts/{id}/publish;
- POST /api/v1/admin/go/feed/config/revisions/{version}/rollback;
- GET /api/v1/admin/go/feed/guardrails;
- GET /api/v1/admin/go/feed/propagation;

Every response includes requestId and version identifiers. Mutation bodies include an idempotency key and reason. The endpoint validates the complete config, not just the fields rendered in the current browser.

## Safe controls

First-class controls should include:

- enabled/kill switch;
- candidate generator enablement and budgets;
- ranking mode DETERMINISTIC/SHADOW/LIVE;
- weights with bounded ranges;
- diversity caps and exploration quota;
- stable rollout percentages/cohort key;
- latency and empty-feed guardrails;
- event sampling/retention policy;
- config expiry or review date.

Secrets, provider credentials, raw SQL, arbitrary model code, and direct table selectors are never Feed config fields.
