Aevocado Open Source Map — Implementation Plan & Coding Prompt

สถานะ: Proposed implementation plan
ผลิตภัณฑ์: Aevocado Go
เป้าหมาย: สร้างระบบค้นหาร้านบนแผนที่แบบ Open Source ที่รองรับ Web, Capacitor, mobile UX และ desktop split view โดยใช้ข้อมูลร้านของ Aevocado เป็น source of truth

Part I — Implementation Plan

1. Final architecture decision

ใช้ stack ต่อไปนี้เป็นค่าเริ่มต้น:

Capability

Selected technology

หมายเหตุ

Map renderer

MapLibre GL JS

Open-source WebGL/vector map renderer

React adapter

react-map-gl/maplibre

ใช้ React integration ที่แยกจาก Mapbox runtime

Development basemap

OpenFreeMap

เปลี่ยนได้ผ่าน configuration

Production-controlled basemap

PMTiles บน Cloudflare R2/CDN

Future phase เมื่อ traffic/ownership justify

Business geospatial data

Supabase PostgreSQL + PostGIS

ร้าน, location, search area และ distance

Client geometry

Turf.js เฉพาะ presentation/interaction

Server/PostGIS เป็น authority

Client clustering

MapLibre GeoJSON clustering

ใช้ก่อนเพิ่ม tile server

Future dynamic store tiles

Martin + PostGIS

เพิ่มเมื่อ GeoJSON response เริ่มใหญ่

Geocoder

Provider interface; Photon เป็น preferred self-host option

ห้ามผูก domain กับ provider

Routing

External navigation ใน MVP

Valhalla/OSRM เป็น future option

Edge/cache

Cloudflare Worker/CDN

Cache เฉพาะ public, non-personalized response

Architecture:

React / Capacitor
├── MapLibre GL JS
│ ├── Basemap style/tiles
│ ├── Aevocado store source
│ ├── Cluster layers
│ └── Selected-store layers
├── Map application state
└── Aevocado Discovery API
├── validation/rate limit/cache policy
└── Supabase PostgreSQL + PostGIS
├── store locations
├── search/filter
└── distance/bounds queries

2. Scope

MVP

Render MapLibre map on Web and Capacitor WebView

Open-source basemap with required attribution

Current-location control with explicit permission request

Search this area

Query stores inside viewport bounding box

Filter by category, availability, price and keyword

Store marker with category/rating/selected states

Marker clustering

Mobile store preview bottom sheet

Desktop list/map split view

List/marker selection synchronization

URL state for search/filter/selected store

Loading, empty, stale, offline and retry states

Accessible list fallback

Analytics and operational telemetry

Phase 2

Radius search

Polygon/drawn-area search

Nearby sorting

Heatmap/store-density layer

Multiple map styles and theme support

Geocoder autocomplete through a controlled provider

Reverse geocoding for merchant location setup

Availability-aware marker

Map/list result pagination strategy

Future

PMTiles production basemap pipeline

Dynamic vector tiles through Martin

Self-hosted Photon/Pelias

Valhalla/OSRM routing

Offline map regions

Native MapLibre renderer only if WebView profiling proves necessary

Non-goals for MVP

Do not self-host the entire OpenStreetMap planet pipeline

Do not build native Swift/Kotlin map screens

Do not implement turn-by-turn navigation

Do not expose direct unrestricted database tables to anonymous clients

Do not load every Aevocado store into the browser

Do not use the public Nominatim endpoint for production autocomplete

Do not introduce a second transactional database

3. Package boundaries

packages/
├── map-contract/
│ ├── bounds.ts
│ ├── feature.ts
│ ├── filters.ts
│ └── provider.ts
├── map-renderer/
│ ├── AevocadoMap.tsx
│ ├── sources/
│ ├── layers/
│ ├── controls/
│ └── styles/
├── map-discovery/
│ ├── use-map-discovery.ts
│ ├── map-search-machine.ts
│ ├── query-keys.ts
│ └── map-url-state.ts
├── geocoder/
│ ├── contract.ts
│ ├── photon-provider.ts
│ └── mock-provider.ts
└── map-test-utils/

apps/go-app/src/features/map/
├── routes/
├── mobile/
├── desktop/
├── components/
└── analytics/

Rules:

Renderer must not call Supabase or business API directly

Route/layout must not contain PostGIS or provider-specific logic

Domain entities must not import MapLibre types

Convert between domain types and GeoJSON at the map boundary

Mobile and desktop layouts consume the same discovery view model

Tile/style/geocoder URLs come from validated runtime configuration

