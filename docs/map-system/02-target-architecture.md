# Target Map and Place architecture

Status: accepted for implementation; production cutover and privileged writes
remain gated by the MAP-000 ADR and implementation status record.

## Design principle

The product should expose one coherent map experience while keeping five
different responsibilities independent:

~~~text
BASE MAP
  visual tiles, style, attribution, zoom/interaction

PLACE REGISTRY
  Aevocado-owned stable Place identity, lifecycle, geometry, source links

BUSINESS LAYER
  Organization, Business/Store, Branch, Venue, booking and commerce capability

COMMUNITY DATA
  submissions, edits, reports, evidence, moderation, audit, appeals

DISCOVERY
  bounded spatial/text query, filters, ranking, facets, clustering, projections
~~~

No layer should infer another layer's authority. In particular:

- basemap tiles must not contain live booking state;
- external IDs must not become Aevo primary IDs;
- a Store or business claim must not rewrite a map tile;
- a user submission must create a reviewable change, not mutate a canonical
  Place directly;
- discovery should read stable projections, not join every transactional table
  on every map pan.

## Logical request path

~~~text
Aevo Go / Feed / Trace / Store detail
                 |
                 v
       Edge ingress (existing)
                 |
                 v
       Core API public Place facade
       auth -> scope -> policy -> rate limit
                 |
       +---------+----------+
       |                    |
       v                    v
  Place discovery      Place detail/capabilities
  read projection      business capability projection
       |                    |
       +---------+----------+
                 v
       canonical Place data owner
                 ^
                 |
   ingestion / conflation / claims / moderation workers
                 ^
                 |
      Admin command boundary
      (aevo-admin server BFF)
~~~

The public facade can initially be an adapter over the current Hub data layer,
but the adapter must return a versioned canonical Place contract and must not
expose the adapter as a second public gateway.

## Authority matrix

| Data | System of record | Public read model | Write path |
| --- | --- | --- | --- |
| Place identity, lifecycle, geometry | Canonical Place service/data owner after MAP-000 | PlaceSummary/PlaceDetail | Admin command, approved ingestion, approved community moderation |
| External source identity and provenance | Place ingestion subsystem | source badges/attribution when needed | Source adapter/ingestion job |
| Organization/Store/Branch | Existing business domain owner | business summary projection | Business domain APIs |
| Verification and claim status | Verification domain | verification projection | authenticated claim flow + Admin decision |
| Booking/live availability | Booking/venue service | bounded capability projection/detail | Booking service |
| Community submission/edit | Contribution/moderation domain | status for author/moderators only; approved change in Place read model | Customer API command + Admin review |
| Basemap tiles/style | Tile/style provider | MapLibre source/style | provider configuration/ops |
| Feed/Trace references | Feed/Trace domain using canonical Place ID | Feed/Trace contracts | Feed/Trace domain |

## Public read models

The public API should expose separate, composable shapes:

- PlaceSummary: stable ID, slug, display names, category, point,
  visibility, source/verification badges, lightweight business summary, and
  capability flags.
- PlaceDetail: summary plus address, media, hours summary, source
  attribution, verification explanation, and links.
- PlaceCapabilitySummary: isBookable, isAevoPlayPartner,
  availabilityFreshAt, bookingRoute, and other bounded capability facts.
- DiscoveryPage: items, facets, bounds applied, approximate count/truncation,
  next cursor, query version, and attribution requirements.

Live booking slots, pricing, inventory, and customer-specific eligibility
remain separate reads. The Map response may include a stale capability flag
and a link to the capability service, but must not claim a live slot is
available unless the booking boundary says so.

## Command boundaries

### Customer commands

- submit a new Place candidate;
- propose an edit;
- report a duplicate, closure, or unsafe content;
- claim a business relationship;
- request verification evidence review.

The customer command handler validates the actor/session, rate limits, stores
the request, and returns a submission ID. It never updates the canonical Place
row directly.

### Business commands

- link an owned Branch/Venue to an existing Place;
- request a new Place for a verified business location;
- update business-owned fields;
- withdraw a claim or report a closure.

Business permission comes from the existing organization/store assignment
boundary. A business owner can propose or update fields they own; they cannot
overwrite community/external provenance or bypass moderation.

### Admin commands

- approve/reject/merge/split/restore;
- accept/reject a source update;
- accept/revoke claim or verification;
- publish/unpublish a Place;
- resolve a community submission;
- rollback an erroneous conflation or projection.

