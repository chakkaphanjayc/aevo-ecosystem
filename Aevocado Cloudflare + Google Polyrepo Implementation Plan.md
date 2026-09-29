Aevocado Cloudflare + Google Polyrepo Implementation Plan

สถานะ: In implementation — Hub/Core local cutover complete
วันที่: 2026-09-23
ฉบับทบทวน: 2026-09-23 — contracts, Core migration ownership and local Edge/Core launcher implemented
ขอบเขต: Hub, Play, POS, Go, Admin, Digital Signage, Accounts, Core API, data platform, media, recommendation และ deployment
ข้อกำหนดหลัก: หลาย repository, deploy แยก, Cloudflare และ Google Cloud เป็นผู้ให้บริการหลัก, backend สามารถสร้างใหม่ได้

Implementation update (2026-09-23): `aevo-contracts` publishes the v1 Hub
route inventory and versioned client; Hub consumes that client; Core API owns
the app-scoped session/authorization boundary, onboarding state, and migration
runner; and local Hub launchers start Core API + Edge. Core now reports all
48 Hub contract routes as ready. The former Hub gateway, legacy SDK, Hub
migration writer, and unused API-client wrapper have been removed. Cloud
deployment and Supabase-to-Cloud-SQL reconciliation remain external gates.

1. Executive decision

Aevocado ใช้สถาปัตยกรรมแบบ polyrepo + independently deployable applications + modular-monolith backend:

Frontend และ edge ใช้ Cloudflare Workers

Backend ใช้ ASP.NET Core บน Google Cloud Run

Transactional database ใช้ Cloud SQL for PostgreSQL

Authentication ใช้ Google Cloud Identity Platform โดย Aevocado Accounts เป็น broker สำหรับ app-scoped sessions

รูปภาพใช้ Cloudflare Images; วิดีโอใช้ Cloudflare Stream; R2 ใช้ไฟล์ต้นฉบับ/exports ที่ไม่ต้อง transcoding

Background processing ใช้ Pub/Sub, Cloud Tasks, Cloud Scheduler และ Cloud Run Jobs

Search เริ่มด้วย PostgreSQL FTS + pg_trgm + PostGIS

Recommendation เริ่ม rules-based; เพิ่ม pgvector/Vertex AI เมื่อมี interaction data และ evaluation pipeline

Analytics events ส่งเข้า BigQuery; ไม่เก็บ impression log ระยะยาวทั้งหมดใน OLTP

ไม่สร้าง microservices ต่อ domain ในระยะแรก และไม่สร้าง Local Store Hub ในรอบนี้

เป้าหมายคือ deploy แต่ละแอปแยกได้ แต่รักษา contract, identity, telemetry และ release policy ให้สอดคล้องกันผ่าน versioned packages และ automation แทน monorepo tooling

2. Product and trust boundaries

Customers
└── Go: feed, discovery, map, booking, media, social, traces

Owners / organization managers
└── Hub: organizations, stores, apps, staff, configuration, billing

Operational staff
├── Play: booking operations
├── POS: order, queue, store operations
└── Digital Sign: queue/menu/status display

Platform operators
└── Admin: platform configuration, moderation, support, audit

Shared trusted backend
└── Aevocado Core API: authorization and business authority

Hub เป็น control plane ของร้าน แต่ไม่ใช่ network gateway ที่ Play/POS/Go ต้องเรียกผ่าน ทุกแอปเรียก Core API โดยตรงและ Core API ตรวจ identity, application assignment, organization/store scope, permission และ entitlement ทุกครั้ง

3. Repository topology

รักษา repository ที่มีอยู่และเพิ่ม repository เฉพาะที่เป็น deployment หรือ versioned contract boundary จริง

Repository

Stack

Deploy target

Ownership

aevo-hub

React Router Framework Mode

Cloudflare Workers

Merchant control plane

aevo-play

React Router Framework Mode

Cloudflare Workers

Booking workspace

aevo-pos

React + Vite, React Router Data Mode

Cloudflare Workers static/SPA

POS and queue operations

aevo-go

React Router + public SSR routes

Cloudflare Workers

Customer/social/discovery

aevo-admin

React Router Framework Mode

Cloudflare Workers, isolated

Platform operations

aevo-digital-sign

React + Vite PWA

Cloudflare Workers static/SPA

Display surfaces

aevo-accounts

React Router

Cloudflare Workers

Sign-in, callbacks, recovery, context selection

aevo-core-api

.NET 10 ASP.NET Core

Google Cloud Run

Business authority + DB migrations

aevo-background-worker

.NET 10 Worker/HTTP consumers

Cloud Run + Cloud Run Jobs

Async jobs and event consumers

aevo-edge-gateway

TypeScript Worker

Cloudflare Workers

API edge, public caching, upload bootstrap, domain resolution

aevo-contracts

OpenAPI + generated TypeScript SDK

npm registry/GitHub Packages

Cross-repo API contract

aevo-design-system

React, tokens, Storybook

npm registry + static Storybook

Shared UI

aevo-infrastructure

Terraform + deployment policies

GCP + Cloudflare

Infrastructure as code

Do not create separate repositories for every backend module. Booking, Orders, Social, Geo, and Recommendation begin as modules inside aevo-core-api; split only when runtime scaling, deployment cadence, compliance, or team ownership produces measured pressure.

3.1 Cross-repo contract rules

aevo-core-api owns the OpenAPI source and compatibility tests.

A successful API release publishes a versioned @aevocado/api-client from aevo-contracts.

Frontend repositories pin an exact compatible range and update through automated PRs.

Breaking API changes require a new API version or expand/migrate/contract release window.

aevo-design-system publishes tokens and components as immutable semver packages.

No frontend imports source code through relative paths from another repository.

No frontend has database credentials or calls Cloud SQL directly.

4. Frontend framework allocation

4.1 Hub

React Router Framework Mode + Cloudflare Vite plugin

SSR for authenticated shell and first load

TanStack Query for server data after hydration

TanStack Table, React Hook Form, Zod

HttpOnly app-scoped session

Organization/store context returned by Core API; never trust a client-supplied tenant alone

4.2 Play

React Router Framework Mode

Route loaders for access decisions and initial workspace context

Calendar/resource UI isolated from booking rules

Server is authority for availability, holds, confirmation, cancellation and conflicts

Realtime invalidates visible calendar windows; it does not replace canonical reads

4.3 POS

React + Vite SPA, React Router Data Mode

IndexedDB through a repository abstraction for cache, draft cart and retry-safe outbox

Cloud API is shared authority until Local Store Hub exists

Payment/refund, entitlement refresh and privilege elevation require online confirmation

Capacitor/Tauri only after device requirements are validated

4.4 Go

Use one repository with two deployable surfaces initially:

Public SSR routes: store, post and itinerary pages, SEO/Open Graph, QR landing

Authenticated React application: feed, map, search, booking, upload, comments, likes, saves, profile and notifications

Capacitor is the fastest first mobile package. Re-evaluate Expo/React Native when native camera/video editing, background location, push, deep native navigation or app performance becomes a primary product requirement. Share contracts/domain logic, not an assumption that all DOM UI can be reused.