4. Core TypeScript contracts

export type GeoPoint = Readonly<{
longitude: number;
latitude: number;
}>;

export type MapBounds = Readonly<{
west: number;
south: number;
east: number;
north: number;
}>;

export type StoreMapSummary = Readonly<{
id: string;
slug: string;
name: string;
point: GeoPoint;
categoryId: string;
categoryIconKey: string;
rating: number | null;
reviewCount: number;
priceLevel: 1 | 2 | 3 | 4 | null;
thumbnailUrl: string | null;
availableToday: boolean | null;
distanceMeters?: number;
}>;

export type MapSearchFilters = Readonly<{
query?: string;
categoryIds: string[];
priceLevels: number[];
availableAt?: string;
partySize?: number;
}>;

export interface MapStyleProvider {
getStyleUrl(theme: 'light' | 'dark'): string;
}

export interface GeocoderProvider {
search(query: string, options: GeocoderSearchOptions): Promise<PlaceResult[]>;
reverse(point: GeoPoint): Promise<PlaceResult | null>;
}

Use immutable view models where practical. Do not pass the raw database row or raw provider response into UI components.

5. Database design

5.1 PostGIS installation

Install PostGIS in a dedicated schema such as extensions, not public

Confirm the actual project schema before generating migration

Never drop/recreate an existing PostGIS extension without a backup and explicit approval

5.2 Store location model

Proposed model; adapt names to the existing schema:

create table public.store_locations (
store_id uuid primary key references public.stores(id) on delete cascade,
location extensions.geography(point, 4326) not null,
formatted_address text,
country_code text,
administrative_area text,
locality text,
postal_code text,
timezone text not null,
geocoder_provider text,
geocoder_place_id text,
accuracy_status text not null default 'unverified',
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
);

create index store_locations_location_gist
on public.store_locations
using gist (location);

Additional indexes must follow actual query patterns:

create index stores_public_category_idx
on public.stores (category_id)
where status = 'published';

create index stores_org_idx
on public.stores (organization_id);

Do not add indexes speculatively. Verify with EXPLAIN (ANALYZE, BUFFERS) and production-like fixtures.

5.3 Geographic invariants

Longitude comes before latitude in Point/GeoJSON coordinates

Store coordinates use SRID 4326

Validate longitude [-180, 180]

Validate latitude [-90, 90]

Store the timezone separately; do not infer it on every request

Maintain exactly one canonical search location per store in MVP

Optional entrance/service-area locations should use separate columns/tables

5.4 Public exposure

The public map response should return only fields needed for discovery. It must not expose:

Organization internals

Private contact data

Draft/unpublished stores

Exact private venue coordinates when policy requires obfuscation

Staff/member data

Internal pricing or inventory data

Use a trusted API/RPC or a security-invoker view with RLS, not unrestricted table reads.

6. Spatial query contracts

6.1 Stores in viewport

Endpoint:

GET /v1/discovery/stores/in-view

Query:

west, south, east, north
zoom
categoryIds[]
priceLevels[]
availableAt
partySize
query
limit
cursor

Response:

type StoresInViewResponse = {
requestId: string;
bounds: MapBounds;
stores: StoreMapSummary[];
totalApproximate?: number;
truncated: boolean;
nextCursor?: string;
};

Behavior:

Validate bounds and reject impossible ranges

Cap the maximum geographic area at high zoom-out levels

Cap result count

Return truncated: true when results exceed the cap

Return a cluster/density strategy rather than all points for country-wide views

Apply published/visibility policy on server

Apply stable ordering for pagination

Conceptual SQL:

where sl.location && extensions.st_makeenvelope(
:west,
:south,
:east,
:north,
4326
)

Final SQL must match geography/geometry types correctly and must be verified with the actual PostGIS installation.

6.2 Nearby stores

GET /v1/discovery/stores/nearby
?latitude=&longitude=&radiusMeters=&filters...

Use indexed spatial predicates and return distanceMeters. Do not calculate distance for all stores before filtering.

6.3 Store detail

Map response contains summary only. Fetch full detail separately:

GET /v1/stores/:slug

This prevents large menus, reviews and galleries from inflating map payloads.

7. MapLibre source/layer design

One GeoJSON source can power several layers:

aevocado-stores source
├── store-clusters
├── store-cluster-count
├── store-markers
├── store-rating-labels
├── store-selected-halo
└── store-availability-indicator

Layer rules:

Use symbol/circle layers for normal stores, not hundreds of DOM markers

