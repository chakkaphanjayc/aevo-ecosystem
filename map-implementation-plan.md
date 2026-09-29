# Aevo Map, Place Registry, and Discovery implementation plan

Source plan: map_implementation_plan.md  
Audit date: 2026-09-24  
Status: IMPLEMENTATION IN PROGRESS — MAP-001–005 foundation, MAP-006–008 validation, MAP-009 guarded Place mutations/editor plus scoped legacy compatibility purge, labelled replay, and shared reference-resolution foundation implemented; production cutover remains gated

This document is the revised implementation plan produced from the local
polyrepo audit. The user has now authorized implementation and test-database
mutation. Changes are being delivered in dependency order, while external
database application, source imports, public client cutover, and production
cutover remain separately gated.

## Scope guard

Do not enable production cutover or privileged Place writes until MAP-000 and
the relevant downstream gate has an accepted ownership, route, migration,
licensing, and security decision. In particular:

- do not apply Core migrations to an external database from this workspace;
- do not import a source dataset without its source/license approval;
- do not install a search engine or map provider dependency;
- do not restore a second Hub API gateway;
- do not let the browser write canonical Place data;
- do not treat OSM/Overture IDs as Aevo primary IDs;
- do not put live business capability state in basemap/vector tiles.

Detailed design notes are in docs/map-system/00-current-state.md through
docs/map-system/19-open-questions.md.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

The final review makes the following decisions mandatory for the next revision
of the plan:

- Place is geometry-capable, not point-only. Canonical geometry may evolve to
  polygon/multipolygon; displayPoint, labelPoint, centroid, boundingGeometry,
  parent Place, and child/sub-place relations are distinct concepts.
- Place is the cross-product geographic identity. Organization, Business,
  Branch, Store, Venue, and BookableResource retain their operational/domain
  IDs and link to Place explicitly.
- One Place may contain multiple Businesses/Branches. A Branch has one primary
  Place for public identity and may have additional typed service/location
  links. Venue is a booking identity, not a geographic identity.
- Map overlay, Search/Nearby, and Detail are separate conceptual read paths.
  The overlay is lightweight, bounded, cacheable, truncatable, and
  vector-tile-compatible; Search/Nearby own ranking and pagination.
- Geocoding is a provider abstraction and temporary input. A geocoder result
  never becomes a canonical Place automatically. Public Nominatim is not an
  assumed production SLA.
- Address fields are semantic and Thailand-first, with localized/alternate
  names and deterministic Thai/English/alias normalization. No ML search in
  V1.
- Static Place capability and live operational availability are separate.
  Capability has source/freshness; live slots, queue, wait, and inventory are
  fetched from their owning services.
- Canonical Place state is separate from a compact public discovery
  projection. Projection version, source revision, freshness, rebuild,
  invalidation, rollback, and last-known-valid state are explicit.
- Provenance is field-level/revision-level, not one global source-priority
  rule.
- MAP-010 uses one bounded redirect resolver for merged IDs. Reads resolve;
  new writes to retired IDs reject; loops, unbounded hops, resurrection, and
  silent history loss are prohibited.
- Business claims and community submissions can progress in parallel after
  canonical contracts and public API foundations. aevo-admin can begin a
  read-only registry shell before privileged mutation commands are enabled.

## 1. Current Map/Place architecture

Aevo Go has a substantially built Map UI: MapLibre/react-map-gl, clustered
GeoJSON markers, URL-owned filters, committed viewport search, responsive
sheet/list states, WebGL fallback, and an optional OSM/Overpass adapter. The
main sources are:

- aevo-go/src/features/map/map-page.tsx
- aevo-go/src/features/map/maplibre-map.tsx
- aevo-go/src/features/map/contracts.ts
- aevo-go/src/features/map/use-map-discovery.ts
- aevo-go/src/features/map/osm-service.ts

The current first-party discovery data is an opt-in projection of Stores:

- customer_store_profiles stores public metadata and coordinates;
- the open-source map migration adds PostGIS geography, a trigger, a partial
  GiST index, and public_store_discovery_in_view;
- customer-discovery.ts validates bounds and calls the RPC, but also has a
  bounded scan fallback and offset-style cursors.

TraceDee has a separate place-like system:

- tracedee_places has its own UUID, geometry, moderation status, and Store
  linkage;
- traces, stops, posts, and place search reference that table;
- it is not yet the universal Place authority.

Business and booking domains use organization/store/venue/resource IDs. Feed
contracts use place-like items but do not yet state one canonical Place ID.
The Go client documents public discovery/search routes, while the inspected
Core API source visibly exposes public Feed but not a matching discovery
handler. The route owner must be verified before implementation.

## 2. Existing reusable components

Reuse these components and boundaries:

- existing MapLibre renderer, clustering, URL state, TanStack Query, loading,
  error, mobile sheet, and accessible list patterns;
- PostGIS geography and the current partial GiST approach;
- bounded discovery filters and public projection concept;
- TraceDee moderation, report, audit, and contribution concepts;
- existing Store, organization, venue, bookable resource, booking, Feed, and
  Trace domain identities;
- Core API/Edge request boundary and app-scoped sessions;
- aevo-admin server-only BFF and platform RBAC separation;
- Core migration ownership policy in LOCAL_DEVELOPMENT.md;
- typed contracts/OpenAPI patterns in aevo-contracts;
- worker/infrastructure Pub/Sub, Cloud Tasks, Cloud SQL, and observability
  primitives only when measured and approved;
- Aevo security architecture and universal typed query boundary.

The reusable rule is adapter/read-projection first. Existing tables should be
mapped and compared before any normalization or destructive migration.

## 3. Current architectural problems

1. No cross-module canonical Place ID exists.
2. customer_store_profiles and tracedee_places can represent the same location
   independently.
3. Store, Branch, Venue, and Place have no explicit universal relationship.
4. The client can query Overpass and merge records without durable provenance.
5. The 15 m/name client dedupe rule is not safe as identity/conflation logic.
6. Documented Go discovery routes are not visibly wired in the inspected Core
   API source.
7. Discovery cursors are offsets, not stable signed keyset cursors.
8. The no-bbox path can scan and filter profiles in application code.
9. Feed/Trace contracts do not clearly distinguish item IDs from Place IDs.
10. There are no canonical claim, verification, submission, conflation, or
    merge-redirect workflows.
11. Booking capability is not linked to Place as a separate read projection.
12. Basemap provider, attribution, external POI license, and source freshness
    are not one governed policy.
13. The model currently describes Place geometry primarily as a point and does
    not define parent/child or polygon-safe semantics.
14. The plan does not make Place/Business/Branch/Store/Venue cardinality
    explicit enough for an ADR.
15. Map markers and ranked result lists are still described as one discovery
    response family.
16. No explicit geocoder provider abstraction or temporary-result boundary is
    defined.
17. The address model is not explicitly Thailand-first and field-semantic.
18. Static capability and live operational state are not strictly separated in
    every read path.
19. Public projection rebuild/freshness/rollback is not yet a first-class
    contract.
20. Merge behavior needs a shared resolver rather than only downstream
    reference migration.

## 4. Recommended canonical Place model

Create an Aevocado-owned Place identity only after MAP-000. It should contain
stable UUID, slug/aliases, lifecycle, localized names, category taxonomy,
public geometry, public area/address, revision, and field-level provenance.

Keep separate concepts:

~~~text
Place
  -> source links and raw snapshots
  -> Business/Branch/Store/Venue relationships
  -> verification/claim state
  -> community submissions and revisions
  -> Feed/Trace/Save/Search references
  -> capability projection
~~~

External source IDs, Store IDs, TraceDee IDs, Venue IDs, and generic Feed item
IDs remain compatibility references. Merge creates redirects and preserves
history. A source disappearance is evidence for review, not automatic delete.
Verified fields cannot be overwritten by untrusted imports.