4.5 Admin

Separate hostname, Cloudflare Worker, session audience and deployment credentials

Platform roles only; organization owner is not an admin

Mandatory MFA/step-up for high-risk operations

Impersonation is an expiring delegated session with persistent banner and audit record

4.6 Digital Sign

React + Vite PWA

Read-only scoped device token

Periodic canonical snapshot plus realtime invalidation

Device enrollment and revocation; never reuse staff sessions

5. Backend architecture

5.1 Runtime

.NET 10 LTS

ASP.NET Core Minimal APIs or controllers, selected consistently

EF Core for transactional aggregate persistence; Dapper for measured read-heavy queries

Npgsql for PostgreSQL

FluentValidation or equivalent at API boundary

OpenAPI generated from the running contract

OpenTelemetry for logs, metrics and traces

5.2 Modular-monolith structure

src/
Aevocado.Api/
Aevocado.SharedKernel/
Modules/
Identity/
Organizations/
Stores/
AppAccess/
Catalog/
Booking/
Orders/
Queue/
Social/
Media/
Geo/
Recommendation/
Notifications/
Moderation/
Billing/
Audit/
tests/
Unit/
Architecture/
Integration/
Contract/
Security/

Each module owns its domain types, application commands/queries, persistence mappings and public module interface. Cross-module writes use application interfaces or transactional outbox events. Direct table access across modules is forbidden except explicitly approved read models.

5.3 API groups

/v1/accounts/_
/v1/organizations/_
/v1/stores/_
/v1/access/_
/v1/catalog/_
/v1/bookings/_
/v1/orders/_
/v1/queues/_
/v1/feed/_
/v1/content/_
/v1/comments/_
/v1/media/_
/v1/discovery/_
/v1/traces/_
/v1/admin/\*

All write APIs use request IDs and idempotency keys where retry can create a duplicate. Mutable resources use version/ETag checks and return 409 on stale writes.

6. Identity and SSO

6.1 Identity provider

Use Google Cloud Identity Platform as credential/identity provider. Keep Aevocado authorization in Cloud SQL; Identity Platform tenants are not a substitute for organization/store membership.

Identity domains:

Identity

Applications

Authorization source

Customer

Go

customer profile + privacy/safety state

Workforce

Hub, Play, POS

membership + app assignment + scope + role/permission

Platform

Admin

platform assignment + privileged permission

Device

Digital Sign/POS device

device enrollment + app/store scope

6.2 Session flow

App → Accounts → Identity Platform authentication
→ Accounts sends one-time authorization code
→ App callback exchanges code server-to-server
→ App receives app-scoped HttpOnly Secure cookie
→ Core API enforces final authorization

Tokens never travel in query strings or localStorage

Callback validates state, PKCE verifier, intended app and allowlisted return path

Each app has its own cookie name/audience

Short access session; rotating refresh/session record

Sensitive Core API commands check current assignment/session status, not only stale claims

Global logout and membership revoke have measurable propagation SLA

During the migration, `aevo-accounts` is the only trusted broker between application
servers and the current Hub/Supabase identity adapter. It owns allow-listed redirects,
PKCE/state validation and the one-time handoff boundary; Core API remains the issuer and
authority for opaque app-scoped sessions. Identity Platform replaces the Hub adapter at
the provider boundary without changing application cookie or authorization contracts.

7. Data platform

7.1 Final choice

Use Cloud SQL for PostgreSQL as the system of record. Because backend development is still early and Google is a primary platform, do not introduce Supabase as an additional control plane. Cloud SQL supports PostgreSQL extensions required by the product, including PostGIS and pgvector.

Recommended environments:

One separate GCP project and Cloud SQL instance for production

Separate non-production GCP project; staging database must not share production credentials

Local PostgreSQL container for development

Automated backups, point-in-time recovery and deletion protection in production

Regional HA enabled before paid production SLA

7.2 Schemas

identity users, sessions, identities
platform organizations, stores, app subscriptions, feature flags
workforce memberships, assignments, scopes, roles, permissions
catalog categories, products, services, availability metadata
booking resources, schedules, holds, reservations
commerce orders, order lines, payments, queue tickets
social content, comments, reactions, follows, saves, reports
media assets, upload sessions, processing and moderation state
geo places, store locations, traces, itineraries, stops
recommendation features, candidates, ranking experiments
notification preferences, deliveries, inbox
audit privileged actions and security events
integration outbox, inbox, webhook delivery, idempotency records

Database roles:

app_runtime: normal Core API access

migration_runner: schema changes only in deployment job

analytics_exporter: narrow read/export permissions

support_readonly: audited break-glass read access

Do not expose Cloud SQL directly to browsers. Tenant isolation is enforced in Core API and reinforced with PostgreSQL RLS for tenant-owned tables where practical. Database session context is set within a transaction and always reset by transaction completion; connection pooling tests must prove context cannot leak between requests.

7.3 Migration policy

EF Core migrations owned by aevo-core-api

Migration runs as a one-shot Cloud Run Job, never automatically from every API replica

Use expand/migrate/contract changes

Destructive changes require backup verification and a later release

API rollback must remain possible after a forward-compatible migration

Seed only reference data; production content is never embedded in migration code

8. Map, search and travel traces

Map renderer: MapLibre GL JS with react-map-gl/maplibre

Development basemap: OpenFreeMap or configured provider

Production-controlled tiles: PMTiles on R2 only when traffic/cost/control justifies it

Business geo authority: Cloud SQL PostgreSQL + PostGIS

Discovery API returns bounded GeoJSON/read DTOs; never load every store

Initial clustering: MapLibre client clustering

Future dynamic vector tiles: add only after payload/latency thresholds are crossed

Required endpoints:

GET /v1/discovery/stores?bbox=&zoom=&filters=&cursor=
GET /v1/discovery/stores/nearby?lat=&lng=&radius=&cursor=
GET /v1/discovery/stores/:id
POST /v1/traces
PATCH /v1/traces/:id
POST /v1/traces/:id/publish

Trace privacy rules:

Raw trace is private by default

Published itinerary is a separate projection from raw location samples

Strip or blur home-like start/end points and sensitive timestamps

No public real-time precise location

Explicit collection, recommendation and sharing consent

Export/delete and retention controls

Location access is not required for basic Go browsing

9. Feed, social and recommendation

9.1 Social model

Core entities:

content_items as feed parent

content_media

comments limited to one reply level for MVP

separate content_reactions and comment_reactions

store_follows, user_follows, saves, blocks, mutes

content_reports, moderation_cases, append-only moderation_actions

Use keyset pagination (published_at, id), not offset. Counts are denormalized but reconcilable from source rows. Like/follow/save endpoints are idempotent and protected by unique constraints.

9.2 Recommendation phases

Phase R0 — explicit feeds:

Following

Nearby

Latest

Store

Phase R1 — explainable ranking:

score = recency + follow affinity + distance relevance + category interest + verified-quality boost + exploration boost - repetition penalty - safety penalty

