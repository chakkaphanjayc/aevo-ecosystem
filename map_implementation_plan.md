You are acting as a Senior Staff Geospatial Engineer, Backend Architect,
Data Engineer, and Platform Engineer for the Aevocado ecosystem.

Your task is to analyze the CURRENT LOCAL POLYREPO workspace first and
design the Map, Place Registry, Business Verification, Community Place
Submission, and Place Discovery architecture.

DO NOT implement or modify production code yet.

This phase is:

DISCOVERY
→ CURRENT MAP AUDIT
→ DATA OWNERSHIP ANALYSIS
→ GEOSPATIAL ARCHITECTURE
→ PLACE DOMAIN DESIGN
→ EXTERNAL DATA INGESTION DESIGN
→ VERIFICATION / MODERATION DESIGN
→ IMPLEMENTATION PLAN
→ TEST PLAN

Stop after documentation and wait for approval.

==================================================
CONTEXT
==================================================

Aevocado contains multiple independently deployed repositories,
including approximately:

- aevo-go
- aevo-hub
- aevo-play
- aevo-pos
- aevo-admin
- aevo-core-api
- aevo-edge-gateway
- aevo-contracts
- aevo-background-worker
- aevo-infrastructure

Do not assume exact repository names or ownership.

Discover the actual workspace.

Existing Feed architecture research indicates that PostGIS geography,
a GiST spatial index, and bounded public place discovery already exist.

Verify those findings against the actual local code.

==================================================
PRODUCT GOAL
==================================================

Design a Map / Places platform that supports:

1. An open-data basemap.

2. Public POIs / places from open datasets.

3. A canonical Aevocado Place registry.

4. Businesses using Aevocado products linked to canonical Places.

5. Verified business Places.

6. Product capabilities visible from Places, for example:

- booking
- queue
- POS/store integration
- Play
- other future capabilities

7. Users can submit new Places.

8. Users can suggest edits to existing Places.

9. New Places and significant edits require review before becoming
   canonical public data.

10. aevo-admin is the long-term moderation and operational control plane.

11. Map discovery supports:

- viewport/bounding-box queries
- search this area
- nearby
- categories
- filters
- clustering
- Place detail
- integration with Trace
- integration with Feed

12. Architecture must scale without coupling all business logic to map tiles.

==================================================
CRITICAL ARCHITECTURE PRINCIPLE
==================================================

Treat these as separate concerns:

A. BASE MAP

Roads, buildings, water, administrative areas, land, transport, etc.

B. PLACE REGISTRY

Canonical real-world locations and POIs.

C. BUSINESS LAYER

Organization/branch ownership and Aevocado product capabilities.

D. COMMUNITY DATA

User Place submissions, edits, reports, and evidence.

E. DISCOVERY

Map viewport/search/nearby/ranking APIs.

Do not combine all of these into one table or one tile dataset.

==================================================
LOCAL REPOSITORY DISCOVERY
==================================================

Inspect all relevant repositories.

Search for:

map
maps
maplibre
mapbox
leaflet

place
places
store
stores
branch
branches
venue
location
locations
poi

latitude
longitude
lat
lng
geometry
geography
postgis

ST_DWithin
ST_Intersects
ST_Contains
ST_MakeEnvelope
ST_AsMVT

viewport
bbox
bounding box
nearby
search this area

osm
openstreetmap
overture
nominatim
geocode
reverse geocode

booking
reservation
queue
pos
play

verified
verification
claim
business claim

submission
suggest edit
report
moderation

RLS
policy
migration
Supabase
Core API

MapLibre
vector tile
MVT
PMTiles

Inspect:

- database schemas
- migrations
- APIs
- repository classes
- frontend map components
- map providers
- current search
- current discovery
- current store models
- business branches
- organization relationships
- booking integration
- Feed Place contracts
- admin moderation
- current environment variables
- existing infrastructure

==================================================
CURRENT STATE DOCUMENTATION
==================================================

Document the current implementation with exact file paths.

Identify:

- current Place/store source of truth
- current Store vs Place semantics
- existing geographic types
- existing spatial indexes
- existing discovery APIs
- current map renderer/provider
- current tile provider
- current geocoding provider
- current map search flow
- current branch/place linkage
- current booking/place linkage
- current admin Place capabilities
- current moderation capabilities

Clearly mark:

EXISTING
TRANSITIONAL
PROPOSED
FUTURE

==================================================
CANONICAL PLACE MODEL
==================================================

Design a canonical Aevocado Place entity.

Do NOT use an external map identifier as the primary key.

Use an Aevocado-owned stable Place ID.

A Place may link to multiple source records such as:

- OpenStreetMap
- Overture/GERS
- future public datasets
- manually created Aevo data

Design external-source linkage separately from canonical Place identity.

