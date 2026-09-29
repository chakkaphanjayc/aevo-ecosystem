# Polyrepo ownership and contract boundaries

ARCHITECTURE REVIEW REVISION

## Ownership matrix

| Work | Owning repository | Supporting repositories | Do not do |
| --- | --- | --- | --- |
| Public Feed HTTP facade, session/policy, orchestration | aevo-core-api | aevo-contracts, aevo-edge-gateway | Add browser-facing Feed handlers to aevo-hub |
| Shared Feed request/response/event types | aevo-contracts | aevo-go, aevo-admin | Duplicate hand-written schemas per app |
| Existing TraceDee/Supabase adapter during transition | aevo-hub data package or a deliberately extracted server package | aevo-core-api | Treat unowned untracked migrations as production truth |
| Feed config persistence/validation/publish/rollback | aevo-core-api and Core-owned migrations | aevo-admin, aevo-background-worker | Write tracedee_feature_flags directly from UI |
| Feed Admin screens/BFF | aevo-admin | aevo-core-api, aevo-contracts | Add new Feed controls to both Admin apps |
| Customer Feed UI and event client | aevo-go | aevo-contracts | Rank/interleave in the browser |
| Edge ingress/signing/routing | aevo-edge-gateway | aevo-core-api, infrastructure | Put authorization in the edge only |
| Events, projection rebuild, async processing | aevo-background-worker | aevo-infrastructure, Core/Supabase adapter | Acknowledge before idempotent persistence |
| Pub/Sub, Tasks, secrets, Cloud Run, metrics | aevo-infrastructure | worker/Core | Provision a resource without an owner/runbook |
| Identity and app-scoped SSO | aevo-accounts/Core API | aevo-go | Reuse another app's cookie or expose Supabase tokens |
| Other product apps | Their own repositories | Shared contracts only | Add feed-specific business logic opportunistically |
| FEED-000 ownership ADR and migration gate | aevo-core-api/docs plus root Feed docs | aevo-hub, aevo-infrastructure, security owners | Start FEED schema work before ADR approval |

## Versioning

Publish @aevocado/contracts with an explicit API contract version. Use additive response fields, discriminated item variants, and a compatibility window. The Go client should parse the new response before the UI switches to it. The Admin client should consume the same config/evaluation contract through its server-side API client.

If a temporary data adapter needs a shared TypeScript repository, publish a package or introduce a dedicated server package with a versioned boundary. Avoid relative imports across repositories and avoid making Core API depend on an unbuilt Hub workspace.

## Transitional Admin sequence

1. Keep aevo-hub/apps/admin read-only or unchanged while aevo-admin gains Feed routes.
2. Add Core API handlers and contract tests first.
3. Run aevo-admin against the same Core API in preview.
4. Port moderation/ranking/projection views and permissions.
5. Verify Admin login, CSRF, audit, rollback, and no-direct-Supabase access.
6. Switch the production Admin origin.
7. Remove the transitional Hub Admin app only after its route and API dependencies are retired.

## Migration rule

There must be exactly one owner for each schema. Core-owned tables use Core migrations. If the existing Supabase TraceDee tables remain authoritative during transition, document the migration runner, deploy environment, rollback, and data-transfer owner before adding Feed tables. No task may silently assume both Core SQL and Supabase are authoritative for the same config or domain row.

For V1, existing TraceDee/public discovery domain data remains in its current Supabase source while Core owns Feed delivery/configuration. New Feed-specific schema is Core-owned only after FEED-000 approval. The long-term Core-owned Feed read model is an incremental destination, not a V1 prerequisite.

Use existing GCP Pub/Sub, dead-letter, Cloud Tasks, Cloud Run, and observability infrastructure for Feed async work. Do not add Cloudflare Queue solely for symmetry.

## FEED-001 compatibility mapping

The shared contract is source-neutral. During V1 transition, the private Core adapter maps existing source records into the public envelope as follows; no client or Admin caller receives the source name, raw score, internal reason parameters, private relationship state, or exact coordinates.

| Existing source | Public variant | Public mapping | Deliberately omitted or server-issued |
| --- | --- | --- | --- |
| TraceDee feed item | `TRACE` | `itemId -> id`, `slug`, `title`, `description`, `creatorName`, `area`, `topicTags`, `stopCount`, and `publishedAt` | `rankScore`, `reasonParams`, raw `trackingToken`, private creator/relation fields; Core issues `itemToken` |
| Public discovery/store result | `PLACE` | `id`, `slug`, `name`, `description`, `area`, `category`, and public `imageUrl` | latitude/longitude, internal store/profile flags, booking authority fields; Core issues `itemToken` |
| Existing source cursor | Feed session cursor | Never pass through as a public authority; Core will bind/sign the cursor in FEED-003 | unsigned/base64 source cursor semantics |
| Existing source reason | Safe `reasonCode` | Map only to the allowlisted TRACE/PLACE reason codes in `@aevocado/contracts` | arbitrary reason text, feature vectors, SQL/table/RPC names |

FEED-001 publishes this mapping and the compatibility fixtures. FEED-003 owns request/session enforcement, and FEED-004 owns actual server-side candidate generation and mixed composition.

## FEED-002 configuration ownership state

The Core migration `0010_feed_config_control_plane.sql` is the single Feed configuration authority for `GO_PUBLIC_FEED`. It owns immutable revisions, validation results, the active pointer, structured audit, propagation observations, and publication events through the existing Core outbox. `aevo_go_feature_flags` is read only for compatibility/mismatch telemetry (`mixed_feed` and `taste_ranking_v1`); the legacy Admin mutation route rejects those Feed keys and no Supabase or Feed legacy writer was added. FEED-003 must consume the Core typed config/fallback service and must not introduce another config table or direct legacy write path.
