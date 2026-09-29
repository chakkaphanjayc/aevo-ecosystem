# Map / Place implementation status

Date: 2026-09-27

Status: implementation in progress. The user approved execution after the
final architecture review. This file records what is implemented locally and
what is intentionally not enabled in production.

## Implemented locally

| Workstream | Delivered boundary |
| --- | --- |
| MAP-000 | `ADR-000-place-ownership-and-contracts.md`; Core owns canonical Place API and Cloud SQL migration boundary. |
| MAP-001 | `aevo-contracts/src/place.ts`, OpenAPI Place paths/schemas, Core DTOs, Go Zod schemas and typed client. Point plus polygon/multipolygon-safe geometry, Thai-first semantic address, localized names, field provenance, static capability/live-state separation, and redirect metadata are versioned. |
| MAP-002 | Core migrations `0011_place_projection.sql` and `0012_place_workflows.sql`; explicit legacy/source mapping; canonical public projection read store with freshness, failed-build last-known-valid fallback, revision metadata, and additive RLS policies. |
| MAP-003 | Core public map overlay, Search, Nearby, and Detail handlers. Requests are bounded; map payload is compact; Search/Nearby use signed, query-bound cursors; projection/database failures fail closed. Detail now accepts the compact summary projection emitted by the guarded Admin mutation path and supplies safe empty optional detail collections. |
| MAP-004 | Go provider-neutral basemap/geocoder policy, attribution rendering, production Overpass disablement, and opt-in canonical adapter. Canonical mode now uses the dedicated Core map overlay for markers, keeps Search as the list source, resolves marker-only Places through `/places/:placeId`, forwards `Saved` through the Core-authoritative `savedOnly` filter, and blocks direct OSM/unsafe booking fallback. `VITE_PLACE_API_MODE=legacy` remains the default until target-environment route/data smoke tests pass. |
| MAP-005 foundation | Shared source contract and deterministic Point/Polygon/MultiPolygon normalizer in `aevo-contracts`; authenticated background-worker dry-run plan reports replay fingerprint and disappeared source IDs. It is disabled/review-only and does not select a provider, assign canonical IDs, or publish projections. |
| MAP-006–008 foundation | Typed relationship/claim/submission/decision contracts plus fail-closed validation. Live commands and approvals remain disabled; static/live capability separation is enforced by rejecting live-state submission fields. |
| MAP-009 | Core admin registry list/detail plus guarded `POST`/`PUT`/`DELETE` Place boundary; optimistic revision, CSRF, platform RBAC, audit, projection rebuild/disable, and soft-delete history preservation. Admin editor is at `/map/places/:placeId`; list remains read-only for accounts without `map.places.manage`. Test/maintenance-only exact-key hard-delete endpoints now cover legacy mapping and source-link compatibility rows. |
| MAP-009 workflow queue | Core `GET /api/v1/admin/map/workflows` and Admin read-only queue at `/map/workflows` for claims, submissions, and relationships. No review action is exposed. |
| MAP-010 | Pure bounded redirect resolver, labelled projection replay gate, and shared legacy/canonical reference resolver. The DB-backed resolver is now used by public canonical Detail redirects and an opt-in Core Feed `placeReference` boundary; Trace/booking and Customer favorite downstream wiring remain gated. Core's separate controlled Feed-owned canonical Place save projection is documented in the Feed ledger and does not replace this ownership boundary. |

The labelled projection validator now has a guarded apply path at
`POST /internal/place/projections/replay`. It is restricted to already-existing
visible/limited canonical Places, enforces source-revision parity, records a
run fingerprint/reason, and is retryable by `runId`; the background worker
source endpoint remains dry-run/review-only until a source/legal packet is
approved.

## Explicitly not done yet

- Core migration `0021_place_admin_mutation_rls.sql` has been applied only to
  the local development database loaded from `aevo-core-api/.env`; no external
  staging/production Cloud SQL migration has been applied from this workspace.
- No source import or OSM/Overture production provider has been selected or
  ingested; attribution, license, privacy, quota, and SLA gates remain open.
- No claim approval, community approval, or merge command is enabled. The
  privileged Admin Place mutation boundary is implemented for the authorized
  test path; canonical Place DELETE is intentionally a soft delete and
  immutable revisions are retained. Legacy compatibility rows may be hard
  deleted only by exact mapping identity or source-link UUID, with
  `map.places.manage`, CSRF, audit, and a development/test/explicit-maintenance
  environment guard. This does not delete canonical Place rows, revisions,
  audit rows, or Store/TraceDee source-of-truth records.