Use a DOM marker only for the current user or a small number of exceptional controls

Give every feature a stable ID

Use feature state or a selected-store filter for highlight

Keep icon atlas/sprite keys stable

Avoid embedding large images or full descriptions in GeoJSON properties

Add source/layers after style load and reattach them after style changes

Recommended GeoJSON properties:

type StoreFeatureProperties = {
storeId: string;
slug: string;
categoryIconKey: string;
ratingLabel: string;
priceLevel: number | null;
availableToday: boolean | null;
};

8. Search-in-this-area state machine

initial
↓ load initial bounds
ready
↓ user pans/zooms
camera-dirty
↓ show Search this area
searching
├── success → ready with committed bounds
├── empty → empty-in-area
├── offline → stale/offline
└── failure → retryable-error

State:

type MapDiscoveryState = {
cameraBounds: MapBounds;
committedBounds: MapBounds | null;
cameraRevision: number;
selectedStoreId: string | null;
hoveredStoreId: string | null;
status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'offline';
};

Rules:

Do not request on every move event

Record dirty bounds on moveend

Show Search this area only after a user-originated camera change

Do not show it after programmatic fitBounds for newly loaded results

Cancel or ignore obsolete reads

Preserve current results during background refresh

A canceled request does not mean a mutation was canceled; map search itself is read-only

Cache query by normalized bounds/zoom/filter

Quantize bounds only if proven beneficial and without confusing visible results

9. Map/list synchronization

Single selection state:

Marker click selects the store and scrolls/reveals its card

Card click selects store and moves the camera only when necessary

Desktop card hover may preview marker state, but click/focus remains available

Closing preview clears selection but preserves search result

Cluster click expands/zooms to cluster bounds

URL can contain selected store slug or ID when deep linking is useful

Back action closes detail/preview before leaving map route

Prevent feedback loops:

Distinguish user camera events from application camera commands

Use stable refs for map instance and selected ID

Do not make camera position and list scroll continuously drive each other

10. Responsive UX

Mobile/Capacitor

Full viewport map
├── Search field
├── Filter chips
├── Search this area button
├── Locate control
├── Store bottom sheet
└── Bottom navigation safe area

Bottom sheet states:

collapsed: result count/selected summary

preview: selected store card

expanded: scrollable store result list

Requirements:

Map gestures must not conflict with sheet scrolling

Sheet has non-gesture controls and accessible dialog/list semantics

Bottom navigation and home indicator must not cover sheet actions

Keyboard/search field must resize safely

Location permission is requested after explicit action

Desktop

Filter/search header
┌──────────────────────┬────────────────────────────┐
│ Result list 38–42% │ Map 58–62% │
│ cards + pagination │ markers + controls │
└──────────────────────┴────────────────────────────┘

Requirements:

Map and list remain visible together

Result card keyboard focus highlights marker

Map has a visible list alternative

Filter changes update URL and retain usable results during refresh

No mobile bottom sheet or bottom navigation on desktop

11. Geocoding strategy

Separate searches:

Aevocado store/category/menu search → Aevocado database/search API

Area/address search → geocoder provider

Provider contract prevents lock-in. Do not mix provider-specific IDs into store-domain primary keys.

MVP options:

Use a controlled hosted provider behind Aevocado API

Or deploy Photon for area/address autocomplete

Rules:

Debounce autocomplete

Require a minimum query length

Cache normalized queries when permitted

Restrict results to target countries/areas when useful

Preserve provider attribution/license requirements

Never send sensitive customer data as a geocoding query

Do not use public Nominatim for production autocomplete

12. Basemap and tile strategy

Stage A — Development/pilot

OpenFreeMap style URL through configuration

Keep attribution visible

Provide fallback style URL

Monitor failed tile/style/glyph requests

Stage B — Controlled production tiles

Geofabrik/OSM extract
→ Planetiler/OpenMapTiles pipeline
→ Thailand PMTiles
→ Cloudflare R2
→ Cloudflare CDN
→ MapLibre PMTiles protocol

Include:

Style JSON

Sprites

Fonts/glyphs supporting Thai and English

Attribution

Dataset version/build timestamp

Update/rollback pipeline

Do not build Stage B before reliability/cost/control requirements justify the operational burden.

13. Performance plan

Client

Lazy-load map route and MapLibre bundle

Use symbol/circle layers instead of many React/DOM markers

Do not rerender the map for unrelated page state

Keep GeoJSON properties minimal

Update source data rather than rebuilding the map instance

Use clustering below appropriate zoom levels

Avoid expensive popup React trees for every point