Every recommendation records an impression and an explainable reason. Raw high-volume events go to BigQuery; Cloud SQL keeps only operational summaries and recent deduplication windows.

Phase R2 — vector/hybrid candidates:

Generate embeddings asynchronously

Store/query embeddings with pgvector or move candidate generation to Vertex AI when justified

Continue applying permission, block, availability, geographic and safety filters at canonical read time

Require offline evaluation plus an A/B test before production promotion

No ML ranking is required for MVP.

10. Media architecture

Media

Service

Database stores

User/store images

Cloudflare Images

asset ID, owner, dimensions, state, variants, moderation

User/store video

Cloudflare Stream

video UID, playback state, duration, thumbnail, moderation

Documents/exports/original archives

R2

object key, checksum, owner, retention

Upload flow:

Client requests upload session
→ Core API validates identity, quota, MIME and intended owner
→ Edge Gateway creates one-time direct upload URL
→ Client uploads directly to Images/Stream/R2
→ Webhook is verified and deduplicated
→ Background worker extracts metadata/moderates
→ Asset becomes READY
→ Content publication may reference only READY assets

States: CREATED, UPLOADING, PROCESSING, MODERATION_PENDING, READY, REJECTED, FAILED, DELETED.

11. Async processing

Use one primary async system on Google to prevent split-brain operational tooling:

Pub/Sub: domain-event fan-out and analytics pipelines

Cloud Tasks: retryable targeted commands, webhook delivery, notification send

Cloud Scheduler: periodic trigger only

Cloud Run Jobs: bounded batch/reconciliation/backfill

Cloudflare Queues only for a strictly edge-owned workload if a later measured need appears

Transactional outbox:

Business write and outbox record commit in one Cloud SQL transaction.

Publisher claims unpublished rows with locking.

Publish to Pub/Sub with event ID/schema version.

Consumer records event ID in inbox before side effects.

Retries remain idempotent; poison messages go to a dead-letter topic.

12. Caching and realtime

Cloudflare CDN caches public store/post/itinerary responses only

Cache keys include locale, safe filters and public domain context

Never cache personalized or authenticated responses publicly

Purge by tag/event after canonical publication changes

Start without Redis; add Memorystore only after cache/lock/rate-limit metrics justify it

Realtime carries lightweight invalidation, queue updates and notification hints—not trusted complete records

Client refetches canonical API data after an event

13. Deployment topology

Browser / App
↓
Cloudflare DNS + WAF + Turnstile + CDN
├── Cloudflare Workers: Hub, Play, POS, Go, Admin, Accounts
├── Images / Stream / R2
└── Edge Gateway Worker
↓ authenticated proxied request
Google Cloud Run
├── Core API
└── Background workers/jobs
↓
Cloud SQL PostgreSQL
Pub/Sub / Tasks / BigQuery / Secret Manager

Recommended region starts in Google Cloud asia-southeast1 after confirming Cloud Run, Cloud SQL and dependent service availability. Run latency tests from Thailand before locking production. Keep API, Cloud SQL and synchronous dependencies in the same primary region.

13.1 Origin protection

Public clients use api.aevocado.app, not the generated Cloud Run URL

Edge Gateway validates request shape, body limits, bot signal and coarse rate limits

Gateway signs origin requests with timestamp, request digest and rotating secret

Core API rejects missing/expired/invalid gateway signatures on public routes configured as gateway-only

Core API still validates end-user session and authorization; gateway signature is not user identity

Webhook providers use dedicated verified endpoints and provider signatures

Internal jobs use Google IAM service-to-service authentication

14. Environment model

Environment

Cloudflare

Google Cloud

Data

Local

Wrangler/local builds

local containers/emulators where useful

local PostgreSQL + fixtures

Preview

Worker preview/version

optional shared dev Cloud Run with isolated namespace

synthetic only

Staging

dedicated Workers routes

separate non-prod GCP project

staging DB

Production

production domains

production GCP project

production HA DB

Never let preview deployments connect to production Cloud SQL. Use allowlisted test identities and sanitized fixtures.

15. CI/CD per repository

15.1 Frontend repository pipeline

Install pinned dependencies
→ typecheck + lint
→ unit/component tests
→ build
→ dependency/secret scan
→ Cloudflare preview deployment
→ Playwright smoke
→ approval/promotion
→ production Worker version
→ post-deploy smoke + release marker

Use scoped Cloudflare API tokens per repository/environment. A Hub token cannot deploy Admin.

15.2 Core API pipeline

dotnet restore
→ format/analyzers
→ architecture + unit tests
→ PostgreSQL integration tests
→ contract/security tests
→ container build
→ SBOM + vulnerability scan
→ push Artifact Registry
→ migration dry-run against staging clone
→ deploy Cloud Run revision with no production traffic
→ smoke/contract tests
→ 1% / 10% / 50% / 100% traffic promotion
→ monitor SLO/error budget

Use GitHub Actions OIDC through Google Workload Identity Federation. Do not store long-lived GCP service-account keys.

15.3 Database release

Validate backup/PITR.

Run migration Cloud Run Job with migration-only identity.

Deploy backward-compatible API revision.

Verify metrics and data reconciliation.

Promote traffic.

Contract/remove old schema only in a later release.

15.4 Infrastructure pipeline

aevo-infrastructure owns Terraform for Cloud Run, Cloud SQL, Pub/Sub, Tasks, Scheduler, BigQuery, IAM, Secret Manager, Artifact Registry, Workers, R2 and DNS. Plans run on pull requests; production apply requires protected-environment approval. Terraform state is encrypted in a dedicated GCS bucket with versioning and narrow IAM.

16. Observability and SLOs

Propagate traceparent, request_id, app_name, app_version, safe tenant/store context and deployment revision from Cloudflare to Cloud Run.

Minimum dashboards:

Login/callback/session refresh failure

401/403/429/5xx by app and route

p50/p95/p99 API latency

Cloud SQL connections, CPU, locks, slow queries and replica/backup health

Booking conflict/hold expiry

Duplicate/retried order mutations

Feed query latency and examined rows

Upload success and processing age

Queue depth, oldest message, retries and dead letters

Moderation backlog and resolution SLA

Recommendation impressions and booking/save conversion

Initial SLO candidates:

Core API availability 99.9% monthly after production launch

Interactive API p95 under 500 ms excluding media transfer

Feed/discovery first page p95 under 700 ms from Thailand under representative data

Zero unauthorized cross-organization reads in automated negative tests

100% privileged Admin actions have actor, reason, target and timestamp

Queue oldest-message alerts defined per job criticality

17. Security gates

Threat model identity, multi-tenant access, media, traces, payments and admin

Server-side authorization on every consequential action

IDOR/BOLA negative tests across organizations/stores/users

App-scoped cookie and audience isolation tests

PKCE/state/code replay/open-redirect tests

MFA/step-up for Admin and dangerous merchant operations

Idempotency and replay tests for bookings/orders/webhooks

File magic-byte, size, quota and decompression-bomb controls

Signed upload URL expiry and ownership checks

Rate limits at edge and application layers

Secrets in Google Secret Manager or Cloudflare secrets, never repository variables/plain files

