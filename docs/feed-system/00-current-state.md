# Feed system current state

Audit date: 2026-09-23

ARCHITECTURE REVIEW REVISION

This document records the repository and runtime state observed before any Feed implementation work. The workspace is a polyrepo, and several repositories contain uncommitted or untracked user work. The findings below are read-only observations; this audit did not modify application code, migrations, dependencies, or worktrees.

## Executive finding

TraceDee has a substantial foundation, but Aevo does not yet have a server-owned universal mixed feed.

The current customer experience is split across two independent reads:

1. Aevo Go calls GET /api/v1/public/tracedee/feed for TraceDee trace items.
2. Aevo Go calls GET /api/v1/public/discovery for public place/store items.
3. The browser interleaves the two arrays in explore-page.tsx.

The current TraceDee SQL function returns TRACE rows only. POST, TRACER, and collection-style items are present in client/demo types or adjacent domain tables, but they are not served by the live TraceDee feed query. This means the browser currently owns a piece of feed composition that must move behind a server boundary before ranking, diversity, stable pagination, experimentation, or reliable analytics can be correct.

The inspected Core API and Edge Gateway do not contain public TraceDee route handlers. Core API currently exposes the Go admin settings, feature-flag, overview, authentication, and platform-control routes. The Go client therefore has a declared live API dependency whose implementation is not present in the inspected Core/Edge path. The plan treats that contract gap as the first implementation gate.

## Repository map

| Repository | Observed responsibility | Feed relevance |
| --- | --- | --- |
| aevo-go | React/Vite Web/PWA/Capacitor customer client | Discovery UI, client queries, impression observer, typed Zod response parsing |
| aevo-hub | Hub UI, Supabase packages, TraceDee repositories, historical/transition migrations, legacy admin | Current TypeScript/Supabase data boundary and most existing TraceDee implementation |
| aevo-core-api | .NET Core API, Cloud SQL migrations, app sessions, platform RBAC, Admin API | Recommended public gateway/auth and canonical control-plane owner |
| aevo-contracts | Versioned cross-repository contracts | Public feed request/response and Admin config contracts |
| aevo-edge-gateway | Cloudflare ingress, HMAC signing, CORS, request IDs | Browser ingress; currently forwards every API request to Core API |
| aevo-admin | Standalone privileged Admin UI/BFF | Long-term feed configuration, ranking, moderation, analytics controls |
| aevo-background-worker | Pub/Sub/Cloud Tasks/connection-probe worker skeleton | Intended async event and projection consumer; TraceDee outbox is not connected |
| aevo-infrastructure | GCP/Cloud Run/Cloud SQL/Pub/Sub/Cloud Tasks/Terraform | Runtime, secret, queue, and observability provisioning |
| aevo-accounts | Identity broker and SSO | App-scoped identity source; no feed logic |
| aevo-play, aevo-pos, aevo-digital-sing | Other first-party applications | No Feed work in the first slice |

## Current data and domain foundation

The Supabase migrations and packages contain:

- tracedee_places with optional Store linkage, area/category/topic tags, latitude/longitude, PostGIS geography, and moderation state;
- tracedee_traces with creator, lifecycle status, visibility, lineage, cover place, area, topic tags, and publication timestamp;
- trace stops, saves, follows, tracer follows, journeys, completions, ratings, posts, comments, reports, notifications, blocks, and mutes;
- profile, expertise, taste-affinity, and content-quality projection tables;
- activity events, event outbox, idempotency keys, feed impressions, feed interactions, and recommendation snapshots;
- deterministic and taste-personalized shadow/live ranking SQL, stable-hash rollout cohorts, ranking evaluations, and guardrail reports;
- moderation audit and projection replay/rollback functions.

This is materially ahead of a blank-slate design. The new plan must reuse these concepts and explicitly identify which parts are transitional rather than assume they do not exist.

## Current client behavior

The live explore page uses separate TanStack Query requests and client-side interleaving. The live trace response contract is TRACE-only and includes a raw rankScore, reasonParams, and trackingToken. The place discovery contract is a separate public-store/map result contract. DiscoveryCard supports TRACE, PLACE, POST, and TRACER presentation, but the live server response does not provide one common envelope for all four.

The client has an IntersectionObserver impression callback at a 0.5 visibility threshold. It derives the position from the current DOM parent. That is useful UI behavior, but position and item identity must be supplied by a server-issued feed session/item token for trustworthy measurement.

## Current control-plane split

There are two overlapping feature-flag/config stores:

- Core SQL: aevo_go_settings and aevo_go_feature_flags, read and written through Core API and surfaced by aevo-admin.
- Supabase: tracedee_feature_flags, read by aevo-hub/packages/db/src/tracedee.ts and consulted directly by the TraceDee ranking SQL function.

The Core API GoFeatureFlagUpdateRequest contains enabled, rolloutPercent, and reason but no config field. The transitional aevo-hub ranking screen submits a config.mode payload, which the current Core API contract does not bind. A setting can therefore look changed in Admin while the feed SQL continues to use a different Supabase row or an old mode. This is the highest-risk ownership inconsistency in the current design.

## Current event and worker split

TraceDee activity events are inserted synchronously through a Supabase function and an outbox row. The aevo-hub worker currently polls query jobs and can rebuild TraceDee projections on an interval; it does not consume the TraceDee event outbox. The separate aevo-background-worker has Pub/Sub and Cloud Tasks configuration and an internal Pub/Sub route, but event persistence is still a not-configured response. The infrastructure provisions a domain-events Pub/Sub topic, dead-letter topic, subscription, and commands queue, but no Feed-specific consumer or warehouse sink is connected.

## Migration ownership caveat

aevo-hub/README.md states that Core API owns migration writes and that old Supabase migrations are historical compatibility input during the data transition. The TraceDee migrations currently visible in aevo-hub are nevertheless the only concrete Feed schema and SQL implementation in this workspace, and much of that work is untracked in its repository.

Before adding more schema, FEED-000 must choose one of these explicit paths:

- temporarily run a private Supabase data adapter from the canonical Customer API and keep new Feed schema changes under a named transition owner; or
- promote the TraceDee domain/read model into the Core-owned database migration boundary.

The architecture-review recommendation is a private server-side adapter for V1, with Core as the owner of new Feed control-plane migrations and a later Core-owned Feed read model. No new Feed migration is allowed until [ADR-000](ADR-000-feed-data-ownership.md) is accepted.

## What is ready to reuse

- app-scoped opaque Go sessions and Core platform RBAC;
- Edge request IDs, HMAC forwarding, CORS, and no-store defaults;
- TraceDee moderation states, block/mute filtering, idempotency, and audit concepts;
- keyset cursor shape and existing projection tables;
- typed Go and Hub contract patterns;
- GCP Pub/Sub and Cloud Tasks infrastructure primitives;
- the Aevo universal Query AST for Admin list/search/report consumers.

## What is not ready

- one public Feed endpoint with server-owned mixed composition;
- a single FeedItem envelope shared by server, Go, Admin, and analytics;
- signed/session-bound cursors;
- versioned draft/publish/rollback Feed configuration;
- a connected event consumer and retention/warehouse path;
- a production media attachment pipeline for TraceDee posts;
- real nearby ranking for the Feed surface;
- a stable, standalone Admin Feed control surface in aevo-admin;
- an authoritative datastore/migration owner for the TraceDee data plane.

The ownership decision is now an explicit FEED-000 prerequisite rather than an FEED-001 open item.