Test low/mid Android devices through Capacitor

API/database

GiST index on spatial column

Index join/filter columns used by the query

Partial indexes for published/non-deleted stores when query predicate matches

Bound and limit every map query

Avoid select \*

Use cursor pagination where the list is paginated

Run EXPLAIN (ANALYZE, BUFFERS) on representative queries

Track p50/p95/p99 latency, rows examined/returned and payload size

Scale triggers

Move from GeoJSON to dynamic vector tiles only when one or more are true:

Viewport payload repeatedly exceeds the defined budget

Store points returned per search exceed practical client clustering

Spatial API/database load is material

Country/region-wide zoom levels require density aggregation

Profiling shows serialization/transfer dominates latency

14. Cache policy

Cacheable:

Public published store summaries

Category metadata

Basemap styles/tiles/sprites/fonts

Search response without user-specific availability/pricing, with short TTL

Do not publicly cache:

Personalized recommendations

Customer favorites

Private/draft stores

Cart/session data

User-specific prices/coupons

Exact real-time availability when correctness is critical

Cache keys must include every query dimension that changes response: bounds, zoom bucket, filters, locale and public catalog version.

15. Security and privacy

Never expose Supabase service-role key to Web or Capacitor

Apply RLS to exposed tables and views

TO authenticated alone is not sufficient authorization

Public discovery must enforce published/visibility rules server-side

Validate numeric bounds, zoom, limit, cursor and filter cardinality

Rate-limit discovery/geocoding endpoints

Prevent arbitrary SQL/filter injection

Restrict geocoder and tile credentials by origin where applicable

Store only location precision required for the product

Do not request geolocation permission at app launch

Do not log exact customer location unless explicitly needed and governed

Remove precise coordinates from telemetry

Review OpenStreetMap/tiles/geocoder attribution and data-license obligations

16. Async/error states

Required states:

Map library loading

Style loading failure

Tile/network degradation

Initial store loading

Background store refresh

Empty viewport

Result truncated

Search API failure

Offline with stale cached results

Geolocation unavailable/denied

Geocoder unavailable

Unsupported WebGL

Behavior:

Keep the list usable if map rendering fails

Keep existing markers visible during background refresh

Show inline retry; do not rely on toast alone

Distinguish no stores from network failure

Provide manual area search if geolocation is denied

Never claim live availability when showing stale data

17. Accessibility

Map is supplemental; every store is available through a semantic list

Provide accessible name/instructions for the map region

All controls are keyboard accessible

Marker-only information is duplicated in result cards

Hover interactions have focus/tap equivalents

Do not encode category/availability only by color

Focus is not trapped in map canvas

Sheet/dialog restores focus correctly

Search this area announces loading/result count changes politely

Respect reduced motion for fly/ease animations

18. Analytics and observability

Product events:

map_viewed
map_moved
map_search_area_requested
map_search_area_completed
map_search_area_failed
map_cluster_opened
map_store_selected
map_list_store_selected
map_filter_changed
map_geolocation_requested
map_geolocation_result
map_external_navigation_opened

Operational metrics:

Style/tile error rate

Map initialization duration

Discovery API p50/p95/p99

PostGIS query duration

Result count and truncated rate

GeoJSON payload bytes

WebGL initialization failure

Crash-free native sessions on map route

Do not log exact user coordinates. Bucket region/zoom or use coarse grid only when analytics requires location context.

19. Test plan

Unit

Bounds validation and serialization

Longitude/latitude order

URL state encode/decode

Dirty/committed bounds state machine

Store-to-GeoJSON conversion

Provider response normalization

Query-key stability

Database

Stores inside/outside viewport

Boundary coordinates

Nearby ordering

Draft/private/deleted exclusion

Filters combined with spatial predicate

RLS positive/negative cases

Query plan uses spatial/index paths

Integration

API validation and result cap

Obsolete request ignored/canceled

Selection synchronization

Cluster expansion

Style reload reattaches sources/layers

Geocoder fallback

E2E

Initial area → marker → preview → store detail

Pan → Search this area → updated markers/list

Filter → URL update → refresh restoration

Cluster → zoom → individual stores

Geolocation grant/deny

Offline/stale recovery

Mobile bottom sheet

Desktop split view

Keyboard-only list/map controls

Device/browser

Chromium, Safari/WebKit and Firefox

iOS Capacitor WebView

Android Capacitor WebView on mid-range hardware

Narrow phone, tablet, 1280px and 1440px desktop

WebGL unavailable fallback

20. Delivery phases