The geometry envelope is:

~~~text
Place
  canonicalGeometry: point | polygon | multipolygon-safe
  displayPoint / labelPoint
  centroid / boundingGeometry
  parentPlaceId
  typed child/sub-place relations
~~~

Use displayPoint/labelPoint for markers, approved entrance/display points for
distance ranking, canonicalGeometry/boundingGeometry for viewport
intersection, and semantic names/address for text search. One Place may contain
multiple businesses. A Branch has one primary Place and optional typed
secondary links. Venue and BookableResource remain booking-domain IDs.

See docs/map-system/02-target-architecture.md and
docs/map-system/03-place-domain-model.md.

See docs/map-system/03-place-domain-model.md.

## 5. Recommended basemap stack

Use the existing MapLibre/react-map-gl renderer with a provider-neutral style
and tile configuration. Select a production provider after traffic,
commercial-use, cache, privacy, SLA, style, sprite, glyph, and attribution
review.

Keep basemap, Place overlay, Trace overlay, capability detail, and user
location as separate layers. V1 should use a bounded canonical Place JSON
overlay and client clustering. Add vector tiles only if measured payload or
latency requires them. Keep live booking state out of all static tiles.

Map overlay, Search/Nearby, and Detail are separate conceptual APIs. The
overlay is a lightweight feature feed with density/truncation/payload budgets;
Search/Nearby return richer ranked summaries; Detail hydrates canonical
geometry and links to live capability reads. The overlay can later become MVT
without changing canonical Place IDs or Search/Detail contracts.

Geocoding is configured independently from basemap tiles. Its forward/reverse
results are temporary address evidence and require attribution/quota/privacy
policy before use.

Preserve:

- URL-owned map state;
- explicit Search this area;
- accessible list fallback;
- WebGL/provider failure states;
- attribution in map, loading, error, and list states.

See docs/map-system/05-basemap-and-tiles.md.

## 6. Recommended external Place sources

V1 source priority:

1. Aevo-owned and business-verified data for authoritative business fields.
2. A governed OSM-derived source or reviewed OSM import for broad public POI
   candidates, with ODbL attribution/provenance.
3. User submissions as reviewable candidates, never direct canonical writes.
4. Overture Places only after source-level license, attribution, territory,
   storage, and conflation approval.
5. Government/open datasets only through a per-dataset license/source packet.

The existing direct Overpass mode remains a development/demo adapter. It
should not be the production request path for every map pan.

## 7. Data provenance and licensing risks

OSM is ODbL data and requires attribution and a clear license notice.
Overture's Places documentation describes source-specific CDLA
Permissive/Apache licensing and distinguishes Places from OSM-derived Base
data. Tile-provider terms are separate from data licenses.

Risks:

- derivative-database/share-alike boundary;
- source-specific attribution lost in a merged record;
- provider API/caching/traffic limits;
- user content rights mixed with external data;
- source takedown or license change;
- raw source payloads retained without a legal basis;
- screenshots/exports missing attribution.

Required source references:

- https://www.openstreetmap.org/copyright
- https://opendatacommons.org/licenses/odbl/
- https://docs.overturemaps.org/attribution/
- https://docs.overturemaps.org/guides/places/

See docs/map-system/04-open-data-and-licensing.md.

## 8. Business verification architecture

Keep Business/Organization/Branch/Store/Venue as existing domain identities.
Add an explicit relationship to Place. A claim asserts that an authorized
business operates at a Place; verification approves a scoped relationship or
field. It is not a blanket endorsement of every external/community field.

Proposed flow:

~~~text
REQUESTED -> EVIDENCE_REQUIRED -> UNDER_REVIEW
          -> VERIFIED / REJECTED / REVOKED / EXPIRED
~~~

Competing claims become a conflict queue. Evidence is private, scoped, and
audited. Verified/protected fields are insulated from external imports.
Booking availability remains owned by the booking service and is exposed as a
freshness-aware capability projection.

One Place may contain multiple Businesses/Branches. A Business may operate
many Branches. A Branch has one primary Place for public identity and can have
additional typed links. Venue links to Place but remains a booking identity;
BookableResource remains below Venue. Business claims and community edits are
parallel after MAP-001/MAP-003.

See docs/map-system/08-business-verification.md.

## 9. Community contribution architecture

Users submit typed new-Place candidates, edits, duplicates, closure reports,
and content/capability issues. The server stores immutable submissions and
proposed diffs. Moderation applies approved changes as canonical revisions.

The browser cannot mutate canonical Place rows. New submissions should show
likely existing Places first, support needs-info/rejection/appeal, apply
anti-abuse limits, protect private evidence, and preserve submitter/history
attribution.

See docs/map-system/09-community-submissions.md.

## 10. Admin architecture

Use aevo-admin as the long-term operational control plane. Its browser calls
the same-origin server BFF; the BFF calls Core API; Core enforces Admin
app-scoped session, platform RBAC, CSRF, permission, idempotency, RLS/data
scope, and audit.

Required future surfaces:

- Place registry and revisions;
- sources/import runs/license metadata;
- conflation candidates and merge/split;
- claims/evidence/verification;
- community submissions/reports;
- projection/cache/source operations;
- audit and rollback.

The transitional Hub moderation UI can provide evidence but must not become a
second privileged source of truth.

See docs/map-system/12-admin-control-plane.md.

## 11. PostGIS and query design

Reuse current PostGIS. Move from Store-only discovery to a compact canonical
Place read projection. Support bounded viewport, nearby, Search this area,
text discovery, detail, and separate capability reads.

Use validated WGS84 geography predicates, partial GiST/indexes validated by
EXPLAIN, bounded text/filter queries, and signed keyset cursors. Handle
antimeridian explicitly if global coverage is required. Do not trust client
SQL, tenant IDs, source authority, or verification scope.

V1 does not justify a dedicated search engine. Reassess after measuring
language, typo-tolerance, latency, rows scanned, and scale.

See docs/map-system/10-map-discovery-and-postgis.md and
docs/map-system/11-search-and-nearby.md.

## 12. Feed/Trace/Booking integration

Add explicit canonical placeId fields while preserving domain IDs:

- Feed itemId remains Feed identity; placeId identifies the Place subject.
- Trace cover/stop references resolve to canonical Place with legacy
  tracedee_places IDs retained during transition.
- Map/Search/Save use canonical Place ID and redirect resolution.
- Business/Branch/Store/Venue retain their IDs and link to Place.
- Booking owns slots, holds, pricing, and customer eligibility.
- Capability projections expose booking routes/freshness but not live rows or
  secrets in tiles.

Merge, close, and redirect tests must prove that Feed, Trace, Save, and
booking history remain understandable.

See docs/map-system/13-feed-trace-booking-integration.md.

## 13. V1 scope

V1 should include:

- canonical Place contract and compatibility resolver;
- bounded Map overlay plus separate Place Search/Nearby/Detail contracts;
- PostGIS-backed public projection;
- existing MapLibre UI connected through the approved API boundary;
- provider-neutral basemap configuration and attribution;
- basic forward/reverse geocoding provider boundary with no automatic
  canonicalization;
- point-capable, polygon-safe geometry and Thailand-first address fields;
- one approved external source adapter or curated fixture;
- source links/provenance and reviewable conflation;
- explicit Business/Branch/Venue to Place link;
- capability projection with freshness;
- minimum claim/verification and community submission workflows;
- aevo-admin read/review surfaces required for safe operations;
- audit, rollback, metrics, and load-test evidence.

## 14. Things explicitly deferred