Every dangerous command requires permission, CSRF protection at the browser
BFF, an audit reason, actor, before/after snapshot or diff, and an idempotency
key where retrying could create a duplicate action.

## Initial target topology

V1 should reuse current PostGIS and bounded relational reads. It should not add
a dedicated search engine, streaming tile database, or second API gateway.

The target evolution is:

1. canonical Place read contract over a server adapter;
2. normalized Place read projection with PostGIS geography and stable keyset
   pagination;
3. source-link/provenance and conflation workflow;
4. claim/verification and community moderation;
5. cache and vector-tile optimization only when measured load justifies it.

## Non-negotiable invariants

1. Every externally visible Place has an Aevo UUID.
2. A source record is linked through a separate source-link row with provider,
   source ID, version/snapshot, license, and observed time.
3. A Place merge creates a redirect/alias; references never silently disappear.
4. Verified fields cannot be overwritten by an untrusted import.
5. Closed/deleted Places have a lifecycle state and an audit trail.
6. Query bounds are validated server-side and are always bounded.
7. Public projections exclude private contact data and precise personal
   location data.
8. Map UI can degrade to an accessible list without WebGL or tile availability.
9. Feed, Trace, Save, Search, Map, and booking links use the same canonical
   Place ID once the migration is approved.
10. The browser never selects tenant scope, source authority, or Admin role.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

### Geometry-first Place contract

The canonical Place must not be point-only. Its conceptual geometry envelope is:

~~~text
Place
  canonicalGeometry: point | polygon | multipolygon | future line/collection
  displayPoint: marker/label point
  labelPoint: optional explicit label anchor
  centroid: derived analytic/display fallback
  boundingGeometry: optional extent for viewport/density calculations
  parentPlaceId: optional containing Place
  child/sub-place relations: explicit typed relations
~~~

V1 may publish only a point display marker, but the schema and contracts must
retain the canonical geometry type and geometry provenance. The geometry used
for each operation is explicit:

| Operation | Geometry |
| --- | --- |
| Map marker | displayPoint, then labelPoint, then safe derived centroid |
| Distance ranking | displayPoint or approved routing/entrance point, never an arbitrary polygon vertex |
| Viewport intersection | canonicalGeometry or boundingGeometry, depending on query mode |
| Text search | canonical public names/address/category, independent of geometry type |
| Display/detail | canonicalGeometry summary plus displayPoint/labelPoint as permitted |

Indoor mapping, floor plans, and room-level geometry are deferred.

### Domain cardinality decision for MAP-000

| Relationship | Cardinality/meaning |
| --- | --- |
| Place -> parent Place | zero or one direct parent in V1; future relation table can support typed multi-parent history |
| Place -> child/sub-place | zero or many typed children |
| Place -> Business | zero or many; a mall/market/venue can contain multiple businesses |
| Business -> Branch | one or many |
| Branch -> primary Place | exactly zero or one during onboarding; exactly one before a branch is publicly location-enabled |
| Branch -> Place links | one or many typed links, with one primary |
| Place -> Venue | zero or many through explicit operated_at/located_at relation |
| Venue -> Place | zero or one primary geographic link |
| Venue -> BookableResource | zero or many booking resources |
| Place -> BookableResource | never direct; resolve through Venue/business capability |

Place is the cross-product geographic ID. Organization, Business, Branch,
Store, Venue, and BookableResource IDs remain operational/domain IDs.

### Separate public read paths

The conceptual API boundary is:

~~~text
GET /places/map
  bounded viewport, lightweight marker/cluster data, cacheable

GET /places/search
GET /places/nearby
  ranked/filterable/paginated Place summaries

GET /places/{placeId}
  canonical detail and links to capability reads
~~~

Exact paths must follow current Core conventions. The map overlay must return
only fields that can be moved to a later versioned MVT/vector-tile source
without changing Search or Detail identity. It has independent density,
truncation, zoom, clustering, and payload budgets.

### Canonical state versus projection

The canonical Place state owns geometry, lifecycle, revisions, provenance,
claims, source links, moderation, and redirects. The public discovery
projection is a compact, safe, rebuildable read model with:

- projectionVersion;
- sourceRevision;
- generatedAt/freshness;
- invalidation key;
- rebuild status;
- rollback/last-known-valid version.

The projection is never domain authority. Map/Search hot paths must not join
revisions, raw provenance, claims, raw source records, moderation records, and
transactional business tables on every request.