M0 — Audit and ADR

Inspect repository, routes, data model and existing map/search code

Confirm MapLibre/OpenFreeMap/PostGIS decision

Document provider boundaries and non-goals

Capture performance baseline

Exit: ADR approved and no unknown source-of-truth ambiguity

M1 — Database and contracts

Verify/install PostGIS in dedicated schema

Add/adapt store location model

Add spatial and supporting indexes

Implement bounds validation

Implement in-view query and API response contract

Add RLS/visibility tests

Exit: test fixtures pass and query plan is verified

M2 — Map foundation

Install/pin MapLibre and React integration

Configure worker for Vite

Add map shell, style provider and attribution

Implement WebGL/map failure fallback

Add store GeoJSON source and basic layer

Exit: map renders on Web, iOS and Android builds

M3 — Search this area

Camera dirty/committed state

Search-this-area control

TanStack Query integration

Request cancellation/obsolete response protection

URL state

Exit: repeated pan/search actions return correct current viewport results

M4 — Tabelog-style discovery

Cluster/count layers

Rating/category/selected marker styles

Mobile preview sheet

Desktop list/map split view

List/marker synchronization

Exit: primary discovery flow works across breakpoints

M5 — Filters, location and geocoder

Category/price/availability filters

Geolocation permission flow

Area/address provider interface

Photon or controlled provider integration

Exit: denied/unavailable/failure paths are usable

M6 — Hardening

Performance budgets and profiling

Accessibility review

Analytics/telemetry

Rate limits/cache policy

Cross-browser/native regression

Exit: production readiness checklist passes

Future M7 — Controlled map infrastructure

PMTiles pipeline and R2/CDN hosting

Thai fonts/glyphs/sprites/style

Rollback/version process

Optional Martin store tiles

Trigger: cost, reliability, control or scale metrics justify ownership

21. Definition of done

MapLibre and basemap attribution are correct

Mobile and desktop use one discovery/data model

Search this area queries current committed bounds only

Obsolete responses cannot overwrite newer results

Store markers and list remain synchronized

Map failure leaves an accessible list experience

PostGIS query uses GiST/spatial index on representative data

API limits bounds area and result size

RLS/visibility excludes unauthorized/unpublished stores

No service-role key or sensitive location appears in client/logs

Web, iOS and Android smoke tests pass

Loading, empty, offline, truncated and error states are implemented

Metrics and actionable errors are available

Part II — Master Implementation Prompt

Copy the prompt below into a coding agent that has access to the Aevocado repository. Replace bracketed placeholders only when necessary.

You are implementing the Aevocado Go open-source map discovery feature in an existing production-oriented monorepo.

GOAL
Build a MapLibre-based store discovery experience that works on the browser and inside the existing Capacitor iOS/Android shell. It must support Search this area, store markers, clustering, mobile store preview, desktop list/map split view, filters, selection synchronization, URL restoration, accessible list fallback, and Supabase/PostGIS spatial queries.

DO NOT START CODING IMMEDIATELY
First inspect and report:

1. Repository structure, package manager and build tooling.
2. Applicable AGENTS.md and project instructions.
3. Current Go routes, navigation and responsive shell.
4. Existing map, search, store-card, bottom-sheet and query components.
5. Existing API contracts and Supabase schema/migrations.
6. Current store/organization/location relationships.
7. Current auth, RLS and public-store visibility rules.
8. Existing design tokens, icon system, async-state patterns and tests.
9. Existing Capacitor configuration and supported platform versions.
10. Any dirty worktree changes; preserve unrelated user work.

After inspection, produce a concise implementation plan mapped to actual files. Identify conflicts between this prompt and the repository. Repository reality and explicit user requirements take precedence; do not invent file paths, table names or APIs.

ARCHITECTURE DECISIONS

- Renderer: MapLibre GL JS.
- React integration: react-map-gl/maplibre unless the repository already has a compatible MapLibre abstraction.
- Development basemap: configurable OpenFreeMap-compatible style URL.
- Business source of truth: existing Aevocado API and Supabase PostgreSQL + PostGIS.
- Client geometry helpers: Turf.js only when justified for presentation; PostGIS remains authoritative.
- Initial clustering: MapLibre GeoJSON source clustering.
- Routing MVP: external navigation link; do not introduce a routing engine.
- Geocoder: provider interface; do not call public Nominatim for production autocomplete.
- Do not add Mapbox GL JS, Google Maps SDK, Leaflet or a second mapping renderer.
- Do not build separate mobile and desktop business logic.