Dependency, container, IaC and secret scanning

Raw trace access audit and privacy retention tests

18. Implementation phases

Durations assume a small team and should be recalibrated after inventory.

Phase 0 — Architecture lock and repository bootstrap (Week 1–2)

Approve ADRs for polyrepo, .NET modular monolith, Cloud SQL, Identity Platform and event model

Create new repositories: Accounts, Core API, Worker, Gateway, Contracts, Design System, Infrastructure

Define CODEOWNERS, branch protection, release naming and environment ownership

Provision non-production GCP/Cloudflare foundations through Terraform

Establish OpenAPI and package publishing proof of concept

Exit: every repo builds independently; one generated SDK is consumed by a sample frontend; no shared production credential.

Phase 1 — Identity, tenancy and platform foundation (Week 3–6)

Identity Platform integration and Accounts flow

Users, organizations, stores, memberships, app assignments, scopes, roles and sessions

Core API request context, error model, idempotency and audit

App-scoped callbacks for Hub/Play/POS/Admin/Go

Cloud SQL migrations and integration-test harness

OpenTelemetry trace across Worker → Cloud Run → Cloud SQL

Exit: POS-only staff cannot enter Hub; Admin and workforce sessions are isolated; revoke behavior meets defined SLA.

Phase 2 — Hub vertical slice (Week 6–9)

Organization/store CRUD

App enablement and entitlement read model

Staff invitation and assignments

Store profile and location setup

Admin audit visibility for support

Exit: owner creates a store, enables an app and assigns staff without direct DB operations.

Phase 3 — Play booking vertical slice (Week 9–13)

Services/resources/schedules

Reservation hold, confirm, cancel

Concurrency and timezone/DST tests

Go public availability/booking entry

Booking notifications and reconciliation job

Exit: double booking is prevented under concurrent tests; retry is idempotent.

Phase 4 — POS and queue vertical slice (Week 12–17)

Catalog read model, cart, order and queue state machine

POS direct login/store selection

Digital Sign scoped device enrollment and queue display

IndexedDB draft/cache and online reconciliation

Payment integration only after order invariants pass

Exit: no duplicate order from retry; display cannot mutate store operations; offline limitations are explicit.

Phase 5 — Go discovery and map MVP (Week 15–20)

Public store pages, discovery API and PostGIS indexes

MapLibre map/list synchronization

Search this area, filters, nearby and stable pagination

Booking deep link into Play capability

Public CDN caching and invalidation

Exit: bounding-box queries remain within latency budget at representative store volume; map has accessible list fallback.

Phase 6 — Community/feed MVP (Week 19–25)

Content, image upload, comment, like, save, follow, block and report

Latest/Following/Nearby/Store feeds with keyset pagination

Moderation pipeline and Admin console

Notification inbox and invalidation events

Cloudflare Images direct upload and state reconciliation

Exit: hidden/pending content cannot leak; duplicate interactions are impossible; moderation action is audited.

Phase 7 — Video and published itineraries (Week 24–29)

Cloudflare Stream direct/resumable upload

Media webhook verification and processing states

Private trace draft and published itinerary projection

Location consent, retention, export/delete and endpoint blurring

Shareable SSR itinerary page

Exit: raw live location is never public; only READY/approved media is publishable.

Phase 8 — Recommendation and analytics (Week 28–34)

BigQuery event schema and ingestion

Impression/click/save/booking attribution

Explainable rules-based scoring and experiments

Feature store/read model for active users

pgvector candidate prototype only after baseline evaluation exists

Exit: ranking can be disabled by feature flag; experiment assignment is stable; recommendation improves a predefined metric without safety regression.

Future — Local Store Hub

Begin only when several POS/Kiosk/Queue devices must coordinate during sustained internet loss. Current work prepares IDs, idempotency, versioned events and repository interfaces but does not build LAN discovery or local multi-master synchronization.

19. First two sprints

Sprint 1

Create aevo-core-api, aevo-contracts, aevo-infrastructure and aevo-accounts.

Provision dev Cloud Run, Cloud SQL, Artifact Registry, Secret Manager and Identity Platform.

Build /health/live, /health/ready, standard error envelope and trace propagation.

Create identity/platform/workforce schemas and migration runner job.

Implement user sync from Identity Platform and GET /v1/me.

Publish the first generated TypeScript API client.

Connect one existing frontend repo to the generated client.

Establish GitHub OIDC and Cloudflare scoped-token pipelines.

Sprint 2

Implement Accounts authorization-code exchange and app-scoped sessions.

Add organization/store/membership/app-assignment APIs.

Add Hub access gate and organization/store selector.

Implement invitation flow and revoke tests.

Add audit events, request correlation and baseline dashboards.

Deploy staging end-to-end and run IDOR, replay and redirect security tests.

20. Definition of done for every feature

Domain owner and repository owner are explicit

API contract versioned and generated client updated

Authorization and tenant/store scope enforced server-side

Idempotency/concurrency behavior documented where relevant

Migration is backward-compatible and rollback path exists

Unit, integration, contract, E2E and negative security tests pass

Loading, empty, error, retry, permission and offline states are implemented

Logs/metrics/traces and release marker exist

Accessibility, responsive layout and Thai long-text checks pass

Preview/staging deployment and smoke tests pass

Runbook, alert and feature flag/kill switch exist for risky capabilities

21. Explicit non-goals

No Kubernetes

No backend microservice per domain

No separate search cluster for MVP

No ML feed before interaction data and evaluation

No direct browser access to Cloud SQL

No raw public GPS trace

No multi-device offline authority before Local Store Hub

No shared broad deployment credential across repositories

No breaking API rollout that requires all frontend repositories to deploy simultaneously

22. Final target

Cloudflare
= frontend SSR/SPA, DNS, WAF, CDN, Turnstile, Images, Stream, R2, edge gateway

Google Cloud
= Cloud Run .NET backend, Cloud SQL PostgreSQL, Identity Platform,
Pub/Sub, Tasks, Scheduler, BigQuery, Secret Manager and observability

Polyrepo
= independent deployability with versioned OpenAPI SDK, design-system package,
protected environments and automated dependency updates

Backend
= one modular monolith plus worker/jobs until measured boundaries justify extraction

This allocation keeps maintenance and deployment isolation at the application level without paying the operational cost of premature microservices or an additional database platform.

23. Primary technical references

Cloudflare React Router on Workers: https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/

Cloudflare Vite plugin: https://developers.cloudflare.com/workers/vite-plugin/

Cloudflare Images direct creator upload: https://developers.cloudflare.com/images/storage/upload-images/direct-creator-upload/

Cloudflare Stream direct creator upload: https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/

Google Cloud Run .NET deployment: https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-dotnet-service

Cloud SQL PostgreSQL extensions: https://cloud.google.com/sql/docs/postgres/extensions

Identity Platform authentication: https://cloud.google.com/identity-platform/docs/concepts-authentication

Identity Platform multi-tenancy: https://cloud.google.com/identity-platform/docs/multi-tenancy