Analyze possible concepts such as:

places

place_source_links

place_names

place_addresses

place_categories

place_versions

place_aliases

place_merges

Do not create these tables blindly.

Derive the final schema from existing migrations and conventions.

==================================================
PLACE VS BUSINESS
==================================================

Place and Business must be separate domain concepts.

A Place describes a real-world location.

A Business Branch may reference a Place.

Analyze and design:

Business
↓
Branch
↓
Place

or the equivalent that fits the existing domain.

A Place must be usable even if no Aevocado business owns it.

A Business should be able to claim/link an existing Place instead of
creating a duplicate.

==================================================
CAPABILITIES
==================================================

Do not make booking/POS/queue state authoritative columns of the
canonical Place record unless current architecture strongly requires it.

Design a capability/projection mechanism such as:

Place
↳ booking capability
↳ queue capability
↳ Play capability
↳ POS capability

The owning service remains authoritative.

Map/Place APIs may expose a read projection.

Document freshness, failure behavior, and ownership.

==================================================
VERIFIED BUSINESS FLOW
==================================================

Design a Place claim flow.

Conceptually:

Business searches for Place
→ Claim Place
→ verification evidence
→ review / automatic verification where safe
→ approved
→ branch linked to canonical Place
→ Place displays verified-business state

Define precisely what "verified" means.

It should represent verified control/association with the business,
not an endorsement of business quality.

Design:

- permissions
- evidence
- conflicts
- competing claims
- revoked claims
- business closed state
- audit history

==================================================
USER PLACE SUBMISSION
==================================================

Users must NOT directly INSERT canonical public Places.

Design:

User
→ PlaceSubmission
→ validation
→ duplicate/conflation candidates
→ Admin review
→ create or merge or reject

Submission may include:

- name
- category
- coordinates
- address
- photos/evidence
- website
- phone
- opening information
- notes

Design abuse prevention:

- rate limiting
- duplicate submission suppression
- banned/suspended accounts
- evidence requirements
- submission history

Do not build reputation scoring unless justified,
but leave a clean path for it later.

==================================================
USER PLACE EDITS
==================================================

Users must not directly overwrite canonical Place data.

Design field-level change proposals.

Examples:

- moved location
- changed name
- closed permanently
- new phone
- new website
- opening hours changed
- category correction

Review should show:

OLD VALUE
PROPOSED VALUE
SOURCE/EVIDENCE
NEARBY SOURCE DATA

Approved changes should create auditable Place versions.

==================================================
CONFLATION / DUPLICATE DETECTION
==================================================

Treat conflation as a first-class subsystem.

Design candidate matching using combinations of:

- geographic distance
- normalized name
- multilingual names
- category
- address
- phone
- website/domain
- external source IDs

Define confidence levels.

Example conceptual outcomes:

high confidence → suggested match
medium confidence → admin review
low confidence → suggested new Place

Do not automatically merge irreversible ambiguous matches in V1.

Design explicit:

merge
unmerge/rollback
alias/redirect

When Place A is merged into Place B:

- old ID should remain resolvable where possible
- references must not silently break
- Traces/Saves/Posts should migrate or redirect safely

==================================================
EXTERNAL MAP DATA
==================================================

Analyze using open datasets such as:

- OpenStreetMap
- Overture Maps

Do not assume one data source is sufficient for all features.

Separate:

basemap source
POI source
address source
Place identity source

Design ingestion as:

external dataset
→ source snapshot/staging
→ normalization
→ source record
→ matching/conflation
→ canonical Place

Never blindly overwrite verified Aevo data with external updates.

==================================================
PROVENANCE
==================================================

Every significant Place field should have a traceable origin.

Design field-level or version-level provenance.

Possible sources:

external
business_verified
admin
community_approved
system

Define precedence rules per field category.

For example, booking information should come from the booking system,
not external POI data.

Do NOT use one global precedence rule for every field.

==================================================
OPEN DATA LICENSING
==================================================

Audit licensing requirements.

Document:

- attribution requirements
- OpenStreetMap ODbL implications
- Overture source licenses
- data redistribution implications
- whether data may be merged into the Aevo canonical database
- required provenance
- attribution UI requirements

Do not treat "open source/open data" as automatically license-compatible.

==================================================
BASEMAP
==================================================

Evaluate the current renderer.

Prefer an open renderer such as MapLibre if compatible with the repo.

Evaluate:

OpenStreetMap/OpenMapTiles-style data
→ Planetiler or equivalent
→ MVT/PMTiles
→ object storage/CDN
→ MapLibre

Do NOT introduce self-hosted global tile infrastructure in V1 unless
current traffic or requirements justify it.

The architecture must support switching tile providers without a client
release where practical.