IMPLEMENTATION BOUNDARIES

- Create or reuse map-contract, map-renderer and map-discovery boundaries.
- Renderer components must not call Supabase directly.
- Route/mobile/desktop layouts must consume one typed discovery view model.
- Domain types must not depend on MapLibre types.
- Convert domain store summaries to GeoJSON at the renderer boundary.
- Tile/style/geocoder configuration must be runtime validated.
- Preserve existing design language and shared components.
- Do not replace unrelated framework, auth, API or state architecture.

DATABASE AND SUPABASE RULES

- Inspect the current schema before creating a migration.
- Create migrations using the repository/Supabase CLI workflow; do not invent migration timestamps manually.
- Verify whether PostGIS already exists and which schema owns it.
- Never drop/recreate or relocate an existing PostGIS extension without explicit approval and backup.
- Prefer geography(Point, 4326) for canonical store search location unless the existing schema has a justified compatible choice.
- Add a GiST spatial index.
- Add indexes to actual JOIN/WHERE/RLS columns used by the final query.
- Use partial indexes only when their predicate matches frequent production queries.
- Never expose service_role or secret credentials to Web/Capacitor.
- Enable/retain RLS for exposed tables.
- TO authenticated is not sufficient authorization by itself.
- Never use user_metadata for authorization.
- Prefer security invoker. If SECURITY DEFINER is genuinely required, keep it in a private schema, set an empty search_path, perform explicit identity checks and revoke default execute permissions.
- Validate public store visibility, organization/store boundaries and soft deletion.
- Run database/security advisors where available.

SPATIAL API
Implement or adapt a typed endpoint equivalent to:

GET /v1/discovery/stores/in-view
west, south, east, north, zoom,
categoryIds, priceLevels, availableAt, partySize, query,
limit, cursor

Requirements:

- Validate coordinate ranges and west/south/east/north relationships.
- Handle or explicitly reject antimeridian-spanning bounds.
- Cap maximum area and result count.
- Return stable IDs and stable ordering.
- Return truncated=true when capped.
- Return only lightweight public store summaries.
- Do not include full menu, reviews, gallery or private organization data.
- Enforce published/visible state server-side.
- Use a spatial-index-compatible predicate.
- Use parameterized SQL/query APIs.
- Verify the final query with EXPLAIN (ANALYZE, BUFFERS) using representative fixtures.
- Add positive, negative, boundary and visibility tests.

MAP SOURCE AND LAYERS
Create one stable GeoJSON source for store summaries and layers equivalent to:

- store-clusters
- store-cluster-count
- store-markers
- store-rating-labels
- store-selected-halo
- optional store-availability-indicator

Use MapLibre circle/symbol layers for store collections. Do not render hundreds of React DOM Marker components. Give each feature a stable ID. Keep GeoJSON properties minimal and serializable. Reattach Aevocado sources/layers after style changes.

SEARCH THIS AREA
Implement a clear state distinction between:

- camera bounds: current visual viewport
- committed bounds: bounds used for the current result set

Rules:

- Do not query on every map move event.
- On user-originated moveend, mark the camera dirty and show Search this area.
- On button activation, request current camera bounds and filters.
- Keep current markers/list visible while refreshing.
- Cancel or ignore obsolete requests so old responses cannot overwrite newer ones.
- Do not show the button after programmatic fitBounds/flyTo unless the user subsequently moves the map.
- Preserve the committed result when a refresh fails.
- Distinguish empty results, failure, offline and truncated results.

STATE OWNERSHIP

- URL: filters and shareable selected store context.
- TanStack Query or existing server-state layer: discovery API result/cache.
- Local map state: camera, dirty flag, hover and temporary interaction.
- Shared selection state: selected store ID used by map/list/sheet.
- Do not mirror server results into a global client store without a demonstrated need.
- Do not render full mobile and desktop trees simultaneously just to hide one with CSS.

MOBILE UX

- Full-viewport map.
- Search and filter controls respect safe area.
- Search this area control is reachable and does not cover important markers.
- Store result bottom sheet supports collapsed, preview and expanded/list states.
- Sheet gestures do not conflict with map pan or internal list scroll.
- Bottom navigation/home indicator does not cover actions.
- Native back closes selected preview/sheet before leaving the route.
- Request geolocation only after an explicit user action.
- Provide manual area search when permission is denied.

DESKTOP UX

- Split layout with result list around 38–42% and map around 58–62%.
- Search/filter controls remain visible and usable.
- Selecting/focusing a result highlights the corresponding marker.
- Selecting a marker reveals the result card.
- Do not use the mobile bottom sheet or bottom navigation.
- Provide keyboard access to all result actions.