Cloud Run with Pub/Sub: https://cloud.google.com/run/docs/tutorials/pubsub

Cloud SQL Auth Proxy/connectors: https://cloud.google.com/sql/docs/postgres/connect-auth-proxy

24. Current-state reconciliation

This section reconciles the target architecture above with the initial workspace inventory captured on 2026-09-22. It is the pre-execution baseline; section 33 supersedes its readiness gaps with the local implementation evidence. No cloud resource, production repository remote, secret or database was changed as part of the initial review.

| Area | Current evidence | Gap to target | First action |
|---|---|---|---|
| `aevo-hub` | Modern Hub/Admin surfaces, shared transitional data packages, and historical Supabase migrations | Web console must remain a client of Core API; historical Supabase files must not regain write ownership | Keep the Core migration ledger and versioned client as the only runtime boundaries |
| `aevo-admin` | Separate directory/repository shape, Bun Dockerfile and Admin UI; no Wrangler configuration or repository CI yet | It is independently deployable in principle but not yet a Cloudflare Worker deployment | Add the Admin Worker build/deploy contract after the API and platform-RBAC contract is stable |
| `aevo-go` | Standalone Vite/Capacitor app with build/typecheck/test scripts; no repository/deploy configuration in the workspace inventory | No independent source-control or Cloudflare preview/staging/production pipeline | Bootstrap the repository and consume the generated API client; keep customer UI and platform Admin boundaries separate |
| `aevo-play` | Wrangler Worker and CI exist; application still has Supabase migration/deploy assumptions | No Core API/Cloud SQL cutover path and no standard per-environment config | Add contract-client and environment bindings first; retain the current Worker as a reversible adapter |
| `aevo-pos` | Wrangler Worker and CI exist; application still has Supabase migration/deploy assumptions | POS runtime, queue and offline data ownership are not yet on the target Core API | Define POS/queue API contracts and explicit offline limits before changing persistence |
| `aevo-digital-sing` | Worker is named `solardream-document-api`; Firebase rules/indexes and a Python engine Dockerfile exist; no Git repository/CI was found | Naming, source control, Cloud Run engine deployment and Firebase ownership are not aligned with the polyrepo target | Create a repository boundary and rotate credentials before any deployment automation |
| CI/CD | CI workflows were found for Play and POS only | Hub, Admin, Go and Digital Signage do not share a deploy/preview/promotion standard | Add one workflow per repository with least-privilege Cloudflare/GCP identities |
| Database | Supabase remains the active shared system; local and remote migration inventories have drift | The target Cloud SQL source of truth does not exist yet | Reconcile and freeze Supabase migrations before creating the first Cloud SQL migration baseline |

24.1 Immediate preflight blockers

1. A Firebase service-account credential file was found at `aevo-digital-sing/.env` during inventory. Treat it as compromised: revoke/rotate the key in Google Cloud/Firebase, remove the file from all working copies and any reachable history, and replace it with Secret Manager plus Workload Identity Federation. Do not copy that credential into GitHub, Wrangler, Docker or Terraform.

2. `aevo-hub`, `aevo-play` and `aevo-pos` contain substantial existing uncommitted work. No migration or extraction task may assume the current working tree is a clean release baseline. Create an inventory commit/tag or an explicitly approved snapshot before moving code between repositories.

3. `aevo-admin`, `aevo-go` and `aevo-digital-sing` do not have the same repository/CI/deployment readiness as Play and POS. Repository creation and ownership are Phase 0 work, not an implicit side effect of an application feature task.

4. Local and remote Supabase migration histories are not currently a single authoritative history. Do not run a blanket `supabase db push` from any application repository until the migration reconciliation checklist in section 25 is signed off.

25. Supabase improvement and transition plan

Supabase remains a transitional source for the existing system, not a second long-term control plane. During the transition, every new frontend feature must call the canonical API; no new browser code may read or write Supabase tables directly.

25.1 Service mapping

| Current Supabase responsibility | Transitional owner | Target owner |
|---|---|---|
| Postgres business data | Existing Supabase database behind the Hub/Core adapter | Cloud SQL for PostgreSQL behind `aevo-core-api` |
| Supabase Auth sessions/tokens | Legacy adapter accepted only at the trusted boundary | Identity Platform plus `aevo-accounts` app-scoped sessions |
| Realtime notifications | Existing channel where required for compatibility | Pub/Sub domain events plus lightweight Worker invalidation and canonical API refetch |
| Supabase Storage | Existing assets until each asset class is migrated | Cloudflare Images/Stream/R2 according to the media policy |
| Edge/functions | Existing gateway/worker adapters | Edge Gateway Worker plus Core API/Background Worker |
| RLS policies | Defense-in-depth on the transitional database | API authorization plus Cloud SQL tenant/session-context defense-in-depth |

25.2 Reconciliation and hardening gates

1. Export a schema-only inventory and migration list from the remote project. Compare it with every local `supabase/migrations` directory; classify each item as applied, unapplied, duplicate, conflicting or obsolete.

2. Core API/Infrastructure are now the only migration owners. Application repositories expose no migration write command; Hub's local commands delegate to the Core API migrator.

3. Capture table counts, foreign-key relationships, tenant keys, extension versions, indexes, triggers, functions, storage objects and auth-user counts before migration. Record checksums for high-value tables and reconciliation queries for every cutover batch.

4. Address the current Supabase advisor backlog in priority order: the `public.spatial_ref_sys` RLS-disabled error, PostGIS-in-public warning, 102 unindexed foreign keys, init-plan/policy performance warnings, overlapping permissive policies, unused indexes and disabled leaked-password protection. The `spatial_ref_sys` item is extension-managed; review ownership and public grants before choosing a revoke/schema/RLS remediation. Do not blindly enable RLS on an extension table.

5. Verify that browser roles have no direct grants on tenant tables and that all security-sensitive functions have explicit `search_path`, ownership and `EXECUTE` grants. Every policy must use a stable request/tenant context without leaking context between pooled connections.

6. Establish a query baseline with representative `EXPLAIN (ANALYZE, BUFFERS)` plans, lock/slow-query metrics and tenant-negative tests before changing indexes or policies. Add foreign-key indexes based on actual join/delete paths, not by blindly indexing every column.

25.3 Data and identity migration sequence

1. Create a Cloud SQL non-production clone/schema from the approved model and run EF Core migrations through a migration-only Cloud Run Job.

2. Import sanitized data, replay deterministic reference seeds, and run row-count/checksum/relationship reconciliation. Keep IDs stable where cross-application links depend on them.

3. Run an identity feasibility spike for Supabase users to Identity Platform. If a password-hash format cannot be safely imported, use a forced password reset; never copy or expose password material as an ad-hoc migration shortcut.

4. Introduce a one-time authorization-code exchange that converts a legacy authenticated request into an app-scoped session. Do not issue Supabase access/refresh tokens to browsers after the adapter is enabled.

5. Cut over read paths first, then writes by bounded domain. Avoid indefinite dual-write. If a short dual-read window is required, make the canonical source and conflict resolution explicit per table.