- big-bang replacement of Store, TraceDee, Play, or POS schemas;
- global coverage before geography/product decisions;
- direct production Overpass per viewport;
- indoor maps and floor plans;
- global self-hosted tiles and full-world Place ingestion;
- ML search, ML conflation, and ML ranking;
- Overture ingestion before legal/source approval;
- generic external ratings import;
- live booking state in map tiles;
- dedicated search engine before PostGIS evidence;
- vector tiles before payload/latency evidence;
- automatic merges on one weak signal;
- public precise coordinates for sensitive/private locations;
- arbitrary user JSON or raw SQL query APIs;
- replacing the existing API gateway topology.

## 15. Revised MAP-000... task sequence

~~~text
MAP-000 Ownership, route, and migration decision
  -> MAP-001 Canonical Place contracts and ID namespaces
     -> MAP-002 Compatibility mapping and read projection
        -> MAP-003 Separate Map overlay/Search/Nearby/Detail API
           -> MAP-004 MapLibre basemap and geocoder abstraction
           -> MAP-005 External source ingestion/provenance
           -> MAP-006 Business/Branch/Venue links -> MAP-007 Verification
           -> MAP-008 Community submissions and edits
        -> MAP-009 aevo-admin registry shell and guarded Place mutations
MAP-005 + MAP-006 + MAP-007 + MAP-008 -> MAP-009 privileged mutations/editor
MAP-002 + MAP-005 + MAP-009 -> MAP-010 Conflation/merge/redirect resolver
MAP-003 + MAP-004 + MAP-010 -> MAP-011 Cache/vector-tile scale path
MAP-011 -> MAP-012 Staged production rollout and operations
~~~

MAP-005 can prepare source/legal fixtures after MAP-000, but cannot publish
canonical data before MAP-001/002. MAP-008 is not blocked by MAP-007.
MAP-009 read-only work can begin once Admin contracts/metadata exist; the
guarded canonical Place mutation/editor path is now test-enabled with Core
audit, CSRF, optimistic revision, and soft-delete boundaries. MAP-011 requires
measured load evidence.

## 16. Dependency graph

~~~text
MAP-000
  -> MAP-001
     -> MAP-002
        -> MAP-003 -> MAP-004
                   -> MAP-005
                   -> MAP-006 -> MAP-007
                   -> MAP-008
        -> MAP-009 registry shell and guarded mutations
MAP-005 + MAP-006 + MAP-007 + MAP-008 -> MAP-009 privileged mutations/editor
MAP-002 + MAP-005 + MAP-009 -> MAP-010
MAP-003 + MAP-004 + MAP-010 -> MAP-011 -> MAP-012
~~~

The detailed phase gates and rollback policy are in
docs/map-system/18-migration-plan.md.

## 17. Major risks and blockers

| Risk/blocker | Consequence | Gate |
| --- | --- | --- |
| No accepted canonical/migration owner | Duplicate tables and unsafe writes | MAP-000 |
| Discovery route owner unclear | Client contract cannot be verified | MAP-000/MAP-003 |
| TraceDee and Store records overlap | Duplicate Places and broken references | MAP-002/MAP-010 |
| External license/tile terms unclear | Legal/takedown/attribution incident | MAP-000/MAP-005 |
| No claim/verification workflow | Businesses cannot safely own fields | MAP-007 |
| Browser direct external enrichment | Rate limits, inconsistent identity, no provenance | MAP-003/MAP-005 |
| Offset cursor and unbounded scan | Duplicates, skips, latency spikes | MAP-003 |
| Booking/capability freshness unclear | False “available/bookable” claims | MAP-006 |
| Admin route/permission surface missing | Unsafe manual operations | MAP-009 |
| No load/SLO baseline | Premature cache/tile architecture | MAP-011 |
| Existing repos contain untracked/dirty work | Accidental overwrite | Every implementation phase |
| Point-only geometry assumption | Polygon/parent Places cannot evolve safely | MAP-001 |
| One heavy response model | Map payloads and list ranking become coupled | MAP-003 |
| Geocoder terms/quota unclear | Privacy, attribution, and SLA incident | MAP-000/MAP-004 |
| Projection treated as authority | Stale or partial rebuild corrupts domain truth | MAP-002/MAP-011 |
| Unbounded merge resolution | Loops, resurrection, or broken history | MAP-010 |

## 18. Questions requiring a product/engineering decision

The revised MAP-000 questions are:

1. Which repository owns canonical Place data and future migrations?
2. Which exact deployed route serves the current Go discovery contract?
3. Is Hub's discovery RPC a transition adapter or the target execution path?
4. Is Place the cross-product geographic identity, with Store/Venue/Branch
   retaining operational IDs?
5. Can one Place contain multiple Businesses, and can a Branch have multiple
   typed Place links with one primary?
6. Which point/polygon/multipolygon/parent-child geometry semantics are
   accepted in V1?
7. What are map overlay feature, payload, density, truncation, zoom, and
   clustering limits?
8. Which Core route conventions represent Map overlay, Search/Nearby, and
   Detail?
9. Which geocoder provider and terms are approved? Public Nominatim is not an
   assumed production SLA.
10. Which Thailand-first address fields, aliases, and localized names are
    required?
11. Which capabilities are static projections, and what freshness makes each
    badge stale?
12. What field-level authorities apply to geometry, address, website,
    category, capability, and moderation?
13. What resolver hop cap, split/rollback policy, and retired-ID write
    rejection rule are required?
14. Which public/sensitive polygon geometries must be generalized or withheld?
15. Which legacy Feed/Trace/Save/booking IDs remain resolvable?
16. What p50/p95/p99 goals and ownership define readiness?

## Task catalog

Every task below is intentionally implementation-ready but remains gated. The
task catalog is not authorization to edit production code.

### MAP-000 — Resolve ownership, route, and migration boundary

- Goal: Name the canonical Place data owner, database migration owner, public
  route owner, worker owner, Admin owner, and transition/sunset policy.
- Why: The audit found Store, TraceDee, Go, Hub, Core, and Admin boundaries
  that are not yet one Place authority.
- Affected repositories: root docs, aevo-core-api, aevo-hub,
  aevo-infrastructure, aevo-admin; documentation/boundary files only.