ACCESSIBILITY

- The semantic store list is the accessible alternative/source for map markers.
- Name the map region and controls.
- All information conveyed by a marker also exists in the list/card.
- Hover behavior must have focus/tap equivalents.
- Do not use color alone for category, selected or availability state.
- Provide visible focus and prevent sticky controls from covering it.
- Announce search pending/completion/result count in an appropriate live region without duplicate announcements.
- Respect prefers-reduced-motion; avoid forced fly animations.
- If WebGL fails, render the list/search experience with an actionable notice.

ASYNC AND ERROR UX
Implement:

- map/style loading
- initial store loading
- background refresh
- empty viewport
- result truncated
- API error with retry
- offline with stale results
- location permission denied/unavailable
- geocoder unavailable
- WebGL unavailable

Do not remove usable current data during background refresh. Do not rely on toast as the only error/recovery UI. Never display stale availability as live.

PERFORMANCE

- Lazy-load MapLibre/map route where the existing router permits.
- Configure the MapLibre worker correctly for the repository's Vite setup.
- Keep the map instance stable.
- Update GeoJSON source data instead of recreating the map.
- Keep feature properties minimal.
- Cluster at lower zooms.
- Avoid per-marker React trees.
- Add API bounds/result caps.
- Measure map initialization, discovery request latency and payload size.
- Profile on a mid-range Android Capacitor device, not desktop only.

SECURITY AND PRIVACY

- Validate all coordinates, zoom, filters, limits and cursors.
- Apply rate limiting to public discovery/geocoder endpoints.
- Do not log exact user location.
- Do not include coordinates in analytics unless explicitly coarse/bucketed.
- Preserve required map/data attribution.
- Ensure public map responses cannot reveal draft/private stores.

TESTS
Add or update tests proportional to risk:

Unit:

- bounds validation and URL serialization
- lng/lat order
- store-to-GeoJSON mapping
- dirty/committed bounds state
- obsolete-response protection

Database/API:

- inside/outside viewport
- exact boundary point
- filter combinations
- unpublished/private/deleted exclusion
- result cap/truncated flag
- RLS/authorization negative cases
- spatial query plan/index usage

E2E:

- initial map → marker → preview → store detail
- pan → Search this area → synchronized map/list
- filter → URL → reload restoration
- cluster expansion
- geolocation grant and deny
- offline/error retry
- mobile bottom sheet
- desktop split view
- keyboard-only list workflow

Run the repository's existing lint, typecheck, unit, integration, build and relevant E2E commands. Also build/smoke-test the Capacitor targets if the environment permits. Do not claim tests that were not run.

DELIVERY ORDER

1. Audit and ADR.
2. Database/location model and spatial API.
3. Map shell/style/provider configuration.
4. Store GeoJSON source and marker layers.
5. Search-this-area state and API integration.
6. Clustering and selection synchronization.
7. Mobile bottom sheet.
8. Desktop split view.
9. Filters/geolocation/geocoder provider.
10. Accessibility, performance, telemetry and hardening.

For each step:

- implement a coherent vertical slice;
- verify it;
- report changed files and actual checks;
- preserve unrelated work;
- stop and ask if a required product/security choice cannot be inferred safely.

DEFINITION OF DONE

- MapLibre works on Web and Capacitor targets.
- Search this area uses the current committed bounds correctly.
- Old responses cannot overwrite newer searches.
- Map/list/preview selection is synchronized.
- Clustering works without a large DOM marker tree.
- Mobile and desktop share routes/data/domain logic but use appropriate layouts.
- Map failure leaves a functional accessible list.
- Spatial query and supporting filters use verified indexes.
- Unauthorized/unpublished stores never appear.
- All required async/error/offline states exist.
- Targeted tests and builds pass.
- Documentation states basemap/geocoder providers, attribution, operational limits and future PMTiles/Martin triggers.

FINAL RESPONSE FORMAT

1. Outcome delivered.
2. Architecture/files changed.
3. Database/API changes.
4. UX behavior by mobile/desktop.
5. Tests and checks actually run.
6. Known limitations or deferred future work.

Part III — Smaller Phase Prompts

Use these when implementing one milestone at a time instead of the master prompt.

Prompt M1 — PostGIS and discovery API

Inspect the existing Aevocado Supabase schema and API, then implement only the geospatial data foundation and stores-in-view endpoint described in Aevocado-Open-Source-Map-Implementation-Plan-and-Prompt.md.

