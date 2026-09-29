# Map system current state

Audit date: 2026-09-24  
Phase: discovery and architecture only  
Change policy for this audit: no production code, migration, dependency, runtime, or data change

## Executive finding

Aevo Go already has a credible Map UI and a bounded public-store discovery
prototype, but Aevo does not yet have one canonical Place domain. The current
workspace contains three place-like representations with different authorities:

1. public.customer_store_profiles is an opt-in public projection of an Aevo
   Store. It has latitude/longitude, a PostGIS geography column, and a
   viewport RPC.
2. public.tracedee_places is a TraceDee-owned place table with its own UUID,
   moderation state, geometry, and Store linkage.
3. aevo-go can merge first-party customer results with client-fetched OSM
   results. OSM records are currently enrichment records, not Aevo-owned
   Places.

This is enough to demonstrate the experience, but not enough to safely support
claims, verification, external ingestion, community edits, stable references
from Feed/Trace/Booking, or an independently scalable Place discovery service.

The first architectural decision is therefore ownership, not a new map
renderer. A future canonical Place must be Aevo-owned, stable, auditable, and
separate from:

- the visual basemap and its tile provider;
- an organization, Store, Branch, Venue, or bookable resource;
- external source identifiers;
- user submissions and moderation cases;
- volatile capability data such as live availability.

## Evidence inventory

| Area | What exists | Evidence |
| --- | --- | --- |
| Customer Map UI | MapLibre/react-map-gl renderer, clustering, URL-owned filters, committed viewport search, list fallback, mobile sheet states | aevo-go/src/features/map/map-page.tsx; aevo-go/src/features/map/maplibre-map.tsx; aevo-go/src/features/map/use-map-discovery.ts |
| Map contract | Typed bounds, filters, map summaries, GeoJSON conversion, trace overlay types | aevo-go/src/features/map/contracts.ts |
| Public discovery projection | Opt-in customer_store_profiles with coordinates, categories, price, rating, and public details | aevo-hub/supabase/migrations/20260919095513_customer_public_store_profiles.sql; aevo-hub/supabase/migrations/20260919131420_customer_public_store_details.sql |
| Spatial query | PostGIS geography point, partial GiST index, bounded discovery RPC | aevo-hub/supabase/migrations/20260921075000_open_source_map_spatial_discovery.sql |
| Discovery data access | RPC adapter, bounds validation, facet mapping, cursor-as-offset behavior, and an unbounded scan fallback | aevo-hub/packages/db/src/customer-discovery.ts |
| TraceDee place system | tracedee_places, Trace/stop/post references, moderation state, spatial index, place picker | aevo-hub/supabase/migrations/20260921090639_tracedee_product_loop_foundation.sql; aevo-hub/packages/db/src/tracedee.ts |
| Business and booking | Organization/Store foundation, venues, bookable_resources, hours, bookings; no canonical Place link | aevo-hub/supabase/migrations/20260916083047_foundation.sql; aevo-hub/supabase/migrations/20260918100000_booking_domain.sql |
| External map data | Mock/remote Overpass adapter, five-minute client cache, simple 15 m/name dedupe | aevo-go/src/features/map/osm-service.ts |
| Public API contract | Go client retains legacy discovery/search/suggestions/store routes and now has a separate projection-gated Core Place contract | aevo-go/src/lib/customer-api.ts; aevo-go/src/lib/place-api.ts; aevo-contracts/openapi/v1.json; aevo-core-api/src/Aevo.CoreApi/Program.cs |
| Operational control plane | Standalone Admin owns privileged UI/BFF; Core API owns authoritative Admin API and migration boundary | aevo-admin/docs/REPOSITORY_BOUNDARY.md; LOCAL_DEVELOPMENT.md |

## Current request path

The observed live Map path is approximately:

~~~text
Aevo Go MapPage
  -> useMapDiscovery
  -> /api/v1/public/discovery (declared client contract)
  -> public customer-store projection / PostGIS RPC (documented and present in Hub data layer)
  -> StoreMapSummary
  -> one GeoJSON source + MapLibre clustering

Canonical implementation path (opt-in until projection data is populated):

~~~text
Aevo Go MapPage
  -> useMapDiscovery (VITE_PLACE_API_MODE=canonical)
  -> Core /api/v1/public/places/search
  -> aevo_place_public_projections
  -> compatibility StoreMapSummary adapter