- No source/provider network adapter is enabled; the worker source endpoint only
  returns a review-required dry-run plan when explicitly configured.
- No Go production route cutover has occurred; the legacy discovery adapter is
  still the default. The local canonical Map path is wired to the Core Search
  and Map overlay routes, but canonical Place data is empty until an approved
  projection build populates `aevo_place_public_projections`.
- The labelled replay validator remains pure, while the guarded local replay
  apply path publishes only validated projections for existing canonical rows.
  The opt-in local mutation integration tests now prove create, replay,
  idempotent replay retry, failed projection last-known-valid fallback, rebuild,
  canonical soft-delete, scoped legacy compatibility hard-delete, audit, and
  revision history. The new opt-in reference integration also proves explicit
  mapping plus redirect resolution without rewriting legacy source rows.
  Deployment route smoke with real gateway signing/session material and
  production map/list parity remain open.
- No vector-tile/search-engine scale path has been added. V1 uses bounded JSON
  and existing MapLibre/client clustering.
- Live booking slots, queue state, wait times, and inventory remain outside
  every static Place projection and overlay.

## Verification completed

- `aevo-contracts`: OpenAPI validation, strict TypeScript check, and 36 Bun
  test cases pass (including the new source/workflow contract checks).
- `aevo-core-api`: Core build, full 172-test suite with the connected
  development database enabled, mutation validation, labelled
  projection replay, reference-resolver tests, workflow validation tests, and
  migration dry-run/verify pass. The focused opt-in local DB suite passes 3/3,
  including explicit mapping plus redirect resolution, validated projection
  replay/idempotent retry, exact-key legacy mapping/source-link deletion,
  public Map/Search/Nearby/Detail reads, and replay/mutation audits. The Feed
  canonical-source integration suite also passes 6/6.
- `aevo-background-worker`: strict TypeScript check, production build, and 7
  tests pass for the
  disabled/review-only source-normalization boundary.
- `aevo-go`: TypeScript check, full 150-test suite, and production build pass;
  canonical overlay/detail, data-policy, and Feed `placeReference` contract
  tests are included.
- `aevo-admin`: React Router type generation, TypeScript check, and production
  build pass with the guarded Place editor/detail route.
- `aevo-edge-gateway`: strict TypeScript check, 7 gateway tests, and preview
  dry-run build pass; the tests cover forwarding of all four public Place route
  shapes but use a mocked Core upstream.
- Local Core HTTP smoke now returns 200 for Map/Search/Nearby and 404 for an
  unknown Detail UUID, with request IDs present and an empty local projection
  result set. The reader lifecycle regression that previously produced HTTP
  500 is covered by the opt-in database integration test.
- Local Core HTTP smoke for the deployment-owned replay boundary returns 401
 for missing/wrong worker tokens and 400 for a token-authenticated invalid
 request; a malformed fixture is rejected with 422 before any DB write. The
 actual publish path is covered by the local DB integration test.
- Local Edge -> Core smoke now uses the real local gateway HMAC path: direct
  unsigned Core Place requests return 403, while Edge-forwarded Map/Search/
  Nearby requests return 200 with propagated request IDs and unknown Detail
  returns 404. This is local evidence only; target-environment secrets and
  deployment remain open.
- Local test migration apply was performed; no production deploy or broad
  destructive data operation was performed. The opt-in test removes only its
  exact generated legacy compatibility fixtures and cleans the generated public
  projection/replay/audit rows; canonical Place DELETE remains soft-delete by
  design, so immutable revision rows and canonical history remain
  recoverable/auditable.

## Next approval gates

1. Name the deployment owner for Core migration application and run the
   migration ledger in the target non-local environment; the local ledger is
   already verified at 33 applied migration rows, including migration 0030.
2. Run the deployment-owned compatibility/projection replay and verify counts,
   RLS, stale fallback, payload budget, and map/list parity. The local
   labelled replay, determinism, duplicate-ID, static-field, and payload
   budget checks now pass.
3. Run Core/Edge route smoke tests in the target environment with the real
   request ID, cursor secret, and deployed projection rows; the local HMAC
   smoke is complete.
4. Approve a first source/provider/legal packet before enabling the bounded
   worker normalizer for that source; the current adapter remains provider-neutral.
5. Run the target migration/RLS/route smoke with
   `AEVO_PLACE_REFERENCE_RESOLUTION` disabled, then enable it only for a
   controlled Feed geography and verify canonical-ID parity. Trace/Save/
   booking handlers still need owner-bound resolver wiring before any merge
   command is enabled.
