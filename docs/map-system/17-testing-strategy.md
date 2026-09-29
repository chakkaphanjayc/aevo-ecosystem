# Map and Place testing strategy

Status: test plan is active; contract, cursor, resolver, provider, Core,
Admin, and Go tests are implemented, with integration/load gates remaining

## Test principles

Test the domain boundary, not only the map pixels. A successful MapLibre
render does not prove that Place identity, privacy, licensing, RLS, booking
capability, or merge behavior is correct.

Tests must cover:

- deterministic contracts;
- server-side authorization and bounded queries;
- database spatial correctness;
- source provenance and licensing;
- moderation and audit;
- client accessibility/degradation;
- performance under real map interaction.

## Current reusable tests

Existing relevant tests include:

- aevo-go/src/features/map/contracts.test.ts;
- aevo-go/src/features/map/osm-service.test.ts;
- aevo-go/src/features/map/map-search-machine.test.ts;
- aevo-go/src/features/map/map-url-state.test.ts;
- aevo-go/src/lib/customer-api.test.ts;
- aevo-go/src/lib/public-api.test.ts;
- aevo-hub/packages/db/test/customer-discovery.test.ts.

They provide useful URL, bounds, OSM parsing, and request-shape coverage. They
do not yet prove canonical Place identity, DB spatial plans, RLS, claim
verification, conflation, or production route wiring.

## Unit and contract tests

### Bounds and query

- coordinate range validation;
- maximum span by zoom;
- invalid/NaN/infinite values;
- antimeridian strategy;
- nearby radius cap;
- filter allowlists;
- stable query fingerprint;
- signed cursor tamper/expiry;
- keyset ordering and tie-breaker;
- truncation/facet semantics.

### Place model

- canonical UUID generation/non-reuse;
- lifecycle transition rules;
- slug aliases and redirects;
- field provenance;
- protected/verified field conflict;
- source-link uniqueness;
- merge/split compatibility;
- null coordinate exclusion from viewport.

### Conflation

- Thai/English/multilingual names;
- Unicode/punctuation/abbreviation;
- same-building different businesses;
- same-brand separate branches;
- distance/category/address scoring;
- high/medium/low/conflict bands;
- deterministic rule/version output;
- no automatic merge on a single weak signal.

### Contracts

- public Place summary/detail response;
- Feed/Trace placeId field;
- capability freshness/booking route;
- legacy ID namespace;
- redirect response;
- Admin claim/submission/conflation command;
- error/request ID/idempotency shape.

## Database integration tests

With representative fixtures, verify:

- inside/outside bbox results;
- boundary points;
- nearby ST_DWithin distance;
- category/area/text filters;
- no-bbox policy;
- zoomed-out truncation;
- dense urban index use;
- antimeridian split behavior if supported;
- exact result ordering and cursor continuation;
- concurrent updates do not duplicate or skip unexpectedly;
- source import/projection update visibility.

Use EXPLAIN/EXPLAIN ANALYZE evidence in a controlled environment. Assert
index usage and rows scanned where the query plan is stable enough to test.

## RLS and authorization tests

Prove that:

- anonymous users see only public visible projection fields;
- authenticated users cannot read private claim/evidence data without scope;
- organization A cannot read or mutate organization B's claim/business link;
- a user cannot directly mutate canonical Place;
- source import jobs cannot bypass protected-field policy;
- Admin permissions are separate from organization membership;
- service-role credentials never reach the browser;
- CSRF and idempotency are enforced on browser mutations;
- audit records exist for privileged decisions.

## Source and ingestion tests

- source schema validation;
- malformed/oversized payload handling;
- license metadata required before enablement;
- import idempotency;
- retry/dead-letter behavior;
- source record update;
- source disappearance/grace period;
- verified field not overwritten;
- import rollback preserves later manual edits;
- attribution survives API/Map/List output.

## Moderation and workflow tests

- new submission approval/rejection;
- partial field approval;
- needs-info and appeal;
- duplicate suggestion;
- competing business claims;
- revoked verification;
- closed/deleted/merged Place;
- Admin audit and rollback;
- private evidence access and deletion;
- abuse/rate limiting.

## Client and accessibility tests

- MapLibre load/error/unsupported WebGL;
- list fallback contains the same canonical IDs;
- keyboard and screen-reader access to filters/results/attribution;
- mobile peek/half/full sheet states;
- URL restore/share of filters and selected Place;
- search-this-area dirty/committed state;
- stale response cannot overwrite newer query;
- cluster expansion/select behavior;
- tile/style outage while data remains available;
- no booking action shown for non-bookable external data.

Use the existing Aevo Go tests and design-system/accessibility conventions;
keep browser calls at the API boundary.

## Integration and end-to-end tests

Test the full chain:

~~~text
Go -> Edge -> Core -> Place projection
Admin -> BFF -> Edge/Core -> command/audit
Trace/Feed -> canonical Place resolver
Map -> capability/booking boundary
worker -> source snapshot -> review -> projection -> cache
~~~

Include merge/redirect flows across every consumer. A user should be able to
open an old Place link and receive a safe redirect without a broken Trace or
booking history.

## Load tests

Scenarios:

- dense Bangkok and Chiang Mai viewport;
- large zoomed-out viewport;
- search this area;
- category/price/availability filters;
- high pan/zoom activity;
- popular Place detail;
- concurrent ingestion/projection refresh;
- cache cold/warm;
- capability service slow/unavailable.

Measure p50/p95/p99, database connections, rows scanned, index use, response
size, cache hit rate, projection age, and error/cancellation rate. Agree
targets from actual product traffic before declaring pass/fail.

## License and attribution tests

- OSM attribution visible in loaded/error/list states;
- source-specific notices are present;
- license links are correct;
- tile/provider terms are not hidden by responsive layout;
- external source records keep license/provenance metadata;
- export/static output, if introduced, has the required notice.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

Add the following fixtures and assertions:

- point Place;
- polygon/multipolygon Place;
- Place inside a parent Place;
- multiple Businesses at one Place;
- same business name at nearby distinct branches;
- Thai and English aliases, Unicode normalization, and common abbreviations;
- reverse-geocoder result does not become canonical automatically;
- map overlay truncation/density/payload budget;
- marker/list canonical-ID consistency;
- capability badge versus live availability separation;
- merge redirect across Feed, Trace, Saves, business links, and booking links;
- redirect loops, multi-hop cap, and merged-ID write rejection;
- public projection rebuild, stale version, failed rebuild, and rollback;
- field-level provenance conflict and verified-field protection;
- source/provider/geocoder attribution and quota behavior.

Contract tests should assert that Map overlay, Search/Nearby, and Detail can
evolve independently while retaining the same canonical Place identity.
