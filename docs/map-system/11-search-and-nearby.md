# Search, nearby, and viewport discovery

Status: bounded Core Search/Nearby routes and signed cursors implemented;
dedicated search infrastructure remains deferred

## Current client behavior

aevo-go already models several Map filters in
aevo-go/src/features/map/contracts.ts and serializes them into URL state in
aevo-go/src/features/map/map-url-state.ts. The Map query separates camera
bounds from committed/search bounds and uses TanStack Query cancellation in
aevo-go/src/features/map/use-map-discovery.ts.

The Go client also declares:

- public discovery;
- public search;
- typed suggestions;
- public Store detail;
- TraceDee place search.

These are documented in aevo-go/docs/api-gap-list.md and requested in
aevo-go/src/lib/customer-api.ts. Their route owner and implementation must be
verified before the canonical Place API is built.

## Query modes

### Viewport discovery

Triggered by an explicit search/commit action or a product-defined initial
load. It uses the committed bbox, zoom, filters, and cursor. Camera movement
alone must not create unbounded network traffic.

### Search this area

The UX should make this action explicit:

1. user pans/zooms;
2. client marks camera bounds as dirty;
3. user activates Search this area;
4. client commits normalized bounds in the URL;
5. server returns results for that exact bbox and filters.

The current UX direction already follows this separation. Preserve it in the
canonical API.

### Text discovery

Text queries should search approved public fields:

- canonical and alternate names;
- area/neighborhood;
- category label/slug;
- approved address tokens.

Do not search raw source payloads, private business fields, evidence, or
moderation notes.

### Suggestions

Suggestions are short, debounced, bounded reads. They should return typed
entities such as Place, category, area, and verified business—not an
unbounded list of raw source names. Suggestions must be safe for anonymous
users and rate limited.

### Nearby

The user explicitly grants device location. The request contains a bounded
point/radius or a server-normalized bbox. The server:

- validates coordinate/radius limits;
- applies public visibility;
- returns distance only when allowed;
- does not persist the raw location by default;
- does not use it to infer a permanent home/work profile;
- applies the same cursor and field allowlists as viewport discovery.

For a user who denies location, fall back to a manually selected area or
current map center without pretending it is device location.

## Ranking policy

V1 should use deterministic, explainable ordering:

1. query relevance when text is present;
2. distance when nearby is requested;
3. approved public/verified quality signals;
4. capability filters;
5. stable canonical Place ID tie-breaker.

Do not import generic provider ratings into Aevo ratings. Do not rank a
business higher merely because it paid or claimed a Place unless the product
policy explicitly approves and labels that behavior.

Personalization, taste matching, saved/following filters, and Feed ranking
should remain separate policy inputs. The server must establish whether the
actor/session is allowed to use those filters.

## No dedicated search engine in V1

The current evidence supports bounded PostGIS/relational reads, not a new
search engine. Start with:

- indexed exact/category/area filters;
- a reviewed text-search strategy on canonical public fields;
- keyset pagination;
- bounded facets;
- query and payload limits;
- EXPLAIN/load evidence.

Consider a search engine only if measured requirements show that PostGIS and
the relational text strategy cannot meet latency, typo-tolerance, language,
or scale goals. Any future index must remain a projection, not a new source
of Place identity.

## Geocoding

No authoritative geocoder is identified in the inspected workspace. Do not
silently add one. Separate future geocoding into:

- address-to-point input for a business/admin workflow;
- reverse-geocoding for display;
- privacy and provider-term review;
- confidence/provenance on the returned address;
- human confirmation before publishing a canonical coordinate.

User-submitted points may be approximate and should not be upgraded to a
precise address without evidence.

## Public query contract safeguards

- bounded limit and payload bytes;
- maximum bbox span by zoom;
- maximum nearby radius;
- normalized category/price/filter IDs;
- no raw query language or SQL;
- no client-selected tenant/source/verification scope;
- signed query/cursor fingerprint where paging is supported;
- response field allowlist;
- request ID and rate-limit headers;
- explicit truncation/facet behavior.

## Failure behavior

| Failure | User-facing behavior | Data rule |
| --- | --- | --- |
| invalid bounds | typed 4xx with correction-safe message | do not query |
| too-large area | typed 4xx or bounded truncation | do not run an unbounded scan |
| text timeout | retry/cancel with stale list if safe | never fabricate results |
| location denied | manual-area/map-center fallback | no location persistence |
| stale projection | show freshness/stale label where required | no false live claims |
| provider/geocoder down | keep canonical search working | external source is non-authoritative |

## Acceptance evidence

The search/nearby design is ready for implementation only after:

- exact route owner and API version are recorded;
- anonymous/authenticated behavior is explicit;
- language/name fixture coverage exists;
- bounds/radius limits are tested;
- cursor stability is tested under inserts/updates;
- privacy review approves device-location handling;
- PostGIS/text query plans and load results are attached.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

### API split

Search and nearby are not the map overlay:

- Map uses a lightweight bounded marker/cluster response.
- Search uses richer ranked/filterable Place summaries and pagination.
- Nearby uses the same ranked summary contract with a bounded point/radius.
- Detail hydrates canonical geometry/address and links to live capability.

The final paths should follow Core conventions but preserve the conceptual
separation of map, search, nearby, and detail.

### Geocoding boundary

Define a server-owned GeocoderProvider interface with forward geocode, reverse
geocode, address lookup, and coordinate-to-address operations. Provider results
are temporary and must contain provider, source version, confidence,
attribution, observed time, and terms metadata. They can prefill a submission
or support discovery, but cannot create a canonical Place automatically.

Do not use public Nominatim as an assumed production SLA. A provider adapter
must enforce caching/storage/commercial-use/request-limit/privacy rules and
must fail safely when attribution or quota policy is unavailable.

### Thailand-first search model

Search metadata should expose semantic fields rather than UI labels:
country, administrative_area_1, administrative_area_2, locality, neighborhood,
street, house_number, postal_code, formatted_address, localized names, and
alternate names. Thai and English names are first-class variants. V1 uses
deterministic Unicode normalization, aliases, and curated abbreviations; it
does not introduce ML search.

Required fixtures include Thai names, English names, aliases, Unicode
normalization, Thai/English transliteration, and common abbreviated variants.
