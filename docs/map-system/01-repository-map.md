# Map system repository map

Audit date: 2026-09-24

## Repository and runtime ownership

| Repository | Current role | Map/Place responsibility observed | Target role |
| --- | --- | --- | --- |
| aevo-go | Customer Web/PWA/Capacitor client, Vite/React | Map screen, MapLibre renderer, URL state, public discovery client, optional OSM adapter, list fallback | Untrusted presentation and query client; never canonical identity or verification authority |
| aevo-hub | Hub UI, Supabase packages, TraceDee data access, transitional domain implementation | Public Store profile, discovery RPC, TraceDee place schema/repository, booking schema, transitional admin routes | Compatibility adapter and existing domain owner only until Core migration/data ownership decision |
| aevo-core-api | .NET Core API and target API/migration boundary | Health/auth/admin/feed plus projection-gated public Place routes and Core-owned Place migrations | Canonical public API, verification/moderation command boundary, and Core-owned migration owner |
| aevo-edge-gateway | Cloudflare ingress and forwarding boundary | Request IDs, CORS, HMAC forwarding; no business Map rules | Browser ingress only; do not create another gateway |
| aevo-contracts | Versioned cross-repository TypeScript/OpenAPI contracts | Feed plus versioned Place/discovery/claim/submission vocabulary | Versioned Place/discovery/claim/submission contracts |
| aevo-admin | Standalone privileged control plane and server-only BFF | Go dashboard/settings, moderation/audit routes; no Place registry workflow | Place source, conflation, claim, verification, submission, and rollback operations |
| aevo-background-worker | Pub/Sub/Cloud Tasks worker skeleton | No confirmed Place ingestion consumer | Async ingestion, conflation jobs, projection refresh, and retry/dead-letter handling |
| aevo-infrastructure | Terraform/runtime resources | Cloud SQL/Postgres, Cloud Run, Pub/Sub/Tasks, secrets, observability primitives | Provision only after measured need and approved ownership |
| aevo-play | Sports/venue merchant application | Separate venue/court/booking schema; no Place link | Business capability producer; must consume canonical Place IDs through its API boundary |
| aevo-pos | Store operations/POS application | Store/org/queue/catalog domain; no Place link | Branch/business capability producer; no geospatial authority |
| aevo-accounts | Identity broker/SSO | App-scoped identity/session boundary | Authentication only; no Place business rules |
| aevo-digital-sing | Independent application | No Map scope identified | Out of first Map slice |

## Local development and migration ownership

LOCAL_DEVELOPMENT.md records the intended request topology:

~~~text
Browser
  -> app surface
  -> Cloudflare Edge
  -> Core API
  -> target database

Hub is an identity/domain compatibility surface, not a new API gateway.
Core API/Infrastructure owns the target database migration lifecycle.
aevo-admin calls Core through its server-side BFF.
~~~

Relevant source references:

- LOCAL_DEVELOPMENT.md — ports, Edge/Core topology, app-scoped sessions,
  migration ownership, and the explicit prohibition on pushing Play/POS
  shared-auth copies to the Core database.
- aevo-infrastructure/scripts/check-migration-ownership.ts — intended checks
  for the Core migrator, migration-only IAM, no Hub migration writer, and no
  legacy gateway launcher.
- aevo-admin/docs/REPOSITORY_BOUNDARY.md — Admin/Core ownership and
  server-only BFF contract.

The Map plan must not create a second migration owner inside aevo-hub,
aevo-go, aevo-play, or aevo-pos.

## Existing request/data paths

### Customer Map

1. aevo-go/src/features/map/map-page.tsx composes UI state, first-party
   customer results, and optional OSM results.
2. aevo-go/src/features/map/use-map-discovery.ts builds a TanStack Query key
   from committed bounds, zoom, filters, mode, and sort.
3. aevo-go/src/lib/customer-api.ts requests /api/v1/public/discovery,
   /api/v1/public/search, and suggestions.
4. aevo-hub/packages/db/src/customer-discovery.ts contains the observed
   bounds validator, RPC adapter, mapping, facets, and legacy scan fallback.
5. aevo-hub/supabase/migrations/20260921075000_open_source_map_spatial_discovery.sql
   contains the current PostGIS RPC and index.

### TraceDee

1. aevo-go/src/lib/customer-api.ts requests the TraceDee place picker.
2. aevo-hub/packages/db/src/tracedee.ts reads tracedee_places and maps
   TraceDeePlaceSummary.
3. Trace/stop/post migrations reference tracedee_places.id.
4. aevo-core-api exposes a public Feed route and projection-gated Place
   routes; Feed item IDs remain distinct from canonical Place IDs.

### Business/booking

1. public.stores identifies an organization-owned Store.
2. public.customer_store_profiles is an opt-in public projection.
3. public.venues and public.bookable_resources own booking capability in
   Hub's current booking schema.
4. aevo-play maintains a separate venue/court domain with no observed Place
   foreign key.
5. Neither booking path can currently be treated as a canonical Place source;
   the additive Core relationship table is the intended link boundary.

## Contract gap classification

aevo-go/docs/api-gap-list.md documents public discovery, search, suggestions,
store detail, availability, booking, favorites, and TraceDee routes. The Go
client retains typed calls for the legacy paths and now has a separate typed
Core Place adapter. Core exposes projection-gated `/api/v1/public/places/*`
handlers; the legacy discovery adapter remains the default until deployment
data and route smoke tests pass.

The remaining deployment check is a gate, not a reason to restore a Hub gateway:

- verify the deployed/branch route owner;
- verify the Edge origin and route matrix;
- record whether the current Hub DB adapter is authoritative or transitional;
- only then enable the canonical Go Place adapter by environment/geo flag.

## Ownership rules for the next phase

| Decision | Owner |
| --- | --- |
| Browser ingress and request ID | aevo-edge-gateway |
| Public Place read contract | aevo-core-api facade |
| Place identity/provenance/verification truth | Approved canonical data owner recorded by MAP-000 |
| Async source ingestion/conflation | aevo-background-worker or named worker owner |
| Admin review UX/BFF | aevo-admin |
| Map rendering and interaction state | aevo-go |
| Feed/Trace/booking capability producers | Existing domain owners, linked by canonical Place ID |
| Database migration lifecycle | Core API/Infrastructure owner under LOCAL_DEVELOPMENT.md |

## Files intentionally not treated as Place authority

- aevo-go/src/features/map/osm-service.ts: client enrichment/demo adapter.
- aevo-go/src/features/map/map-page.tsx: UI composition.
- public.customer_store_profiles: public Store projection, not a universal
  Place registry.
- public.tracedee_places: TraceDee place domain, not yet cross-module
  canonical.
- aevo-play venue tables and aevo-pos store tables: business capability
  domains, not map identity.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

The repository boundary now includes an explicit cross-domain relationship
decision. The canonical geographic identity is Place. Organization, Business,
Branch, Store, Venue, and BookableResource retain their owning domain IDs and
must link to Place through typed relationships. The relationship cardinality
and migration owner are MAP-000 decisions, not implicit behavior in a client
adapter.

The public read boundary must be split conceptually even if the initial Core
implementation shares a repository:

- Map overlay: a bounded lightweight marker/cluster feed;
- Search/Nearby: ranked, filtered, paginated Place summaries;
- Detail: canonical Place plus separately fetched capability data.

This preserves the existing Core/Edge ownership and does not introduce a new
API gateway.