~~~

Optional current enrichment:

MapPage
  -> osm-service.ts
  -> mock data or direct Overpass URL
  -> OsmPlace
  -> client-side merge/dedupe with StoreMapSummary
~~~

The request path is not yet a canonical Place path. A production design must
put the external-data adapter, conflation decision, public visibility policy,
and Place identity behind a server-owned boundary.

## Current data authority

The workspace policy says Core API/Infrastructure owns the target database
migration lifecycle and that aevo-hub has no migration write path. At the same
time, the concrete public-store and TraceDee spatial schemas are visible
in aevo-hub/supabase/migrations. This is a transition boundary that must be
resolved before new Place schema is added.

The plan therefore assumes:

- no new Map/Place migration is authorized by this document;
- existing tables remain compatibility inputs during the decision phase;
- a future canonical Place data owner must be explicitly recorded in an ADR;
- the public browser cannot call Supabase with a service credential;
- aevo-admin remains the long-term privileged control plane;
- the Core API/Edge boundary is extended only after route ownership and data
  ownership are agreed.

## Existing strengths

- MapLibre is already isolated in a dedicated renderer.
- The client keeps camera bounds separate from committed/search bounds.
- The client validates and serializes map state in the URL.
- The discovery RPC has a partial GiST index and a bounded result cap.
- The public-store projection prevents private Store fields from leaking into
  the customer surface.
- TraceDee has moderation concepts, audit concepts, and a place search flow
  that can be adapted during a controlled migration.
- Admin already has a server-only BFF and separate platform/org authorization
  concepts.
- The workspace already uses PostGIS; a new spatial database is not justified.

## Current architectural problems

1. There is no cross-module canonical Place ID.
2. tracedee_places and customer_store_profiles can describe the same
   real-world location independently.
3. A Store can have public coordinates, while a Venue/Branch has no explicit
   Place reference.
4. The client can query Overpass directly and merge records without a durable
   source-link or provenance record.
5. The current client dedupe rule is useful for UI noise reduction but is not
   safe for legal, business, or identity decisions.
6. The documented public discovery routes are not matched by a clearly
   discoverable implementation in the inspected Core API source.
7. The current discovery cursor is an offset string, not a stable keyset
   cursor.
8. The no-bbox path can scan up to a fixed number of profiles and filter in
   application code; that is not a universal Place query strategy.
9. Feed/Trace contracts use place-like IDs without one explicit canonical Place
   contract.
10. There is no claim, verification, community submission, conflation, or
    merge-redirect workflow for a canonical Place.

## Audit boundary and confidence

This is a source audit of the local workspace at the audit date. It does not
claim that a route is absent from a deployment, an untracked file outside the
inspected paths, or a remote database. Any statement that begins with
“documented” refers to a local contract or plan and still requires runtime
verification before implementation.

The architecture phase is accepted and implementation is proceeding in
dependency order. Production migration application, source import, privileged
writes, and client cutover remain explicitly gated; see
`20-implementation-status.md`.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

The final review changes the target from a point-only public-store model to a
geometry-capable Place model with explicit hierarchy and separate read paths.
The existing Store projection and TraceDee place table remain compatibility
inputs; neither becomes the universal Place authority by implication.

The MAP-000 ADR must now explicitly record:

- Place is the cross-product geographic identity.
- Business and Organization are commercial/ownership identities.
- Branch is an operational business location with one primary Place link and
  optional secondary/service-location links.
- Store remains the current operational Store ID and is not a Place ID.
- Venue and BookableResource remain booking-domain identities. Venue may link
  to a Place but is not itself the geographic identity.
- A Place may have a parent Place and future child/sub-place relationships.
- One Place may contain multiple businesses or business branches.
- A business branch normally has one primary Place, but may have multiple
  explicitly typed service/location links.

The review also mandates a canonical resolver for merged/retired Place IDs and
two public query families:

- a lightweight, cacheable map overlay path that can later become MVT;
- richer ranked Search/Nearby paths with pagination;
- a separate detail path for hydration and live capability reads.

The geocoder is an input provider, not a Place authority. Thai-first
localized/alternate address fields and field-level provenance are required
before MAP-001 is accepted.