6. Keep the old Supabase path read-only during the rollback window. Decommission only after traffic, reconciliation and audit evidence meet the exit criteria.

25.4 Supabase repository/config deliverables before Cloud SQL baseline

The Supabase hardening work must produce reviewable repository artifacts, not only dashboard changes:

| Artifact | Required change | Evidence required |
|---|---|---|
| `supabase/config.toml` | Pin the CLI/runtime assumptions, local Postgres/PostGIS settings and non-production project linkage; keep production identifiers/secrets out of tracked files | Local reset/startup succeeds and the config contains no credential material |
| `supabase/migrations` | Establish one ordered migration owner, remove duplicate app-owned migration paths from the release process, and document applied/unapplied drift | Remote/local migration reconciliation report and clean migration diff |
| RLS/policies | Normalize tenant predicates, app/session context, service-role boundaries and policy ownership; consolidate overlapping policies | Positive and cross-tenant negative tests, policy review and advisor result |
| Functions/triggers | Review `search_path`, `SECURITY DEFINER`, ownership, `EXECUTE` grants, idempotency and trigger recursion | SQL security review plus repeat/replay tests |
| Foreign keys/indexes | Add only justified tenant/FK/lookup indexes, then compare representative query plans and write/delete behavior | Before/after `EXPLAIN (ANALYZE, BUFFERS)` and lock/latency evidence |
| Auth configuration | Restrict redirect URLs and providers to approved environments; keep legacy session exchange behind the trusted adapter | Callback, state/PKCE, replay and open-redirect tests |
| Storage configuration | Audit bucket visibility, MIME/size policies, owner checks and signed URL TTLs; mark each bucket for migration to Images/Stream/R2 or retirement | Storage policy tests and asset inventory |
| Seed/fixtures | Keep reference data and sanitized test fixtures deterministic; never seed production secrets or personal data | Repeatable local reset and staging seed report |
| CI gate | Pin the Supabase CLI, read the current CLI/changelog before upgrades, run migration/schema/policy checks and publish the advisor/performance report as an artifact | Green pull-request checks with retained evidence |

The Supabase task is complete only when these artifacts are reviewed and the Cloud SQL baseline can be generated from the approved model without depending on an undocumented dashboard mutation.

26. Google Cloud landing zone and setup

The following is the configuration contract for `aevo-infrastructure`. Identifiers are placeholders until the owner approves the Google Cloud organization, billing account, project IDs, region and domain inventory.

26.1 Project topology

| Project | Purpose | Data policy |
|---|---|---|
| `<aevo-bootstrap-project>` | Terraform state bucket, deployment identity federation and bootstrap-only resources | No application data; restricted platform administrators |
| `<aevo-nonprod-project>` | Preview/shared development and staging Cloud Run, Cloud SQL and integration services | Synthetic or sanitized data only |
| `<aevo-prod-project>` | Production Cloud Run, Cloud SQL HA, eventing, analytics and secrets | Production data; protected environment and approval required |

Use `asia-southeast1` only after a Thailand latency and service-availability test. Keep synchronous API, Cloud SQL and required event consumers in one primary region. Use separate projects and separate IAM bindings for non-production and production.

26.2 Bootstrap order

1. Confirm organization/folder, billing account, project IDs, region, DNS ownership and Cloudflare account ownership.

2. Create or select the bootstrap, non-production and production projects; enable billing and deletion protection policy.

3. Enable the required APIs: Resource Manager, Service Usage, IAM, IAM Credentials, Security Token Service, Cloud Run, Artifact Registry, Cloud SQL Admin, Secret Manager, Pub/Sub, Cloud Tasks, Cloud Scheduler, BigQuery, Identity Toolkit/Identity Platform, Cloud Logging, Monitoring, Trace, VPC/Serverless connectivity and Cloud Storage.

4. Create a versioned, retention-protected Terraform state bucket in the bootstrap project. Grant access only to the infrastructure pipeline identity and approved operators.

5. Create the GitHub OIDC Workload Identity Pool/provider. Restrict its attribute condition to the approved GitHub organization and repository/ref/environment claims. Use one deploy service account per pipeline and environment; do not use JSON service-account keys.

6. Create Artifact Registry repositories for API/worker images and configure immutable release tags or digests. The runtime must deploy by digest, not a mutable `latest` tag.

7. Create Cloud SQL non-production and production instances with the approved PostgreSQL version, HA/PITR/backups, deletion protection, maintenance window, connection limits and extension compatibility. Decide public-IP-with-Cloud-SQL-connector versus private connectivity after the first integration test; do not expose unrestricted database ingress.

8. Create Secret Manager secrets by environment and grant access at secret level to only the service that needs each secret. Pin versions in Cloud Run configuration and rotate through a release, except for secrets deliberately mounted for rotation-aware file access.

9. Create Cloud Run services/jobs: `aevo-core-api`, `aevo-background-worker`, `aevo-db-migration` and bounded reconciliation jobs. Use separate runtime service accounts and service-to-service IAM; public application traffic reaches them through the Edge Gateway, not generated Cloud Run URLs.

10. Create Pub/Sub topics/subscriptions, dead-letter topics, Cloud Tasks queues, Scheduler jobs and BigQuery datasets. Define event schema/version, retention, retry and idempotency before creating consumers.

11. Configure Identity Platform providers, authorized domains, callback URLs and abuse controls. Keep Aevo organizations/memberships/assignments in the application authorization model; do not use Identity Platform tenants as a substitute for organization RBAC unless a separate identity boundary is intentionally approved.

12. Turn on audit logs, error reporting, traces, dashboards, alert policies and budget/quota alerts before production data is admitted.

26.3 Bootstrap command template

The following is a non-secret template for the infrastructure runbook. Replace placeholders only after project ownership is approved; do not commit the resulting values or credential files.

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project <aevo-nonprod-project>
gcloud services enable \
  run.googleapis.com artifactregistry.googleapis.com sqladmin.googleapis.com \
  secretmanager.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  pubsub.googleapis.com cloudtasks.googleapis.com cloudscheduler.googleapis.com \
  bigquery.googleapis.com identitytoolkit.googleapis.com logging.googleapis.com \
  monitoring.googleapis.com cloudtrace.googleapis.com vpcaccess.googleapis.com \
  servicenetworking.googleapis.com storage.googleapis.com
```

The actual production setup must run through the approved Terraform bootstrap/pipeline, with a human-only bootstrap step limited to project/billing/state/WIF prerequisites.

26.4 `aevo-infrastructure` layout

```text
aevo-infrastructure/
  bootstrap/                  # state bucket, APIs, WIF prerequisites
  envs/nonprod/               # preview/shared-dev/staging project composition
  envs/prod/                  # protected production composition
  modules/
    cloud-run/
    cloud-sql/
    eventing/
    identity-platform/
    observability/
    secrets/
    cloudflare/
  policies/                   # IAM, org policy, retention and naming rules
  docs/runbooks/              # bootstrap, deploy, rollback, incident, rotation