Do not rely on community public OSM tile infrastructure as a production
SLA backend.

==================================================
MAP DISCOVERY API
==================================================

Design map viewport discovery.

Request context should include appropriate values such as:

bbox
zoom
category/filter
query
open-now if supported

Enforce:

- maximum bbox
- maximum results
- zoom-sensitive density
- rate limits

Avoid unbounded spatial scans.

Use existing PostGIS infrastructure where appropriate.

Evaluate:

GiST/SP-GiST indexes
ST_Intersects
ST_DWithin
keyset queries

based on actual schema/query plans.

==================================================
SEARCH THIS AREA
==================================================

Design UI/API behavior for:

map move
→ map becomes dirty
→ "Search this area"
→ query current viewport
→ update Place overlay

Avoid firing expensive server queries continuously for every camera frame.

Define debounce and explicit-search behavior.

==================================================
CLUSTERING
==================================================

Design Place rendering by zoom level.

Conceptually:

low zoom
→ region/count clusters

medium zoom
→ clustered Places

high zoom
→ individual Places

Evaluate:

- server-side cluster
- PostGIS aggregation
- H3/geohash
- vector-tile clustering
- client clustering

Choose based on expected scale and existing stack.

Do not add another geospatial database unless required.

==================================================
VECTOR TILE SCALE PATH
==================================================

V1 may return JSON Place summaries for bounded viewport queries.

Design a migration path to public Place overlay vector tiles when
density/traffic justifies it.

Conceptually:

GET /map/tiles/{z}/{x}/{y}.mvt

Public tile content should remain cacheable.

Do NOT put user-specific properties such as:

saved
followed
personal booking state

into globally cached public tiles.

Design separate visible-item hydration for personalized state.

==================================================
SEARCH ARCHITECTURE
==================================================

Keep:

Map viewport discovery
Search
Nearby
Feed recommendation

as separate query paths over shared canonical Place data.

Evaluate existing PostgreSQL capabilities first:

- full-text search
- pg_trgm
- PostGIS

Do not introduce Elasticsearch/OpenSearch solely for future scale.

Document the scale signal that would justify a dedicated search engine.

==================================================
PLACE TAXONOMY
==================================================

Audit existing categories.

Design one canonical Aevo Place taxonomy.

Map external source taxonomies into Aevo taxonomy.

Do not expose raw OSM tags or provider categories as the primary
application taxonomy.

Design:

external category
→ mapping
→ Aevo category

Support multilingual display names.

==================================================
AEVO ADMIN
==================================================

aevo-admin must become the Map/Place control plane.

Design interfaces for:

- Place search
- Place detail/editor
- user submissions
- user edit requests
- reports
- business claims
- verified businesses
- duplicate suggestions
- merge workflow
- Place history
- source links
- source ingestion status
- category mappings
- import failures
- audit logs

The reviewer should have a map-based comparison UI showing:

- proposed pin
- existing nearby Places
- external source data
- current canonical value
- proposed value

Admin actions must be server-authorized and audited.

==================================================
MAP / FEED INTEGRATION
==================================================

The Feed architecture already treats Place as a first-class entity.

Use the same canonical Place IDs in:

- Feed
- Map
- Search
- Trace stops
- Saves
- business branches
- booking links

Do not create Feed-only Place IDs.

Define cross-repository contracts.

==================================================
TRACE INTEGRATION
==================================================

Analyze current Trace stops.

Determine whether Trace stops reference:

- canonical Place
- arbitrary coordinate
- both

Design a clean model supporting both.

When a coordinate later becomes a canonical Place,
allow safe linking without breaking the Trace.

==================================================
API CONTRACTS
==================================================

Design proposed contracts based on current API conventions.

Possible concepts:

GET /api/v1/places/map
GET /api/v1/places/search
GET /api/v1/places/{id}

POST /api/v1/place-submissions
POST /api/v1/places/{id}/change-proposals

POST /api/v1/business/place-claims

Admin:

GET /admin/place-submissions
POST /admin/place-submissions/{id}/approve
POST /admin/place-submissions/{id}/reject

POST /admin/places/{id}/merge
POST /admin/place-claims/{id}/approve

Do not force these route names if existing Core conventions differ.

Define:

auth
authorization
validation
idempotency
rate limits
errors
audit

==================================================
DATABASE SCALING
==================================================

Analyze expected high-growth tables such as:

- external source records
- place versions
- submissions
- map/search events
- reports
- ingestion history

Do not partition transactional Place tables prematurely.

For each spatial query:

capture EXPLAIN plans
verify indexes
test realistic density

==================================================
CACHING
==================================================

Design separate caching for:

- basemap
- public map tiles
- Place summaries
- category metadata
- nearby queries
- source imports

Do not cache personalized Place state globally.

