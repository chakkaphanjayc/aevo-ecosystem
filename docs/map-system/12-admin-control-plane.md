# Admin control plane

Status: read-only registry and workflow queue routes/shells implemented;
privileged workflow commands remain gated

## Existing boundary

aevo-admin/docs/REPOSITORY_BOUNDARY.md defines the standalone privileged
Admin application and server-only BFF. It states that Core API owns
canonical API handlers, database migrations, platform RBAC, and audit state.
The Admin browser must not receive a service-role credential or call
Supabase directly.

The standalone Admin currently has routes such as:

- applications;
- users and organizations;
- connections and system;
- audit logs;
- Aevo Go dashboard and settings;
- dashboard/subscriptions.

The inspected standalone route tree has no Place registry, source ingestion,
conflation, claim, verification, or community-review surface yet. The
transitional Hub admin has TraceDee moderation routes, which are useful
evidence but should not become a second long-term control plane.

## Proposed Admin areas

### Place registry

- search and filter by canonical ID, slug, name, category, area, lifecycle,
  source, verification, and updated time;
- view public detail and internal provenance;
- inspect revisions, redirects, source links, and downstream references;
- publish, limit, close, restore, or remove with reason.

### Source and ingestion

- source registry and license packet;
- import runs, status, counts, freshness, and failures;
- raw/normalized record inspection with protected access;
- source disappearance and takedown queue;
- dry-run/replay/rollback controls;
- provider rate/circuit status.

### Conflation

- candidate pairs and confidence;
- map/distance/name/address evidence;
- keep separate, link, merge, split, or defer;
- protected/verified field view;
- impact preview for Feed/Trace/Save/booking.

### Business claims and verification

- claim queue and competing claims;
- organization/branch scope;
- evidence review;
- selected-field verification;
- expiry/revocation;
- public badge preview and audit.

### Community moderation

- submission queue;
- duplicate candidates;
- edits and evidence;
- reporter/submitter privacy;
- approve/reject/needs-info/appeal;
- revision and rollback link.

### Operations

- query latency and error dashboards;
- projection freshness;
- cache/tile invalidation;
- source and license alerts;
- dead-letter/retry counts;
- audit trail and operator runbook.

## Permission model

Permissions should be explicit and separated from organization membership:

- map.place.read;
- map.place.manage;
- map.source.read;
- map.source.manage;
- map.conflation.review;
- map.claim.read;
- map.claim.decide;
- map.submission.review;
- map.projection.rebuild;
- map.audit.read;
- map.rollback;

Names are provisional; final permission IDs must follow the Core platform RBAC
catalog. Dangerous actions require:

- authenticated ADMIN app-scoped session;
- platform role/permission;
- active Admin application boundary;
- CSRF validation at the BFF;
- idempotency key;
- required reason/ticket;
- before/after audit snapshot;
- actor/request ID.

## Query behavior

Admin list/search/report screens should reuse the universal typed query
platform where the data is a structured collection. The query must flow
through:

auth -> scope -> permission -> entitlement/quota -> typed AST validation
-> metadata allowlist -> RLS/data access -> audit/observability.

No raw SQL, table name, source provider, tenant, or moderation decision should
come from the browser. A Place-specific read model may add spatial filters to
the allowlisted AST.

## API ownership

The recommended direction is:

~~~text
aevo-admin browser
  -> aevo-admin same-origin BFF
  -> Edge/Core API admin handler
  -> canonical Place service/data owner
~~~

The BFF is presentation/auth plumbing, not a second source of truth. A Hub
transition adapter may be used only while MAP-000 records it, with a clear
sunset and no new privileged writes.

## Audit and rollback

Every mutation should capture:

- application code;
- actor and platform role;
- target Place/source/submission/claim;
- action;
- reason/ticket;
- before/after or revision IDs;
- source/import run;
- request ID and idempotency key;
- created time;
- result/error.

Rollback should be a new audited command that restores a prior revision or
disables a run. Do not delete audit history to “undo” an operation.

## Admin UX safety

- show system-of-record and freshness on every data panel;
- distinguish runtime unavailable from empty data;
- never fabricate counts or health;
- require confirmation for merge/split/close/restore/revoke;
- preview public impact before publishing;
- show whether an action is reversible;
- protect private evidence and personal data;
- provide keyboard-accessible review controls;
- preserve filters and query state in URL where possible.

## Delivery gate

Admin implementation is not unblocked until:

1. canonical Place owner and API are approved;
2. permission catalog is mapped;
3. claim/submission/conflation lifecycles are versioned;
4. Core audit/idempotency contract is available;
5. source/license evidence policy is accepted;
6. the transition from Hub moderation is explicitly scheduled.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

aevo-admin may begin a read-only Place registry/review shell as soon as the
stable Admin contracts and permission metadata exist. It must show provenance,
geometry type, parent/child relations, projection version, freshness, and
redirect state without offering privileged mutation buttons prematurely.

Business claims/verification and community submissions/edits are parallel
backend tracks after MAP-001 and MAP-003. The Admin shell can expose separate
queues and read-only context for both; each mutation is enabled only when its
own Core command, audit, RLS, idempotency, and rollback contract is live.

Place geometry review must support point, polygon/multipolygon summary,
displayPoint, labelPoint, bounding geometry, parent, and child relations.
V1 need not provide indoor editing.