```

27. Cloudflare landing zone and per-app configuration

27.1 Worker/environment standard

Every Cloudflare application gets one top-level Worker name and explicit `preview`, `staging` and `production` environments. Environment-specific bindings/vars must be declared explicitly; a preview Worker must never inherit production API, database, media or signing credentials.

| App/repo | Target Worker | Target responsibility | Current gap |
|---|---|---|---|
| Hub | `aevo-hub` | Tenant workspace and merchant control plane | No standard deploy workflow/config in the current repo inventory |
| Admin | `aevo-admin` | Privileged platform console and cross-app audit/config | Bun Dockerfile exists; add Worker/SSR config and CI |
| Go | `aevo-go` | Customer public SSR/app shell and discovery | Standalone Vite app has no Worker/deploy contract |
| Play | `aevo-play` | Booking/customer operations | Wrangler/CI exist; add environment bindings and Core API adapter |
| POS | `aevo-pos` | POS/queue interface and device boundary | Wrangler/CI exist; add environment bindings and offline contract |
| Digital Sign | `aevo-digital-sign` | Signage shell/control UI | Current Worker name is legacy; standardize only with a DNS/rollback plan |
| Accounts | `aevo-accounts` | Login, consent, one-time handoff and app session | New repository |
| Edge Gateway | `aevo-edge-gateway` | Origin proxy, request signing, coarse rate/cache policy | New repository |

27.2 Required config per Worker

1. `wrangler.jsonc` with a stable top-level name, compatibility date, build output, observability and explicit environment sections.

2. Public vars only for environment name, API origin, app code, version and non-sensitive feature flags. Secrets are uploaded through Wrangler/CI secret stores and are never placed in tracked `.env` files.

3. Bindings only for the resources owned by that Worker: R2 buckets, Images/Stream identifiers, Queues or service bindings. The browser never receives origin credentials or Google service-account material.

4. Custom domains/routes are managed from Terraform or one explicitly selected source of truth. Do not mix dashboard edits with Wrangler-managed configuration without a reconciliation step.

5. SPA Workers set the correct asset fallback; React Router SSR Workers use the generated server entry and client asset directory. Each app must test deep links, error responses and cache headers in preview.

27.3 CI/CD standard

Each repository gets its own workflow with `contents: read`, pinned dependencies and a repository-scoped Cloudflare API token/account ID. The workflow must run typecheck, tests, build, secret/dependency scan, preview deployment and smoke tests before production promotion. A Hub token must not deploy Admin, Go or another app.

Use gradual Worker versions or an equivalent reversible promotion. Record the Worker version, commit SHA, API contract version and environment in the release marker. Keep API origin/signing secrets separate per environment and per application boundary.

28. Polyrepo work distribution

The following work packages are intentionally separated so they can be assigned later. “Owner” is a repository/workstream, not an instruction to start work now.

| ID | Owner | Scope | Depends on | Acceptance outcome |
|---|---|---|---|---|
| WP-00 | Workspace/governance | Clean inventory, secret incident, repo ownership, ADRs, domain/project decisions | None | Approved baseline and no known credential in source/history |
| WP-01 | `aevo-infrastructure` | GCP projects, Terraform state, APIs, WIF, IAM, Cloud SQL, Cloud Run, eventing, secrets, observability, Cloudflare DNS/Workers | WP-00 | Nonprod can be provisioned/reprovisioned from code; prod apply is protected |
| WP-02 | `aevo-contracts` | OpenAPI source, generated TypeScript SDK, error/envelope/idempotency/event schemas, compatibility tests | WP-00 | One app consumes a versioned SDK without relative imports or handwritten drift |
| WP-03 | `aevo-core-api` | .NET modular monolith, request context, tenant/RBAC, audit, identity sync, domain modules, OpenAPI | WP-01, WP-02 | Health, `/v1/me`, authorization and one vertical slice run on Cloud Run/Cloud SQL |
| WP-04 | `aevo-accounts` | Identity Platform broker, callback/PKCE/state, one-time authorization code, app-scoped cookies, logout/revoke | WP-01, WP-02, WP-03 | Hub/Play/POS/Admin/Go cannot reuse another app’s session |
| WP-05 | `aevo-edge-gateway` | Cloudflare origin proxy, request signing, body/rate limits, public cache policy, provider webhook entry | WP-01, WP-03 | Core API rejects unsigned/expired gateway requests and public cache never serves personalized data |
| WP-06 | `aevo-background-worker` | Outbox publisher, inbox/idempotency, Pub/Sub/Tasks/Jobs, media webhooks, reconciliation | WP-01, WP-03 | Retry, duplicate and dead-letter tests pass without duplicate side effects |
| WP-07 | `aevo-hub` | Merchant workspace, organization/store setup, workforce/app assignments, generated SDK migration | WP-02, WP-03, WP-04 | Owner can configure store/app access without direct Supabase access |
| WP-08 | `aevo-admin` | Privileged platform RBAC, app connection status, per-app audit logs, config/entitlement screens, Cloudflare deploy | WP-02, WP-03, WP-04, WP-05 | Platform admin can inspect/control apps while organization owner cannot gain platform privileges |
| WP-09 | `aevo-play` | Booking resources/schedules/holds/confirm/cancel, notifications, customer deep links | WP-02, WP-03, WP-04, WP-05 | Concurrent booking and retry tests prove no double booking |
| WP-10 | `aevo-pos` | POS catalog/cart/order/queue, device assignment, online/offline draft and reconciliation | WP-02, WP-03, WP-04, WP-06 | Retry cannot duplicate orders; offline limitations are visible and tested |
| WP-11 | `aevo-go` | Public discovery/search/map, customer session handoff, feed/social/traces, analytics events | WP-02, WP-03, WP-04, WP-05 | Public pages work without admin/session leakage and map/list fallback is accessible |
| WP-12 | `aevo-digital-sign` | Repository/CI split, Worker shell, Cloud Run engine, document metadata/media transition, device enrollment | WP-01, WP-02, WP-05, WP-06 | No service-account key in repo; document processing and verification have rollback/runbook |
| WP-13 | Data migration | Supabase reconciliation, Cloud SQL baseline, data import/checksums, identity migration, cutover/rollback | WP-00, WP-01, WP-03, WP-04 | Counts/checksums/access tests reconcile and rollback is rehearsed |
| WP-14 | Observability/security | Threat model, IDOR/BOLA tests, RLS/policy review, SLO dashboards, secret/dependency/IaC scans | WP-01, WP-03, WP-04, WP-05 | Security gates and production alerts are green before traffic promotion |

29. Execution dependency and release order

Do not execute application migrations in parallel before the shared contracts, identity and data ownership gates are complete.

```text
WP-00
  ├── WP-01 infrastructure ──┐
  ├── WP-02 contracts ────────┼── WP-03 Core API ── WP-04 Accounts
  │                           │          ├── WP-05 Edge Gateway
  │                           │          └── WP-06 Background Worker
  │                           └── WP-13 Data migration (after schema baseline)
  └──────────────────────────────────────┬─────────────────────────────────
                                         ├── WP-07 Hub
                                         ├── WP-08 Admin
                                         ├── WP-09 Play
                                         ├── WP-10 POS
                                         ├── WP-11 Go
                                         └── WP-12 Digital Sign
                                                   ↓
                                             WP-14 final gates
