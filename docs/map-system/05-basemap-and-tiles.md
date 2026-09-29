# Basemap and tiles

Status: provider-neutral boundary implemented; no production provider switch
authorized

## Current implementation

Aevo Go already uses MapLibre through react-map-gl/maplibre in
aevo-go/src/features/map/maplibre-map.tsx. The Map page passes a style URL
from aevo-go/src/lib/env.ts; the current default is an OpenFreeMap dark style.
The renderer has:

- WebGL capability detection and an unsupported fallback;
- one GeoJSON source for Store markers;
- a separate trace route source;
- MapLibre clustering;
- selected/hovered/partner/availability layers;
- list fallback and mobile map-sheet states in the page;
- Map UI attribution text for OpenStreetMap in the current page.

This is a good renderer boundary. The missing pieces are a provider policy,
server-owned Place overlay, attribution lifecycle, and a measured scale path.

## Recommended stack

### V1

- MapLibre GL JS as the renderer.
- A production tile/style provider selected by traffic, licensing, privacy,
  cache, and SLA review.
- Provider-neutral styleUrl configuration resolved by deployment policy.
- Aevocado Place overlay returned by the public discovery API.
- One or a small bounded number of GeoJSON sources for visible dynamic data.
- Client clustering for the current result set.
- Accessible list fallback as the canonical non-WebGL experience.

### Scale path

When a single GeoJSON payload is too large or query latency is unstable:

1. keep the same canonical Place IDs and public field allowlist;
2. publish versioned vector-tile overlays from the Place read model;
3. keep live capabilities out of static tiles;
4. use a detail/capability API for selected Place cards;
5. invalidate tiles by Place revision/source projection version;
6. retain a list/search endpoint for accessibility and exact queries.

Do not let vector tiles become a second identity or business-authority store.

## Layer contract

| Layer | Contents | Freshness | Authority |
| --- | --- | --- | --- |
| Basemap | roads, land, water, labels, buildings | provider-defined | tile/style provider |
| Place overlay | canonical Place ID, point, display name/category, bounded badges | cacheable, revisioned | Place discovery read model |
| Trace overlay | selected route/trace geometry when requested | user/query scoped | Trace domain |
| Capability detail | booking route, hours summary, availability freshness | short-lived/read-through | business/booking service |
| User location | device-derived, never persisted by default | session-only | browser/device |

## Provider abstraction requirements

The client-facing configuration should be able to represent:

- provider name and environment;
- style URL or signed style endpoint;
- tile endpoint policy;
- glyph/sprite endpoint policy;
- attribution HTML/text/link;
- max zoom and supported projections;
- offline/device restrictions;
- telemetry opt-out;
- fallback/error state.

The browser should not receive provider secrets. If a provider requires a
signed token, the Edge/Core configuration boundary must issue a short-lived,
scoped token or use a provider endpoint that is safe to expose.

## Attribution and error states

Attribution must be rendered in:

- normal MapLibre map;
- map loading shell if the provider has already been selected;
- provider failure state;
- accessible result-list fallback;
- static screenshots/exports if those are later supported.

If the basemap fails but Place data is available, keep the list and selected
Place actions usable. If Place data fails, preserve the map shell only with
an explicit stale/offline message; never display stale business availability
as current.

## Dynamic overlay rules

The overlay source must:

- carry canonical Aevo place_id in feature properties;
- carry only public display fields and capability flags;
- avoid private phone/email/customer data;
- avoid source external IDs as the feature identity;
- include a revision or generated-at value for debugging;
- be bounded by the committed viewport and filters;
- be safe to cluster without changing selection identity.

The existing StoreFeatureProperties and toStoreFeatureCollection in
aevo-go/src/features/map/contracts.ts provide a useful compatibility shape,
but the target contract should rename the identity field explicitly to
canonical placeId and keep Store/branch IDs as optional relationships.

## Current direct OSM risk

aevo-go/src/features/map/osm-service.ts supports a remote Overpass mode and
the environment file points at a public Overpass URL. This is acceptable as a
development/demo adapter with explicit mode control. It is not a production
ingestion architecture because it couples user pan/zoom to a public query
service, makes rate limits user-visible, and has no durable provenance,
conflation, or source-disappearance workflow.

The production target is:

~~~text
Map client
  -> Aevo discovery facade
  -> cached canonical Place overlay
  -> source/attribution metadata
~~~

External data fetches happen asynchronously or behind an explicitly governed
server adapter, never as an unbounded per-user browser dependency.

## Readiness checklist

Before changing the basemap provider or enabling production overlays:

- source/license review is complete;
- attribution has been tested in Map and list fallback;
- style/sprite/glyph failures have a user-visible path;
- provider traffic and cache policy are documented;
- Place overlay P95 and payload size are measured;
- WebGL-disabled and mobile-device paths pass;
- canonical Place ID selection and detail routing work without tile data;
- privacy review confirms device location is not persisted accidentally.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

### Map overlay is not the ranked result list

The Map renderer should consume a dedicated lightweight overlay contract. It
contains canonical Place ID, display point/label point, compact category/name,
cluster fields, bounded capability badges, projectionVersion, and attribution
metadata. It does not hydrate detail, ranking explanations, revisions, claims,
raw provenance, or live availability.

The overlay contract must define:

- maximum feature count and payload bytes;
- density/truncation behavior;
- zoom-dependent result policy;
- cluster properties and expansion behavior;
- consistency semantics between visible markers and the list;
- projection version/freshness;
- a migration path to MVT/vector tiles with unchanged Place identity.

Search/list pagination is a separate read path and may return richer summaries.
The map overlay may show a truncated/dense state and a link to Search this
area rather than attempting to render every Place.

### Geometry-aware rendering

Point Places render as normal markers. Polygon or multipolygon Places may use
displayPoint/labelPoint for the marker while the canonical geometry is
available for future boundary/viewport behavior. V1 does not require drawing
polygons, but the overlay field names must not imply every Place is a point.

### Geocoding/provider rule

The basemap provider and geocoder provider are separate contracts. A style
provider's address search must not silently create a Place. Configure
geocoder attribution and quota independently from tile attribution, and keep
the current direct Overpass adapter out of the production overlay path.
