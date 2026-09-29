# Map discovery and PostGIS design

Status: bounded projection query foundation implemented; production schema
application and performance sign-off remain gated

## Current spatial foundation

The workspace already has the right class of database for V1:

- PostGIS is enabled in the open-source map migration;
- customer_store_profiles has a geography(point, 4326) location;
- a trigger syncs latitude/longitude to location;
- a partial GiST index covers public, non-null customer profiles;
- public_store_discovery_in_view applies a bounded envelope and filters;
- the Go client sends validated bounds, zoom, and filters.

Evidence:

- aevo-hub/supabase/migrations/20260921075000_open_source_map_spatial_discovery.sql
- aevo-hub/packages/db/src/customer-discovery.ts
- aevo-go/src/features/map/contracts.ts
- aevo-go/src/features/map/use-map-discovery.ts

## Current limitations

1. The RPC queries customer_store_profiles, not a canonical Place projection.
2. The public profile table is Store-scoped and opt-in.
3. The RPC uses a bounding-envelope operator; exact distance/nearby semantics
   are not a separate contract.
4. parsePublicDiscoveryBounds rejects west >= east, so antimeridian-crossing
   bounds are not supported.
5. Cursor values are numeric offsets; concurrent changes can shift pages.
6. The no-bbox path scans a bounded number of profiles and filters in memory.
7. The current result contract mixes Store/venue fields into discovery rather
   than exposing a stable Place plus capability relationship.
8. The current tests focus on bounds parsing and do not demonstrate DB plans,
   RLS, exact inside/outside behavior, or high-density load.

These are design gates, not instructions to alter the existing migration.

## Target public discovery contract

Request:

~~~text
GET /api/v1/public/places
  bbox=west,south,east,north
  zoom
  q
  area
  categoryIds
  priceLevels
  reservable
  partySize
  ratingMin
  sort
  cursor
  limit
~~~

The final route name must be reconciled with the currently documented Go
routes before implementation. The important boundary is a canonical,
versioned Place read contract, not the literal path.

Response should include:

- items of PlaceSummary;
- nextCursor as a signed/keyset cursor;
- facets scoped to the same query;
- boundsApplied and normalized query;
- totalApproximate and truncated;
- generatedAt/projectionVersion;
- source attribution requirements;
- stale/offline indicator only when data is explicitly stale.

Server rules:

- require a bounded bbox for viewport queries;
- cap maximum longitude/latitude span by zoom/policy;
- cap result count and payload bytes;
- normalize category/filter values against an allowlist;
- reject malformed/NaN/infinite coordinates;
- apply public visibility and lifecycle status server-side;
- do not accept SQL, table names, tenant IDs, or source authority from clients;
- return a deterministic continuation cursor.

## Spatial predicates

Use geography for WGS84 public distance semantics:

- viewport: bounding rectangle/polygon predicate on indexed geography;
- nearby: point plus ST_DWithin with a maximum radius;
- ordering by distance only when requested and bounded;
- antimeridian: split into two longitude windows or use a normalized
  geography/polygon strategy;
- geometry validity: reject or repair only with an audited normalization rule.

For dense viewports, the spatial predicate should be applied before expensive
text/facet joins. Any proposed query must be checked with EXPLAIN ANALYZE
against representative Bangkok and Chiang Mai fixtures.

## Projection design

The discovery query should read a small public projection containing:

- canonical Place ID and slug;
- point/location;
- normalized names/search keys;
- category/area;
- public lifecycle/visibility;
- verification badge state;
- compact business/capability summary;
- rating/count fields only from their authoritative domain;
- projection version and updated time.

It should not join booking rows, raw source payloads, user submissions, or
private organization records on every map request.

## Index strategy to validate

The future owner should validate, not blindly create:

- partial GiST on public visible Place location;
- btree on status/category/area where selectivity supports it;
- keyset ordering index for the chosen deterministic sort;
- text search index for the supported name/area query;
- relationship indexes for business/capability joins;
- source-link lookup by provider/external ID.

Index definitions belong in the approved migration owner only after
benchmark evidence and RLS/permission review.

## Pagination and ranking

For exact deterministic paging, use a signed cursor containing:

- query fingerprint;
- projection/version or snapshot boundary;
- sort mode;
- last sort tuple;
- expiry and key version.

The cursor must not trust a client-selected offset or actor scope. For
relevance, define a stable tie-breaker such as canonical Place ID. For
nearby, include distance and Place ID. For viewport default, use the
approved order plus Place ID.

## Query modes

| Mode | Contract | Candidate source |
| --- | --- | --- |
| Viewport | bbox + filters + cursor | Place discovery projection |
| Nearby | user-provided point + bounded radius | same projection, ST_DWithin |
| Search this area | text + committed bbox | same projection |
| Text discovery | query + optional area/category | bounded public text query |
| Detail | Place ID/slug | Place detail projection |
| Capability | Place/branch/venue ID | business/booking boundary |

“Near me” must be opt-in device location and must not be stored by default.

## RLS and API boundary

The browser should not call Supabase or a service-role function directly.
Public reads go through the approved API boundary, which applies:

1. app/session context;
2. public visibility policy;
3. rate/abuse limits;
4. query bounds and allowlists;
5. projection field selection;
6. request ID and observability.

If an internal RPC remains the execution mechanism, its grants, invoker
semantics, and exposed schema must be reviewed against the current Supabase
security model. Do not assume a private function is safe merely because the
client cannot see its name.

## Performance exit criteria

Before declaring discovery ready:

- test p50/p95/p99 for target viewport sizes;
- verify GiST/index use on representative data;
- measure rows scanned and result/payload sizes;
- test dense Bangkok and Chiang Mai views;
- test zoomed-out truncation;
- test search-this-area and nearby;
- test concurrent source/projection updates;
- test timeout/cancellation and stale response handling;
- record Postgres connection and cache behavior.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

### Separate spatial read paths

The current viewport RPC is a useful compatibility input, but the target
contract is split:

~~~text
GET /places/map
  bounded viewport, lightweight displayPoint/labelPoint markers,
  cluster metadata, density/truncation, projectionVersion

GET /places/search
GET /places/nearby
  richer summaries, ranking, filtering, facets, keyset pagination

GET /places/{placeId}
  canonical geometry summary and detail hydration
~~~

Exact route names follow Core conventions. A map response must not perform
expensive detail/provenance/claim/business joins. It must remain portable to a
future MVT/vector-tile source without changing canonical Place IDs.

### Geometry predicates

Use canonicalGeometry or boundingGeometry for viewport intersection. Use an
approved display/entrance point for distance ranking and explicitly record the
method. A polygon Place can be returned by viewport intersection even when its
marker uses a display point. Parent/child containment is a relation filter,
not an identity merge.

### Overlay budget and consistency

The map endpoint needs a density limit, payload-byte budget, zoom-dependent
truncation, and deterministic cluster behavior. It should return a
truncation/density signal and Search this area affordance rather than a
misleading incomplete ranked list. Map/list consistency tests compare
canonical IDs and visible public status, not identical ordering.

### Query-platform boundary

Admin registry/search/report queries use the versioned typed Query AST and
model metadata. Public Map/Search may use a purpose-specific bounded spatial
contract, but it must retain the same invariants: server-resolved principal
and scope, field/operator allowlists, parameterized compilation, query
fingerprints, RLS, quotas, idempotency, and audit for mutations. No raw SQL or
client-selected table/relation is accepted.