Define invalidation for:

- place edit
- business verification
- closure
- moderation
- merge
- capability change

==================================================
FAILURE MODES
==================================================

Design graceful behavior for:

- external map source unavailable
- source import failure
- PostGIS query timeout
- tile source failure
- business capability service unavailable
- moderation unavailable
- Admin review backlog
- stale source data
- duplicate matching failure

Public Place data should continue operating from the last known valid
canonical database when external ingestion fails.

==================================================
TESTING
==================================================

Create a detailed test strategy covering:

- spatial query correctness
- bounding-box limits
- near-antimeridian cases if applicable
- duplicate Place detection
- multilingual name matching
- Place merge redirects
- submission approval
- rejected submissions
- competing business claims
- revoked verification
- deleted/closed Places
- RLS/authorization
- user cannot directly mutate canonical Place
- Admin audit
- external source update
- source disappearance
- verified field is not overwritten by external import
- Trace reference survives Place merge
- Feed reference survives Place merge
- booking capability freshness
- map clustering
- map viewport load tests
- tile cache invalidation
- attribution/license UI

==================================================
LOAD TESTS
==================================================

Determine realistic targets from current product usage.

Test scenarios such as:

dense Bangkok/Chiang Mai viewport
large zoomed-out viewport
search this area
category filtering
high map pan/zoom activity
popular Place detail
source ingestion while users query

Measure:

p50
p95
p99

Postgres connections
rows scanned
spatial index usage
response sizes
cache hit rates

==================================================
MIGRATION PLAN
==================================================

Do NOT perform a big-bang rewrite.

Design phases.

Suggested conceptual sequence:

MAP-000
Resolve current Place/store ownership.

MAP-001
Define canonical Place contract and IDs.

MAP-002
Normalize existing Store/Place data.

MAP-003
Build bounded Place Discovery API.

MAP-004
Introduce open basemap/provider abstraction.

MAP-005
External source ingestion and source links.

MAP-006
Business Branch ↔ Place linking.

MAP-007
Verified Place claims.

MAP-008
Community Place submissions and edits.

MAP-009
aevo-admin review/moderation UI.

MAP-010
Conflation/merge workflows.

MAP-011
Caching/clustering/vector-tile scaling.

MAP-012
Production rollout/observability.

Do not accept these tasks blindly.

Adjust them after repository inspection.

==================================================
OUTPUT
==================================================

Create:

docs/map-system/

00-current-state.md
01-repository-map.md
02-target-architecture.md
03-place-domain-model.md
04-open-data-and-licensing.md
05-basemap-and-tiles.md
06-external-data-ingestion.md
07-conflation-and-deduplication.md
08-business-verification.md
09-community-submissions.md
10-map-discovery-and-postgis.md
11-search-and-nearby.md
12-admin-control-plane.md
13-feed-trace-booking-integration.md
14-caching-and-scaling.md
15-security-and-privacy.md
16-observability-and-operations.md
17-testing-strategy.md
18-migration-plan.md
19-open-questions.md

Also create:

map-implementation-plan.md

==================================================
IMPLEMENTATION PLAN
==================================================

Every task must include:

ID
Title
Goal
Why
Affected repositories
Existing code reused
Files/modules likely affected
Database change
API change
Dependencies
Implementation steps
Tests
Acceptance criteria
Risks
Rollback
Complexity S/M/L/XL

Cite exact local file paths.

==================================================
IMPORTANT RULES
==================================================

Do not implement yet.

Do not create migrations.

Do not install dependencies.

Do not invent a new Place system before understanding the current Store,
Branch, Trace and public discovery schemas.

Do not use external IDs as Aevo primary IDs.

Do not allow user submissions to directly mutate canonical Places.

Do not allow external imports to overwrite verified Aevo data blindly.

Do not put business realtime state into static basemap tiles.

Do not add a dedicated search engine unless current evidence justifies it.

Do not add another public API gateway.

Reuse current PostGIS infrastructure where appropriate.

Use aevo-admin as the long-term operational control plane.

Treat provenance, deduplication, auditability, and rollback as production
requirements.

==================================================
FINAL RESPONSE
==================================================

After analysis provide:

1. Current Map/Place architecture
2. Existing reusable components
3. Current architectural problems
4. Recommended canonical Place model
5. Recommended basemap stack
6. Recommended external Place sources
7. Data provenance/licensing risks
8. Business verification architecture
9. Community contribution architecture
10. Admin architecture
11. PostGIS/query design
12. Feed/Trace/Booking integration
13. V1 scope
14. Things explicitly deferred
15. Revised MAP-000... task sequence
16. Dependency graph
17. Major risks/blockers
18. Questions requiring a product/engineering decision

Then STOP.

Do not implement production changes until explicitly approved.