```

Recommended order:

1. WP-00: resolve credentials, ownership, domains, projects and migration freeze.
2. WP-01/WP-02: provision non-production and publish the first contract package.
3. WP-03/WP-04: establish Core API, app-scoped sessions and platform/organization RBAC.
4. WP-05/WP-06: establish the edge and async boundaries with idempotency tests.
5. WP-13: rehearse Cloud SQL data/identity migration using sanitized data.
6. Migrate one low-risk read path and one write path in each app, with a reversible adapter.
7. Promote applications in dependency order: Hub/Admin foundation, Play, POS, Go, then Digital Signage.
8. Run WP-14, freeze the rollback window, cut over by domain, and only then retire legacy Supabase paths.

30. Task packet format for later assignment

Every task issued to an agent or repository must include:

- Work package ID and exact repository path
- Target environment (`local`, `preview`, `staging` or `production`)
- Contract/version and database migration scope
- Required dependency/secret names without secret values
- Authorization, tenant, app-session and audit requirements
- Tests and smoke URLs/commands
- Rollback/feature-flag behavior
- Output artifacts: commit, migration, OpenAPI diff, deployment URL, evidence and runbook update

The first implementation tasks should be small, reviewable slices: `WP-00.1` credential/ownership inventory, `WP-01.1` non-production bootstrap, `WP-02.1` health/me contract and generated SDK, and `WP-04.1` app-scoped session exchange. Do not ask an application repository to invent its own auth, migration or deployment contract.

31. Decision gates before implementation

The following decisions remain intentionally open and must be approved before cloud provisioning or data migration:

1. Final Google Cloud project IDs, billing account, organization/folder and production region.
2. Cloudflare account/zone owner, final hostnames, DNS cutover owner and whether GitHub Actions or Workers Builds is the single deployment mechanism.
3. Identity providers required at launch (Google, Apple, LINE, password, workforce SSO) and Identity Platform tenant/provider policy.
4. Whether Digital Sign retains Firebase temporarily, or moves document metadata/media to Core API + Cloud SQL/R2 in the first migration wave.
5. Cloud SQL connectivity model and the approved maintenance/downtime window for the initial import/cutover.
6. Repository owners, GitHub organization and branch/protected-environment policy for the new polyrepos.
7. Billing/Stripe source-of-truth scope and whether it is included in the first Cloud SQL vertical slice or remains behind the existing adapter.

Until these gates are approved, local repository implementation, contract work, tests, dry-runs and non-destructive configuration validation may proceed. No production credential, Cloud SQL instance, Cloudflare route, Supabase migration or external delegation may be created implicitly.

32. Additional validated technical references

Cloudflare React Router on Workers and deployment: https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/

Cloudflare Wrangler environments: https://developers.cloudflare.com/workers/wrangler/environments/

Cloudflare GitHub Actions deployment: https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/

Cloudflare Worker secrets: https://developers.cloudflare.com/workers/configuration/secrets/

Google Cloud Workload Identity Federation for deployment pipelines: https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines

Google Cloud service-account pipeline best practices: https://cloud.google.com/iam/docs/best-practices-for-using-service-accounts-in-deployment-pipelines

Cloud Run and Cloud SQL for PostgreSQL: https://cloud.google.com/sql/docs/postgres/connect-run

Cloud Run Secret Manager configuration: https://cloud.google.com/run/docs/configuring/services/secrets

Secret Manager best practices: https://cloud.google.com/secret-manager/docs/best-practices

33. Implementation status — 22 September 2026

The following local implementation slices are now present and independently verifiable:

- `aevo-contracts`: versioned OpenAPI v1 surface, strict TypeScript client/types, declaration build and tag-based package publish workflow.
- `aevo-infrastructure`: Terraform bootstrap, GCP project/API/IAM/network/private-service-connectivity/Cloud SQL/Cloud Run/Pub/Sub/Cloud Tasks/Secret Manager/Cloudflare modules, identity-project wiring, runtime probe-target configuration, Core-to-Accounts origin/secret bindings for the authentication BFF, and optional operator alert destination instead of a fake email channel.
- `aevo-core-api`: .NET 10 host, request-id/error envelope, production gateway-HMAC verification, fail-closed health/readiness/session gates, versioned Hub contract, onboarding/store/app operations, Cloud SQL data access for app sessions/platform permissions, registry/connection/audit APIs, Aevo Go settings/flags/event aggregates, probe result ingestion, Digital Sign registry reconciliation, Cloud Run Dockerfile, and Cloud SQL PostgreSQL authority/control-plane baselines. App sessions now use per-application opaque cookies, CSRF tokens, idle timeout, absolute timeout, rotation and revocation with lifecycle columns in migrations `0005`–`0009`.
- `aevo-accounts`: Cloudflare Worker boundary for allow-listed app redirects, signed state/PKCE handoff, transitional Hub/Supabase exchange, private password brokerage for server-side Admin login, Core session issuance for the trusted Admin path and future Core-routed apps, and explicit not-configured readiness responses. Provider tokens remain on trusted server-to-server boundaries.
- Authentication integration: Admin, Hub, Play, and POS use the Accounts/Core broker and application-bound sessions; no Hub fallback or browser provider token path remains in the normal local launcher. Go retains its independent customer boundary and Digital Sign remains outside this cutover.
- `aevo-edge-gateway`: Cloudflare Worker proxy with request-id propagation, HMAC gateway signature, no-store personalized responses and fail-closed origin/secret checks.
- `aevo-background-worker`: Cloud Run-compatible HTTP host with authenticated Pub/Sub boundary, explicit no-ack behavior until inbox/outbox persistence is configured, and an authenticated app-health probe runner that writes observed results to Core API.
- `aevo-admin`, modern `aevo-hub`, `aevo-go`, `aevo-play`, `aevo-pos` and `aevo-digital-sing`: explicit preview/staging/production deployment boundaries and repository CI/deploy workflows where the runtime supports them. React Router SSR apps use the Cloudflare Vite plugin against the `ssr` Vite environment, inject the runtime Core API origin into server requests, and deploy the generated Worker artifact.
- Digital Sign's ignored local Firebase service-account file was moved to a mode `0600` quarantine location. Remote revocation/rotation remains a required external security action.

Validated locally: the authentication slice passes Accounts typecheck/tests and Wrangler build, Core API and migrator builds, Core migrations `0001`–`0009` apply/verify, Hub/Play/POS typechecks, and the live Edge/Core onboarding/session smoke tests. The remaining full-suite and cloud deployment evidence is tracked as an external release gate.

External completion gates still open: revoke/rotate the exposed Firebase key, approve GCP/Cloudflare/GitHub ownership and environments, provision non-production secrets/identities, reconcile and freeze Supabase before any migration, publish the contracts package to the approved registry, and run cloud smoke tests with real credentials.

Revision note: sections 24–33 are the workspace-reconciled execution plan plus the implementation evidence recorded during the first execution pass. They intentionally separate target architecture, local code and external provisioning gates.