6. Only then set `VITE_PLACE_API_MODE=canonical` for a controlled geography.

## Implementation continuation record (2026-09-26, DB-backed resolver and Feed reference batch)

- MAP-010 runtime boundary: added a transaction-scoped Core reference read
  store that loads explicit `aevo_place_legacy_mappings` rows and a bounded
  recursive active redirect graph, then delegates the decision to the pure
  `PlaceReferenceResolver`. Mapping conflicts, invalid redirects, and unknown
  references fail closed; names, slugs, coordinates, and provider IDs are not
  used for identity inference.
- Public canonical Detail now resolves redirects through that shared DB-backed
  boundary and returns the existing `redirectFrom` contract with reason and
  hop count. Feed Place items now expose an optional versioned
  `placeReference`; Core hydration resolves it only when the server-side
  `AEVO_PLACE_REFERENCE_RESOLUTION=true` gate is enabled, while legacy item
  identity remains unchanged.
- Go and shared Feed contracts accept the new reference envelope. The resolver
  read path closes database readers before issuing the redirect query on the
  same connection, covering the prior Npgsql reader lifecycle regression.
- Verification: Core full suite 128/128; focused local DB reference/mutation
  integration 3/3; Feed source integration 3/3; migration ledger verified at
  33 applied rows; Go typecheck, 150 tests, and production build pass; Edge
  typecheck, 7 tests, and preview dry-run build pass; Admin typecheck/build
  pass; shared contracts 36 tests pass.

## Implementation continuation record (2026-09-27, mutation and public-read hardening)

- Fixed the Core admin Place read transaction so the `NpgsqlDataReader` is
  disposed before the transaction commits. Public Map/Search/Nearby metadata
  now collapses multiple projection/source revisions to deterministic
  `mixed` (and empty values to `unknown`) instead of throwing on a multi-place
  response.
- The opt-in mutation test now reuses one replay observation timestamp for an
  idempotent retry and wraps the generated fixture in exact `placeId`/marker/
  `runId` cleanup. Active fixtures are soft-deleted through the Core mutation
  boundary; their public projection, replay run, and test audit rows are
  removed. Immutable revision history is intentionally retained.
- Connected verification on 2026-09-27: `PlaceProjectionWriteIntegrationTests`
  passed 2/2, `FeedCanonicalDataIntegrationTests` passed 6/6, and the full
  Core suite passed 172/172 with `AEVO_RUN_PLACE_DATABASE_TESTS=true`. The two
  interrupted `place-write-*` fixtures were individually marked removed and
  their public projections/audit rows were then deleted by exact ID; read-back
  confirmed no active test fixture, legacy mapping, source-link, projection,
  or matching audit row remained.
- The Feed public-field safety check now distinguishes the allowlisted public
  `placeReference.sourceVersion` envelope from forbidden raw `source`,
  `sourceId`, and `rawSource` properties. This preserves the typed Go/Core
  contract without weakening private-field protection.

## Implementation continuation record (2026-09-26, Go downstream identity boundary)

- Feed read-side migration: `aevo-go` now materializes an explicit resolved or
  redirected `placeReference.canonicalPlaceId` as a separate
  `DiscoveryPlace.canonicalPlaceId`; it never promotes the Feed item ID or
  legacy slug to canonical identity. Canonical mode opens `/places/:placeId`
  and uses the UUID for Map selection. Unresolved references stay unresolved.
- Trace read-side migration: the optional versioned Place reference is accepted
  by the TraceDee client contract. Trace stop Map links use its canonical UUID
  only when `VITE_PLACE_API_MODE=canonical`; TraceDee source `place.id` remains
  the mutation identity for the existing owner-bound contribution/remix APIs.
- Map deep-link hardening: initial bounded Map search preserves an explicit
  selection, and list/MapLibre selection matches either canonical `id` or
  legacy `slug`, so a UUID link cannot silently lose its target.
- Cross-domain write guard: Feed no longer promotes a place slug to
  `venueSlug`; canonical mode refuses the legacy slug-based customer Favorite
  write and only shows booking entry points with an explicit venue mapping.
- Verification: Go typecheck, full 150-test suite, and production build pass.
  This is read-side compatibility only; TraceDee server emission, customer
  Customer Save/favorite writes, business links, booking writes, target
  migration/RLS, and canonical production cutover remain separately gated. A
  Core Feed-owned canonical Place save interaction projection now exists as a
  controlled development slice; it is not Customer favorites parity or a
  production cutover.