Do not build UI yet. Do not invent table names before inspection. Verify PostGIS schema safely, add/adapt canonical store location with a GiST index, implement validated bounding-box search with result caps and public visibility enforcement, add RLS/negative tests, and verify representative queries with EXPLAIN (ANALYZE, BUFFERS). Preserve existing organization/store relationships and migrations. Report actual query plans and tests run.

Prompt M2 — MapLibre foundation

Implement only the MapLibre foundation for Aevocado Go using the existing repository architecture. Use MapLibre GL JS and react-map-gl/maplibre unless an existing compatible abstraction is present. Add runtime-validated map style configuration, correct Vite worker setup, attribution, loading/error/WebGL fallback, and one minimal store GeoJSON layer fed through a mock or existing typed API boundary. Verify Web and available Capacitor builds. Do not implement clustering, bottom sheet or geocoder yet.

Prompt M3 — Search this area

Implement the Search this area vertical slice using the existing MapLibre foundation and real stores-in-view API. Maintain separate cameraBounds and committedBounds, trigger dirty state only after user-originated moveend, preserve results during refresh, cancel or ignore obsolete responses, synchronize URL filters, and implement loading/empty/error/offline/truncated states. Add unit, integration and E2E coverage for rapid pan/search sequences. Do not add new map providers.

Prompt M4 — Tabelog-style mobile/desktop discovery

Implement the Aevocado store-discovery presentation using the existing shared map discovery view model. Add MapLibre cluster/count/marker/rating/selected layers, mobile collapsed-preview-expanded bottom sheet, desktop 40/60 list-map split view, and bidirectional list/marker selection. Use MapLibre layers instead of many DOM markers. Preserve accessible semantic store list, keyboard behavior, safe areas, back behavior and reduced motion. Do not duplicate API/domain state between mobile and desktop.

Prompt M5 — Geolocation, filters and geocoder

Implement map filters, explicit-action geolocation and the GeocoderProvider boundary. Store/category/menu search must continue using Aevocado data; area/address search uses the provider. Do not use public Nominatim for production autocomplete. Provide manual area selection when permission is denied, debounce and cancel autocomplete, validate/cache through the existing API policy, preserve attribution, and test unsupported/denied/offline provider states.

Prompt M6 — Production hardening

Audit and harden the completed Aevocado map feature. Profile browser and mid-range Android Capacitor performance, inspect GeoJSON payload and map initialization, verify PostGIS plans/indexes, run RLS/visibility negative tests, review exact-location privacy, add tile/style/API telemetry, complete accessibility and reduced-motion checks, and document scale triggers for PMTiles, Martin and self-hosted Photon. Fix verified issues without expanding unrelated scope. Report commands, measurements and remaining limitations honestly.

Reference links

MapLibre GL JS: https://maplibre.org/maplibre-gl-js/docs/

react-map-gl MapLibre integration: https://github.com/visgl/react-map-gl

OpenFreeMap: https://openfreemap.org/quick_start/

PMTiles/Protomaps: https://docs.protomaps.com/

Planetiler: https://github.com/onthegomap/planetiler

Martin tile server: https://maplibre.org/martin/

Photon: https://github.com/komoot/photon

Pelias: https://github.com/pelias/pelias

Nominatim public usage policy: https://operations.osmfoundation.org/policies/nominatim/

OSRM API: https://project-osrm.org/docs/v5.24.0/api/

Valhalla: https://valhalla.github.io/valhalla/

Supabase PostGIS: https://supabase.com/docs/guides/database/extensions/postgis

Supabase API security: https://supabase.com/docs/guides/api/securing-your-api

## Aevo Go implementation status — 22 September 2026

- Delivered in `aevo-go`: desktop full-height split Map workspace and mobile
  full-screen map with collapsed/preview/expanded result sheet.
- Delivered: Places/Traces modes, URL-owned filters and selection, Search this
  area dirty/commit behavior, MapLibre GeoJSON layers, cluster/marker/route
  selection sync, hover sync, loading/empty/error/offline/WebGL fallback, and
  explicit location-permission recovery.
- Delivered: the demo fixture renders trace routes locally for UI verification;
  live Trace mode consumes the typed TraceDee feed and does not invent route
  geometry when the public response does not provide it.
- Verified: `npm run typecheck`, `npm test`, and `npm run build` from
  `aevo-go`.

Deferred: server-side Trace route geometry projection, live map sort semantics
for Trace mode, and provider/attribution details remain tied to the final map
contract and deployment configuration.