- Existing code reused: LOCAL_DEVELOPMENT.md; aevo-infrastructure/scripts/check-migration-ownership.ts; aevo-admin/docs/REPOSITORY_BOUNDARY.md; current Hub migrations and Core Program.cs as evidence.
- Files/modules likely affected: an approved ADR/decision record, route matrix,
  ownership matrix, and docs/map-system/*; no production module is selected
  until the decision.
- Database change: none.
- API change: none; record current route claims versus observed handlers.
- Dependencies: none.
- Implementation steps: verify deployed and branch route ownership; compare
  migration checks; identify canonical source; name owners; approve source
  and license gates; define rollback and sunset.
- Tests: documentary consistency check, route smoke-test plan, security and
  migration ownership review.
- Acceptance criteria: signed/recorded ADR answers the revised MAP-000
  questions on owner, route, geometry, Place/Business/Branch/Store/Venue
  cardinality, geocoder policy, Thailand address semantics, overlay budgets,
  capability freshness, field authorities, and redirect resolver rules;
  names owners, prohibits a second gateway, and authorizes or rejects the
  transition adapter.
- Risks: decision ambiguity, conflicting repository expectations, hidden
  deployed route.
- Rollback: no runtime rollback; keep current systems unchanged and mark
  implementation blocked if ownership is not accepted.
- Complexity: M

### MAP-001 — Publish canonical Place contracts and ID namespaces

- Goal: Define versioned geometry-safe PlaceSummary, PlaceDetail, Map overlay,
  Search/Nearby, capability, source/provenance, redirect, claim, submission,
  address, and error contracts.
- Why: Current Feed/Trace/Map/Store contracts use ambiguous place-like IDs.
- Affected repositories: aevo-contracts, aevo-core-api, aevo-go, and
  aevo-hub compatibility documentation.
- Existing code reused: aevo-go/src/features/map/contracts.ts; aevo-go/src/lib/customer-api.ts; aevo-contracts/src/feed.ts; aevo-core-api FeedApiContracts.cs; aevo-hub TraceDee contracts.
- Files/modules likely affected: versioned contract files, OpenAPI, Go Zod
  adapters/fixtures, Core DTOs, compatibility mapping docs.
- Database change: none.
- API change: versioned canonical Place vocabulary plus separate conceptual
  Map overlay, Search/Nearby, and Detail contracts; no live endpoint switch
  yet.
- Dependencies: MAP-000.
- Implementation steps: define IDs/legacy namespaces; separate placeId from
  itemId/storeId/venueId/sourceId; define canonicalGeometry/displayPoint/
  labelPoint/boundingGeometry/parent-child semantics; define Thailand-first
  address and localized aliases; define capability freshness and field-level
  provenance; publish separate overlay/list/detail examples; agree
  deprecation window.
- Tests: TypeScript/.NET contract tests, OpenAPI validation, point/polygon/
  parent-child geometry fixtures, Thai/English aliases, malformed payload,
  redirect, null display point, overlay truncation, and capability freshness.
- Acceptance criteria: all consumers can identify canonical placeId versus
  legacy IDs; no external ID is primary; contract version and ownership are
  recorded.
- Risks: contract churn, incompatibility with TraceDee/Feed clients.
- Rollback: retain prior contract version and adapters; do not remove legacy
  fields until consumer inventory passes.
- Complexity: M

### MAP-002 — Build compatibility mapping and canonical read projection

- Goal: Map existing customer_store_profiles, tracedee_places, and business
  records into canonical Place candidates and a compact public read projection
  without destructive rewrite.
- Why: A stable read path is needed before claims, ingestion, or consumer
  migration can share identity.
- Affected repositories: approved data owner, aevo-core-api, aevo-hub
  compatibility adapter, aevo-contracts, and worker if mapping is asynchronous.
- Existing code reused: customer-discovery.ts; tracedee.ts; public-store
  migrations; booking/store/Trace relations; existing PostGIS location/index.
- Files/modules likely affected: mapping adapter, projection/rebuild code,
  compatibility resolver, fixtures, and approved Core-owned migration files.
- Database change: only after MAP-000 approval; add mapping/projection/source
  references under the named migration owner, including projectionVersion,
  sourceRevision, freshness, rebuild/invalidation status, and last-known-valid
  version; with no destructive deletion.
- API change: internal/read-adapter behavior to return MAP-001 contract.
- Dependencies: MAP-001 and approved data owner.
- Implementation steps: inventory rows; assign match status; preserve legacy
  IDs; attach source/provenance; identify conflicts; build replayable
  projection; compare counts/results with current discovery and Trace reads.
- Tests: mapping idempotency, unresolved records, point/polygon/parent-child
  candidates, duplicate candidates, address/provenance validity, RLS,
  projection rebuild/stale/rollback, and legacy ID resolution.
- Acceptance criteria: every mapped result has canonical or explicit
  unresolved status; no duplicate canonical ID is created on replay; existing
  Trace/Store reads remain available.
- Risks: accidental conflation, missing historical links, migration-owner
  conflict.
- Rollback: disable the projection/adapter and return to current reads;
  preserve mapping evidence; no source table deletion.
- Complexity: L

### MAP-003 — Implement bounded public Place discovery API

- Goal: Serve separate canonical Map overlay, Search, Nearby, and Detail
  responses through the approved Core/Edge boundary, with capability reads
  kept distinct from live operational state.
- Why: The Go client contract currently has an implementation/ownership gap
  and cannot safely depend on client-side external enrichment.
- Affected repositories: aevo-core-api, aevo-edge-gateway, aevo-contracts,
  aevo-go client adapters, and the approved Hub/data adapter if temporary.
- Existing code reused: current bounds parser/RPC; Map query state; Core/Edge
  request IDs and sessions; public projection field policy.
- Files/modules likely affected: Core public handlers/ports, separate overlay/
  search/nearby/detail DTOs, contract/OpenAPI, Edge route matrix/tests, Go
  request adapters, query tests, and projection repositories.
- Database change: reuse current PostGIS/projection initially; add indexes
  only under the approved owner after EXPLAIN evidence.
- API change: final versioned public Map overlay, Search, Nearby, and Detail
  endpoints following Core conventions, plus signed keyset cursor for ranked
  paths; overlay is bounded and vector-tile-compatible.
- Dependencies: MAP-000, MAP-001, MAP-002.
- Implementation steps: confirm route/origin; enforce auth/public policy,
  bounds/radius/limit; map overlay to compact projection; implement
  Search/Nearby stable ordering/cursor; hydrate Detail separately; publish
  truncation/density/payload budgets; separate static capabilities from live
  service reads; remove the need for direct production Overpass.
- Tests: API contract, map/list marker consistency, overlay truncation/density/
  payload, bounds/antimeridian policy, RLS/public fields, cursor tamper/
  expiry, stale response, timeout, empty/truncated, and load tests.
- Acceptance criteria: deployed route is real and owned; requests are bounded;
  no raw SQL/client scope; response has canonical placeId, attribution,
  freshness, facets/truncation, and deterministic continuation.
- Risks: hidden route dependency, query latency, public leakage, cursor bugs.
- Rollback: feature-flag new facade; keep old discovery adapter read-only and
  return last known valid projection.
- Complexity: L

### MAP-004 — Formalize MapLibre basemap/provider abstraction

- Goal: Connect the existing Map UI to a governed basemap and geocoder
  provider abstraction, with attribution and canonical Place overlay policy.
- Why: Renderer exists, but style URL/provider terms and external overlay
  behavior are not one production contract.
- Affected repositories: aevo-go, aevo-infrastructure/configuration,
  aevo-contracts only if provider metadata is surfaced.
- Existing code reused: maplibre-map.tsx; map-page.tsx; env.ts; styles/index.css; UX map interaction/list fallback.
- Files/modules likely affected: provider config/adapter, attribution UI,
  GeoJSON field mapping, error/fallback tests.
- Database change: none.
- API change: optional provider metadata/canonical overlay response and
  forward/reverse geocoder adapter contract; no new gateway.
- Dependencies: MAP-001, MAP-003, geocoder/tile license and provider approval.
- Implementation steps: select tile/style/geocoder providers; record separate
  terms; configure style, glyph/sprite, geocoder attribution, quota and
  fallback; ensure geocoder results remain temporary; map canonical placeId;
  verify loading/error/WebGL/list/mobile states.
- Tests: tile/geocoder failure, attribution/license UI, caching/quota policy,
  accessibility, clustering, selected/hovered ID, overlay payload size, and
  device/WebGL fallback.
- Acceptance criteria: no direct client production Overpass dependency for
  canonical results; attribution remains visible; list works without WebGL;
  basemap failure does not erase usable Place detail.
- Risks: provider outage/terms, token exposure, styling regressions.
- Rollback: restore existing MapLibre style/config and keep list/discovery
  path available.
- Complexity: M

### MAP-005 — Add external source ingestion and provenance

- Goal: Ingest one approved source through replayable, licensed, auditable
  source adapters and produce reviewable geometry-safe Place candidates.
- Why: Client OSM enrichment has no durable source identity, provenance,
  source disappearance, or rollback.
- Affected repositories: aevo-background-worker, approved data owner/Core,
  aevo-infrastructure, aevo-contracts, and aevo-admin operational views.
- Existing code reused: osm-service parsing concepts; source terms metadata;
  Pub/Sub/Cloud Tasks/worker primitives; PostGIS/read projection.
- Files/modules likely affected: source adapters, import jobs, raw snapshot
  metadata, source links, import run status, worker retries/dead letters.
- Database change: source links, snapshots/import runs, and field provenance
  under approved migration owner only.
- API change: internal job/status/admin contract; no uncontrolled public
  source passthrough.
- Dependencies: MAP-000, MAP-001, MAP-002, legal/source packet.
- Implementation steps: choose source; validate terms; fetch bounded snapshot;
  preserve point/polygon/multipolygon and derive display/label/bounding
  geometry with provenance; normalize; hash/version; keep geocoder results
  temporary; conflate candidate; record review; publish only approved
  changes; handle disappearance and rollback.
- Tests: parser/schema, license metadata, idempotency, rate limit/retry,
  source update/disappearance, verified-field protection, rollback, metrics.
- Acceptance criteria: dry-run/replay produces identical IDs/results; every
  record has source/license/provenance; failed source cannot erase canonical
  data; attribution is available to public UI.
- Risks: license breach, poisoning, rate limits, bad conflation, raw data
  retention.
- Rollback: disable import run, revert unprotected revisions, invalidate
  projection/cache, preserve later manual/business revisions.
- Complexity: XL

### MAP-006 — Link Business, Branch, Store, and Venue to Place

- Goal: Add explicit Place relationships with documented cardinality and
  capability projections without replacing operational business/booking IDs.
- Why: Current Store/Venue/Play/POS domains have no universal Place link.
- Affected repositories: approved Core/data owner, aevo-contracts, aevo-hub,
  aevo-play, aevo-pos, and aevo-go detail/capability consumers.
- Existing code reused: foundation stores/orgs/memberships; booking venues and
  resources; Play venue/court; Go booking drawer and public Store profile.
- Files/modules likely affected: relationship/projection handlers, business
  API adapters, capability contracts, booking deep-link mapping.
- Database change: explicit link/projection tables or columns under each
  domain's approved owner; do not replace store/venue IDs.
- API change: business-link command/read and freshness-aware capability fields.
- Dependencies: MAP-001, MAP-002, MAP-003; organization permission review.
- Implementation steps: define one primary Branch Place plus typed secondary
  links; allow one Place to contain multiple Businesses/Branches; keep Venue
  and BookableResource as booking IDs; validate org scope; link existing
  records; publish compact capability projection; resolve booking route
  separately; test stale/revoked capability.
- Tests: RLS/tenant, one/multiple links, unlink/closure, booking capability
  freshness, no live booking state in discovery/tile.
- Acceptance criteria: authorized business can link through its domain; public
  map shows only approved capability summary; booking remains authoritative.
- Risks: cross-tenant link, stale badge, Play/POS schema ownership conflict.
- Rollback: disable capability projection/link reads; retain business and
  booking records and audit relationship history.
- Complexity: L

### MAP-007 — Implement business claims and verification

- Goal: Add scoped claims, private evidence, review decisions, expiry,
  revocation, competing-claim handling, and public verification projection.
- Why: Public Store metadata is not proof of ownership and external imports
  must not overwrite verified fields.
- Affected repositories: aevo-core-api, aevo-contracts, approved data owner,
  aevo-admin command contract, and aevo-go claim/status consumers.
- Existing code reused: organization permissions, app-scoped sessions, audit,
  Trace moderation/report concepts, business/Place links.
- Files/modules likely affected: claim/evidence/review handlers, status
  projection, permission mappings, public detail fields.
- Database change: claims/evidence/revisions/audit under approved owner; no
  public evidence access.
- API change: customer claim request/status and Admin decision/revoke APIs.
- Dependencies: MAP-003, MAP-006, security/privacy and evidence policy.
- Implementation steps: define evidence types; create claim state machine;
  derive org scope; add conflict queue; approve selected fields; protect
  verified fields; expose badge/freshness; revoke/expire safely.
- Tests: competing claims, invalid scope, evidence privacy, approve/reject,
  revocation, expiry, import overwrite protection, audit/idempotency/CSRF.
- Acceptance criteria: no client can self-verify; every decision is scoped,
  reversible, audited; public badge matches current decision.
- Risks: fraud, sensitive document exposure, stale verification.
- Rollback: revoke/expire claim and restore prior public projection; preserve
  evidence/audit according to retention policy.
- Complexity: L

### MAP-008 — Implement community submissions and edits

- Goal: Accept typed new-Place/edit/duplicate/closure/report submissions and
  apply only approved revisions.
- Why: Community coverage is required, but direct canonical writes are unsafe.
- Affected repositories: aevo-core-api, aevo-contracts, aevo-go,
  aevo-admin, and approved data owner/moderation adapter.
- Existing code reused: TraceDee contributions/reports/moderation, app
  sessions, idempotency/audit, Go Place/Trace detail UX.
- Files/modules likely affected: submission commands/status, diff/revision
  application, duplicate candidate output, notifications/status reads.
- Database change: immutable submissions, proposed changes, moderation/revision
  links under approved owner; no direct browser table writes.
- API change: customer submit/status and Admin review/approve/reject/appeal.
- Dependencies: MAP-001, MAP-003, security/privacy, moderation policy;
  intentionally parallel with MAP-007 after the shared revision boundary is
  stable.
- Implementation steps: typed payloads; duplicate preflight; rate limits;
  store evidence; moderate; apply approved field revisions; preserve author
  and history; support withdrawal/takedown.
- Tests: approval/rejection/needs-info/appeal, duplicate, invalid fields,
  spam/rate limit, private evidence, no direct Place mutation, audit.
- Acceptance criteria: user writes create submissions only; approved changes
  create canonical revisions; public response never claims pending change is
  live.
- Risks: spam, privacy leak, malicious content, moderator bypass.
- Rollback: withdraw/reject pending item or compensate an applied revision;
  never erase audit history.
- Complexity: L

### MAP-009 — Build aevo-admin Place control plane

- Goal: Provide privileged registry, source, conflation, claim, verification,
  submission, operations, and rollback workflows.
- Why: Safe Map operations need a long-term control plane; current Admin has no
  Place-specific workflow.
- Affected repositories: aevo-admin, aevo-core-api, aevo-contracts, and
  infrastructure only for approved observability/configuration.
- Existing code reused: Admin BFF/auth, platform RBAC, Go dashboard/settings,
  audit-log view, unavailable/empty-state patterns.
- Files/modules likely affected: Admin route loaders/actions, typed BFF/API
  clients, permissions, navigation, review tables, audit diff views.
- Database change: normally none beyond MAP-005/007/008/010 domain changes;
  Admin must not create a parallel data store.
- API change: typed /api/v1/admin/map/* handlers in Core boundary.
- Dependencies: MAP-001 and MAP-003 for a read-only registry/review shell;
  MAP-005 through MAP-008 plus Core audit/permission contracts for privileged
  mutation screens.
- Implementation steps: define route/permission matrix; implement read-only
  registry first; add guarded commands; show provenance/freshness; add
  confirmation/reason/idempotency; preserve query URL state.
- Tests: Admin auth/cookie isolation, permission denial, CSRF/idempotency,
  tenant/platform separation, audit, no fabricated data, rollback.
- Acceptance criteria: all privileged writes go through Core; no browser
  service-role/Supabase access; actions are audited and reversible.
- Risks: privileged boundary leak, UI exposing unavailable data as real,
  parallel Hub Admin behavior.
- Rollback: disable feature group/routes; retain Core audit/state; keep
  read-only compatibility if safe.
- Complexity: XL

### MAP-010 — Implement conflation, merge/split, and redirects

- Goal: Calibrate multilingual/geometry-aware matching, human review,
  merge/split, one bounded redirect resolver, downstream reference
  preservation, and compensating rollback.
- Why: Multiple source/store/Trace records will otherwise fragment identity.
- Affected repositories: approved worker/data owner, aevo-core-api,
  aevo-contracts, aevo-admin, and Feed/Trace/Go compatibility consumers.
- Existing code reused: current OSM normalization/distance as a starting
  signal only; TraceDee/store IDs; moderation/audit; Map detail resolver.
- Files/modules likely affected: candidate scoring, parent/child containment,
  review commands, shared redirect resolver, reference adapters, cache
  invalidation, retired-ID write checks, and metrics.
- Database change: match decisions, redirects, revision links under approved
  migration owner; no hard delete of losing IDs.
- API change: Admin merge/split/keep-separate and shared public redirect/
  resolution behavior for Map, Search, Feed, Trace, Saves, business links,
  booking links, old URLs, and analytics adapters.
- Dependencies: MAP-002, MAP-005, MAP-009, labelled test corpus.
- Implementation steps: normalize multilingual names; compare geometry type,
  containment, display points, and parent/child relations; score evidence;
  create review queue; merge with impact preview; resolve all reads through
  the shared resolver; reject writes to retired IDs; support split and
  compensating rollback; invalidate slug/cache/tile keys.
- Tests: Thai/English, same-building branches, point/polygon/parent-child
  geometry, stale coordinates, duplicate source, Feed/Trace/Save/booking
  merge, redirect loops, hop cap, merged-ID write rejection, and rollback.
- Acceptance criteria: every merge has evidence/audit; no history breaks; old
  IDs resolve safely; automatic high-confidence links remain reversible.
- Risks: false merge, broken user history, redirect loop, irreversible data
  movement.
- Rollback: compensating split/redirect restoration while preserving later
  edits; disable auto-linking and return to review-only mode.
- Complexity: XL

### MAP-011 — Tune caching, clustering, and vector-tile scale path

- Goal: Meet separate map-overlay and Search/Nearby latency/payload goals with
  client/Edge/DB caching and add vector tiles only if necessary.
- Why: Premature tile/search infrastructure would increase ownership and
  licensing risk; current client clustering may be enough for V1.
- Affected repositories: aevo-go, aevo-core-api, aevo-edge-gateway,
  aevo-infrastructure, approved data owner.
- Existing code reused: TanStack Query cache, MapLibre clustering, PostGIS
  indexes, request IDs, existing cache/provider policy.
- Files/modules likely affected: separate overlay/search cache keys, ETags,
  projection versions, rebuild/invalidation/rollback, load-test fixtures,
  optional tile generator/endpoint.
- Database change: only evidence-backed projection/index/tile metadata under
  approved owner.
- API change: cache headers/ETags and optional versioned vector tile endpoint;
  list/search remains mandatory.
- Dependencies: MAP-003, MAP-004, MAP-010, load-test baseline, license review.
- Implementation steps: measure warm/cold; tune query/projection; add Edge
  cache; implement targeted invalidation; test provider terms; decide tiles
  from payload/latency evidence.
- Tests: p50/p95/p99 by read path, rows scanned, connections, cache hit/miss,
  stale projection, rebuild/rollback, invalidation, cluster selection,
  attribution, overlay/list parity, and live-capability separation.
- Acceptance criteria: target SLOs are agreed and met; no stale capability
  claim survives invalidation policy; vector tiles, if added, contain only
  approved static Place fields.
- Risks: stale/removed data, cache poisoning, provider terms, operational
  complexity.
- Rollback: disable cache/tile path and use bounded JSON discovery with
  version checks; retain canonical data.
- Complexity: L or XL if vector tiles are required

### MAP-012 — Staged production rollout and operations

- Goal: Roll out by geography/feature flag with shadow reads, observability,
  support runbooks, and safe retirement of compatibility paths.
- Why: Map/Place affects customer discovery, business claims, Trace, Feed,
  saves, booking, licensing, and privacy simultaneously.
- Affected repositories: aevo-go, aevo-core-api, aevo-edge-gateway,
  aevo-contracts, aevo-admin, worker, infrastructure, and approved data owner.
- Existing code reused: existing local/dev health checks, app-scoped sessions,
  audit/observability, feature flags, current Map fallback and admin empty
  states.
- Files/modules likely affected: rollout flags, dashboards/alerts, runbooks,
  migration notes, compatibility sunset checks, release configuration.
- Database change: only approved forward/rollback migrations; no destructive
  cleanup until reference inventory is zero and approval is recorded.
- API change: feature-version headers/flags, readiness/health signals, sunset
  warnings, and support diagnostics.
- Dependencies: MAP-001 through MAP-011, security/license/ops sign-off.
- Implementation steps: shadow compare; launch limited geography; verify
  metrics/audit/attribution; expand; freeze old writes; migrate references;
  monitor; retire compatibility only after evidence.
- Tests: full integration, tenant-security, accessibility, load, source
  outage, Admin rollback, merge/booking/Feed/Trace regression, disaster
  recovery tabletop.
- Acceptance criteria: agreed SLOs, security/privacy/license approvals,
  dashboards/runbooks, rollback rehearsal, no unexplained result drift,
  owners on call.
- Risks: cross-module regression, stale data, operational blind spot,
  migration rollback failure.
- Rollback: disable feature flag, restore last known-valid projection/API,
  replay queued changes after incident review; do not reset shared data.
- Complexity: XL

## FINAL ARCHITECTURE REVIEW OUTPUT (ARCHITECTURE REVIEW REVISION)

### 1. Decisions changed

- Place is geometry-capable and hierarchy-safe, not point-only.
- MAP-000 now records explicit Place/Business/Organization/Branch/Store/Venue/
  BookableResource semantics and cardinality.
- Map overlay is separate from ranked Search/Nearby and Detail.
- Geocoding is a governed temporary-result provider boundary; it is not Place
  canonicalization and public Nominatim is not a production SLA.
- Address semantics are Thailand-first and localization-aware.
- Static capability is separate from live operational availability.
- Canonical state and compact public projection have independent versions,
  freshness, rebuild, invalidation, rollback, and failure semantics.
- Field-level provenance replaces one global source-priority rule.
- MAP-010 uses shared redirect resolution with retired-ID write rejection.
- Business and community work can progress in parallel; Admin read-only shell
  can start before privileged mutations.

### 2. Revised MAP-000 questions

MAP-000 must answer the 16 questions in section 18 and
docs/map-system/19-open-questions.md, including ownership, route conventions,
geometry/cardinality, overlay budgets, geocoder terms, Thailand address
fields, capability freshness, field authorities, and resolver safety.

### 3. Revised canonical Place model

~~~text
Place
  canonicalGeometry
  displayPoint / labelPoint / centroid / boundingGeometry
  parentPlaceId and typed child/sub-place relations
  localized/alternate names and Thailand-first semantic address
  field-level provenance and revision history
  source links, claims, moderation, and redirect state
  compact public projection
~~~

Place is the geographic identity. A Place may contain many Businesses/Branches.
Each public Branch has one primary Place and optional typed secondary links.
Venue and BookableResource remain booking-domain identities.

### 4. Revised API boundaries

Use the current Core route conventions for these conceptual boundaries:

~~~text
Map overlay -> bounded lightweight marker/cluster response
Search      -> ranked/filterable/paginated Place summaries
Nearby      -> bounded point/radius ranked summaries
Detail      -> canonical geometry/address plus capability links
Geocoder    -> temporary address/geographic result only
Resolver    -> shared read resolution and retired-ID write rejection
~~~

Map overlay can later move from bounded JSON to MVT without changing
Search/Detail/Feed/Trace/Save identity.

### 5. Revised dependency graph

~~~text
MAP-000
  -> MAP-001 -> MAP-002 -> MAP-003 -> MAP-004
                         |       |       |
                         |       |       +-> MAP-005
                         |       +---------> MAP-006 -> MAP-007
                         +------------------> MAP-008
                         +------------------> MAP-009 read-only
MAP-005 + MAP-006 + MAP-007 + MAP-008 -> MAP-009 privileged mutations
MAP-002 + MAP-005 + MAP-009 -> MAP-010
MAP-003 + MAP-004 + MAP-010 -> MAP-011 -> MAP-012
~~~

MAP-008 is not blocked by MAP-007. MAP-009 read-only review shells can start
with stable Admin contracts; privileged actions remain individually gated.

### 6. Revised V1 scope

Include canonical identity, point-capable/polygon-safe geometry, compatibility
mapping, public projection split, bounded overlay, Search/Nearby/Detail,
MapLibre, provider-neutral basemap, basic geocoder adapter boundary, one
approved external source, business link, basic verification, community
submission/edit, Admin review, provenance/audit, and basic conflation/redirect.

Defer indoor maps, global self-hosted tiles, dedicated search, ML search/
conflation/ranking, weak-signal auto-merges, live booking data in overlays,
full-world ingestion, and advanced vector-tile infrastructure unless measured.

### 7. Remaining blockers

- external migration application owner and target-environment schema/route
  smoke test;
- approved geocoder/tile/source providers, attribution, commercial terms,
  privacy, quotas, and SLA;
- measured overlay/Search/Nearby payload and latency budgets;
- field-level authority matrix and the first source territory/retention policy;
- capability freshness sign-off with the booking/queue/POS owners;
- Feed/Trace/Save/booking legacy-ID inventory and resolver integration;
- labelled conflation corpus, load targets, dashboards, and on-call ownership;
- business/branch domain owners for claim/link commands and community
  moderation policy.

The canonical owner, Core migration boundary, route family, cardinality,
geometry/address contract, static/live capability split, and resolver safety
rules are no longer blockers; they are recorded in ADR-000 and implemented
as the current local boundary.

### 8. Exact approval gate to start MAP-000

The following was the historical approval gate for the discovery phase. The
user's explicit implementation instruction and ADR-000 satisfy the ownership,
route, model, API, and dependency decisions, so MAP-000 is now accepted.
Downstream production/cutover work still requires confirmation that:

1. the canonical Place owner and Core migration owner are named;
2. the actual public route/origin and Hub transition status are recorded;
3. the cardinality/geometry/address decisions are accepted;
4. the geocoder/tile/source licensing and privacy review has an owner and
   explicit no-go conditions;
5. Map overlay/Search/Nearby/Detail budgets and capability freshness are
   accepted;
6. redirect resolver, retired-ID writes, split, rollback, and audit rules are
   accepted;
7. the MAP-001-to-MAP-012 dependency graph is accepted;
8. external migration application, source import, provider selection, and
   privileged write commands are separately authorized only after their own
   evidence and rollback gates pass.

## Implementation execution record (2026-09-24)

The user explicitly approved implementation after the final architecture
review. The first implementation batch is now present in the named owners:

- MAP-000/MAP-001: accepted ADR, versioned Place transport contracts, OpenAPI,
  Core DTOs, Go Zod schemas, Thai/English address and geometry fixtures.
- MAP-002: additive Core migrations `0011_place_projection.sql` and
  `0012_place_workflows.sql`, explicit compatibility mapper, public projection
  read store, stale/last-known-valid projection handling, and RLS boundary.
- MAP-003: Core public `/api/v1/public/places/{map,search,nearby,:placeId}`
  handlers, bounded parsers, HMAC-bound keyset cursors, and projection-gated
  failure semantics. These handlers are live in code but return an explicit
  unavailable response until the projection schema/data is available.
- MAP-004: provider-neutral Go basemap/geocoder policy, visible attribution,
  production Overpass disablement, and an opt-in `VITE_PLACE_API_MODE` adapter.
- MAP-009: Core/Admin registry list/detail and guarded `POST`/`PUT`/`DELETE`
  boundary with CSRF, `map.places.manage`, optimistic revision, audit, public
  projection rebuild/disable, and Admin editor at `/map/places/:placeId`.
  DELETE is a soft delete; immutable revision history is retained.
- MAP-010 foundation: pure shared redirect resolver with loop/hop protection
  and workflow/redirect schema; downstream surface integration remains gated.

Validation and remaining work are tracked in
`docs/map-system/20-implementation-status.md`. The next safe gate is to
replay approved compatibility/projection fixtures against the Core migration
set, then run a deployment-owned schema/route smoke test before setting
`VITE_PLACE_API_MODE=canonical`.

## Implementation continuation record (2026-09-25)

- MAP-005 foundation: added the shared source contract and deterministic
  Point/Polygon/MultiPolygon normalizer in `aevo-contracts`; the background
  worker now exposes an authenticated, disabled-by-default dry-run endpoint
  that returns a replay fingerprint and disappeared source IDs. It never
  selects a provider, assigns canonical IDs, writes Cloud SQL, or publishes a
  projection.
- MAP-006–008 foundation: added typed relationship, claim, community
  submission, evidence, and review-decision contracts plus Core validation that
  rejects ambiguous targets, unsafe fields, live booking/queue/inventory state,
  invalid evidence references, and missing idempotency/reason fields.
- MAP-009 continuation: added the Core/Admin read-only workflow queue for
  claims, submissions, and relationships at `/map/workflows`; review actions
  remain disabled until the migration, evidence, permissions, and audit gates
  are explicitly approved.
- MAP-002/MAP-010 local replay gate: added a labelled
  `PlaceProjectionReplayValidator` that replays compact public summaries,
  rejects duplicate or invalid canonical IDs, checks deterministic JSON,
  enforces a UTF-8 payload budget, and rejects reserved live-state fields.
  It is pure local validation and does not apply migrations or publish rows.
- MAP-010 shared reference boundary: added `PlaceReferenceResolver` for
  Map, Search, Feed, Trace, Save, Business, Booking, URL, and Analytics
  surfaces. It accepts only explicit legacy mappings, applies the bounded
  redirect resolver, preserves redirect reasons/version, and rejects unsafe
  or retired writes. Downstream handlers are intentionally not wired until
  the deployment-owned mapping/RLS/route smoke gate passes.
- Verification: Core full suite was 96 tests at the previous continuation
  checkpoint, including the labelled
  replay and cross-surface resolver cases.

## Implementation continuation record (2026-09-25, test mutation batch)

- MAP-009 mutation boundary: added Core admin Place detail, create, edit, and
  soft-delete operations. Inputs are bounded and validated; writes require
  `map.places.manage`, an app session plus CSRF token, the current revision,
  and an administrative reason. Each mutation writes an immutable revision,
  audit before/after state, and either rebuilds or disables the public
  projection in the same transaction.
- MAP-009 RLS migration: added `0021_place_admin_mutation_rls.sql` so the
  explicitly privileged `SUPER_ADMIN` role is consistent with the existing
  `PLATFORM_OWNER`/`PLATFORM_ADMIN` write policy. It was applied only to the
  local development database from `aevo-core-api/.env`; no production or
  external target was changed.
- MAP-009 Admin UI: added the server-only detail/editor route, narrow field
  editing, revision-aware soft-delete action, and permission-gated links from
  the registry page. Browser code never receives a database credential.
- Verification: `aevo-core-api` full suite is now 102 tests; the opt-in
  `PlaceProjectionWriteIntegrationTests` passed against the local database for
  create -> edit -> failed last-known-valid fallback -> rebuild -> soft-delete,
  including detail read, audit rows, and immutable revision count. At that
  checkpoint, the local migration ledger reported 23 applied rows; RLS and
  store-binding checks pass.
- Contract/Admin verification: `aevo-contracts` OpenAPI/typecheck/Bun checks
  pass with 36 tests; `aevo-admin` React Router type generation, TypeScript
  check, and production build pass. The next gate is non-local route smoke
  and deployment migration ownership approval.

## Implementation continuation record (2026-09-25, legacy compatibility purge batch)

- MAP-009 legacy maintenance boundary: added `DELETE
  /api/v1/admin/map/legacy-mappings` and `DELETE
  /api/v1/admin/map/source-links/:sourceLinkId`. The first deletes one exact
  `(namespace, externalId, sourceVersion)` mapping; the second deletes one exact
  source-link UUID. Both require `map.places.manage`, an app session, CSRF, a
  reason, and the development/test or explicitly enabled maintenance guard.
- Linked compatibility rows are rejected unless the caller explicitly sends
  `allowLinked=true`; both operations capture before/after audit state. The
  endpoints do not delete canonical Place rows, immutable revisions, audit
  history, or Store/TraceDee source-of-truth records.
- Verification: Core full suite is now 105 tests; the opt-in local integration
  suite passes 2/2 for canonical mutation lifecycle plus scoped legacy mapping
  and source-link hard-delete with two audit rows. Contracts/OpenAPI checks pass
  with 36 tests; Admin typecheck/build pass; the current local migration ledger
  reports 24 applied rows, including the catalog/compatibility retirement
  migration. Route smoke returns health 200 and unauthenticated 401
  for both legacy-delete endpoints.

## Implementation continuation record (2026-09-25, public detail and Edge route batch)

- MAP-003 projection compatibility: public Detail now reads the same compact
  summary projection emitted by the guarded Admin mutation path. Optional
  detail-only fields are returned as `null` or empty arrays when the projection
  does not contain them; malformed projection fields still fail closed with
  `PLACE_PROJECTION_UNAVAILABLE`.
- MAP-003/MAP-004 Edge boundary: added gateway contract coverage for the public
  Map, Search, Nearby, and Detail paths. The Edge preserves the versioned path
  and query shape while Core remains the owner of authentication, authorization,
  cursor validation, and projection reads.
- Verification: Core remains 105/105 with the local mutation integration suite
  at 2/2, including public Detail over a freshly created summary projection.
  `aevo-edge-gateway` typecheck, 7 tests, and preview dry-run build pass. This
  is local/mocked-upstream evidence; non-local Core/Edge smoke with real
  gateway signing, cursor secret, and deployed projection rows remains gated.

## Implementation continuation record (2026-09-25, projection reader HTTP smoke batch)

- MAP-003 runtime fix: closed Npgsql projection readers before committing their
  read transactions. Without this, direct service tests passed but public HTTP
  Map/Search/Nearby/Detail requests could raise `NpgsqlOperationInProgressException`
  and return 500.
- Regression coverage: the local DB integration now exercises all four public
  read shapes after creating a fixture; the Core HTTP smoke returns Map/Search/
  Nearby 200, unknown Detail 404, and request IDs on the responses. A small
  strict-analyzer cleanup in the existing Hub configuration helper also keeps
  the Core build warning-free.

The next safe implementation gate is the deployment-owned labelled
source/projection replay and real Core/Edge smoke test after migration
application.

## Implementation continuation record (2026-09-26, approved projection replay apply batch)

- MAP-002/MAP-005 operational boundary: added migration
  `0030_place_projection_replay_runs.sql` with replay fingerprint/reason
  metadata so a deployment retry can be idempotent by `runId`.
- Added `POST /internal/place/projections/replay`. It is separately token
  gated, disabled outside development/test/local unless explicitly enabled,
  validates the labelled compact summary batch, requires an active
  `SUPER_ADMIN`/`PLATFORM_OWNER`/`PLATFORM_ADMIN` actor, and writes only
  projections for existing visible/limited canonical Place rows whose source
  revision matches the replay. It does not create/delete canonical rows or
  choose a source/provider.
- Successful runs write the projection-run ledger and an immutable audit row;
  retrying the same run id and deterministic fingerprint returns
  `already_applied`. Rejected validation, missing Place, non-public status,
  and source-revision mismatch cases publish zero rows.
- Verification: Core suite is 106/106; the opt-in local DB integration suite
  is 2/2 and now covers replay, idempotent retry, run ledger, replay audit,
  public reads, edit/fallback/rebuild, soft delete, and legacy purge. Local
  migration dry-run/verify reports 33 applied migration rows. HTTP smoke
  proves missing/wrong replay tokens return 401, an invalid envelope returns
  400, and a malformed fixture is rejected with 422 before any DB write.

The next safe gate remains deployment-owned migration/replay and real Edge to
Core smoke with target-environment signing, cursor, replay-token, and
projection-row material. No non-local database or provider has been changed.

## Implementation continuation record (2026-09-26, canonical Go map path and local HMAC smoke)

- MAP-004 canonical client path: Aevo Go now queries Core's dedicated
  `/api/v1/public/places/map` overlay for live canonical markers while the
  bounded Search response remains the list source. Overlay-only marker
  selection resolves through the new `/places/:placeId` client route.
- Canonical mode now blocks direct OSM query/merge and does not expose a live
  booking action unless a public booking route or explicit venue mapping is
  present. UI category labels are normalized to canonical category IDs for
  both Search and Map requests.
- Verification: Aevo Go typecheck, 120 tests, and production build pass.
  Local Core direct unsigned Place requests return 403 under the required
  gateway signature setting; the local Edge forwards signed Map/Search/Nearby
  requests as 200 with propagated request IDs and unknown Detail as 404.
- The default remains `VITE_PLACE_API_MODE=legacy`; no target/non-local
  migration, projection replay, source provider, or production cutover was
  performed. The remaining gates are target-environment owner approval and
  deployed projection/data parity.

## Implementation continuation record (2026-09-26, DB-backed resolver and Feed reference batch)

- MAP-010 runtime integration: Core now loads explicit legacy mappings and a
  bounded active redirect graph in one transaction, then delegates resolution
  to the shared `PlaceReferenceResolver`. Public canonical Detail uses this
  boundary for merged/retired URL reads and preserves redirect reason/hops.
- Feed transition contract: `FeedPlaceItem` now carries an optional versioned
  `placeReference` with namespace, external ID, source version, resolution
  status, canonical target, redirect metadata, and resolver version. Core Feed
  hydration uses the DB-backed resolver only behind the server-side
  `AEVO_PLACE_REFERENCE_RESOLUTION=true` gate; legacy Feed item IDs remain
  unchanged during the transition.
- The read path explicitly closes the mapping reader before issuing the
  redirect query on the same PostgreSQL connection. This prevents the
  `NpgsqlOperationInProgressException` regression that can be missed by pure
  unit tests.
- Verification: Core full tests 128/128; focused local DB reference/mutation
  tests 3/3; Feed source integration 3/3; migration ledger 33 applied rows
  verified; Go typecheck/150 tests/build pass; Edge typecheck/7 tests/preview
  build pass; Admin typecheck/build pass; shared contracts 36 tests pass.
- The default remains legacy-safe. Trace/Save/booking owner migrations,
  target-environment migration/RLS/route smoke, source/provider approval, and
  production canonical cutover remain separate gates.

## Implementation continuation record (2026-09-26, Go downstream identity boundary)

- Aevo Go now consumes an explicit resolved/redirected Feed
  `placeReference.canonicalPlaceId` as a separate canonical identity. It never
  infers a Place UUID from Feed item IDs, slugs, names, coordinates, or provider
  IDs. Canonical mode uses the UUID for Place detail and Map selection; legacy
  mode retains the existing Store route.
- TraceDee client reads accept the same optional versioned reference. Trace stop
  Map links use the canonical UUID only in canonical mode, while existing
  TraceDee source IDs remain the owner-bound mutation IDs for remix and
  contribution calls.
- Map deep links preserve an explicit selection through the initial bounded
  search and match both canonical IDs and legacy slugs in list/MapLibre state.
- Cross-domain write guard: Feed no longer promotes a place slug to
  `venueSlug`; canonical mode refuses the legacy slug-based customer Favorite
  write and only exposes booking entry points with an explicit venue mapping.
- Verification: Aevo Go typecheck, full 150-test suite, and production build
  pass. Server-side Trace/Save/booking owner migrations and target-environment
  cutover gates remain unchanged.
