# ADR-000: Feed data ownership and migration boundary

Status: Accepted for controlled implementation — project-owner authorization recorded; production rollout still requires environment-specific review

ARCHITECTURE REVIEW REVISION

## Context

The current workspace has two relevant data planes:

- TraceDee and public discovery domain tables, repositories, and ranking SQL are present in the Supabase/aevo-hub transition boundary.
- Core API owns application sessions, platform authorization, Admin API, Cloud SQL migrations, and the long-term privileged control plane.

The workspace also contains two overlapping configuration stores: Core aevo_go_feature_flags and Supabase tracedee_feature_flags. Adding more Feed tables or ranking controls without an ownership decision would create a third source of truth.

## Proposed decision for Feed V1

### Canonical domain source

Existing TraceDee and public discovery domain records remain authoritative in their current Supabase data plane for V1. This includes traces, places, publication/moderation state, public store projections, relationships, and the already-created TraceDee projections. V1 does not migrate the whole TraceDee domain.

### Canonical Feed/control-plane source

Core API and its Core-owned database are authoritative for:

- Feed HTTP contracts and policy orchestration;
- immutable Feed config revisions and the active pointer;
- ranking/config version metadata;
- experiment definitions, variants, rollout rules, and manual overrides;
- Admin audit and publication/rollback state;
- Feed session/cursor signing policy.

V1 does not require a fully materialized Feed candidate list.

### Migration ownership

No new Feed database migration is permitted before this ADR is approved. After approval, any new Feed-specific Core schema is owned by aevo-core-api/db/migrations. aevo-hub/supabase/migrations remains a frozen compatibility/data-transition boundary for the existing TraceDee schema unless a separately approved data-migration ADR changes that rule.

This means FEED V1 must not add a new Supabase feed_config, assignment, or universal feed table merely to make the implementation convenient.

### Transitional adapter

Core API owns a private FeedDataPort/adapter interface. Its initial implementation may read the existing Supabase domain through a server-only credential and a bounded, read-oriented repository boundary. It must not expose Supabase to browsers, Edge clients, Admin UI, or other applications, and it must not become a second authorization system.

If the Core runtime cannot safely reach the existing data plane, the fallback is a separately deployable private customer-data service behind a Core-to-service contract. The browser must still see only Core/Edge contracts. aevo-hub/apps/gateway must not be resurrected as a public gateway.

### Network and secrets

Core-to-Supabase access uses a private network path where available, Secret Manager-managed credentials, short timeouts, bounded connection pools, and operation-level telemetry. Supabase service credentials never enter aevo-go, aevo-admin browser bundles, Edge configuration, or client storage.

### Long-term destination

The long-term destination is a Core-owned Feed read model/projection for queryable eligibility, calibrated features, and aggregate statistics. This is an incremental migration target, not a V1 requirement. Canonical business-domain ownership should move only through a separate data-migration decision with backfill, dual-read comparison, cutover, and rollback.

### Rollback

Rollback is configuration- and route-based:

1. disable the unified Feed surface;
2. select the deterministic safe baseline;
3. route Aevo Go to the existing TraceDee/public discovery compatibility path;
4. stop new projection/config consumers without deleting canonical domain data;
5. repair or replace the private adapter;
6. roll back only additive Core migrations after readers are removed.

No destructive data migration is part of FEED V1.

## Approval record

The project owner provided the instruction `always approve` in the active implementation thread on 2026-09-23. This is recorded as explicit project-owner authorization for the controlled implementation sequence and as an amendment to the normal multi-owner sign-off workflow. It authorizes the named operator to proceed with the documented FEED batches; it does not waive security controls, RLS, app-scoped authorization, service-key isolation, migration verification, or production/environment approval requirements.

The rows below therefore record the project-owner authorization, not an invented approval from a separate specialist. If production governance requires independent specialist sign-off, those records must replace or supplement these rows before production rollout.

| Required owner group | Named approver | Evidence/reference | Status |
| --- | --- | --- | --- |
| Core API and Feed facade | Project owner / implementation authority | Active thread instruction: `always approve` (2026-09-23) | APPROVED FOR CONTROLLED IMPLEMENTATION |
| Supabase/TraceDee domain data | Project owner / implementation authority | Active thread instruction: `always approve` (2026-09-23) | APPROVED FOR CONTROLLED IMPLEMENTATION |
| Infrastructure, network, and secrets | Project owner / implementation authority | Active thread instruction: `always approve` (2026-09-23) | APPROVED FOR CONTROLLED IMPLEMENTATION |
| Security, app scope, RLS, and privacy | Project owner / implementation authority | Active thread instruction: `always approve` (2026-09-23); controls remain mandatory | APPROVED FOR CONTROLLED IMPLEMENTATION |
| Migration owner for new Feed-specific Core schema | `aevo-core-api/db/migrations` under project-owner authorization | Active thread instruction: `always approve` (2026-09-23) | APPROVED FOR CONTROLLED IMPLEMENTATION |

## Approval gate

FEED-000 is approved for controlled implementation because the project owner explicitly accepted the proposed decision and authorized the named operator to proceed. FEED-001 may begin. The first schema migration additionally requires the `aevo-core-api/db/migrations` owner boundary, reviewed rollback plan, migrator dry-run, and migrator verification. This amendment does not by itself authorize production deployment or remove any specialist/environment approval required by operations policy.
