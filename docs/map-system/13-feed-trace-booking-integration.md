# Feed, Trace, Save, and Booking integration

Status: cross-module contract, Core Detail integration, opt-in Core Feed
integration, and compatibility boundary implemented; downstream reference
migration remains gated

## Current integration state

The workspace has multiple place-like identifiers:

- FeedPlaceItem in aevo-core-api/src/Aevo.CoreApi/Contracts/FeedApiContracts.cs
  and aevo-contracts/src/feed.ts;
- tracedee_places.id in TraceDee traces, stops, posts, and place search;
- customer_store_profiles.store_id and public_slug in public discovery;
- store_id, venue_id, resource_id, and court IDs in business/booking domains;
- map StoreMapSummary.slug and source fields in aevo-go.

Feed Place items now carry an optional versioned `placeReference` containing
the explicit legacy namespace/external ID, resolver status, canonical target,
and redirect metadata. Core public Detail uses the same bounded resolver for
canonical URL redirects. Core Feed hydration can query the explicit mapping
and redirect tables when `AEVO_PLACE_REFERENCE_RESOLUTION=true`; the default
remains legacy-safe while target migration evidence is pending.

Trace, Save/favorite, business, and booking handlers still require their own
owner-bound migration and route tests. The Go read-side adapters now consume an
explicit canonical reference when one is present: Feed Place cards and Trace
stop map links use the canonical UUID only in canonical mode, while the legacy
mode continues to use the owning legacy route. No client guesses a canonical ID
from a slug, name, coordinate, or provider ID, and no legacy Save/booking write
is silently redirected to a canonical endpoint that has not been approved.

## Target reference rule

Every cross-module reference should distinguish:

- placeId: canonical Aevocado Place UUID;
- businessId/organizationId: business identity where allowed;
- branchId/storeId: operational business location;
- venueId/resourceId: booking capability identity;
- sourceId/provider: external source identity;
- legacyId: compatibility reference with an explicit namespace.

Do not overload a generic item id or store id to mean all of these.

## Target relationship map

~~~text
Canonical Place
  |-- Feed item subject / candidate
  |-- Trace cover place / stop reference
  |-- Save/favorite target
  |-- Search/Map result
  |-- Business branch relationship
  |-- Booking venue relationship
  |-- Community submission target
  |-- Claim/verification target
~~~

Feed, Trace, Map, Search, and Save should use the canonical Place ID for
identity while keeping their domain-specific IDs. A Trace remains a Trace;
its place stop is a relation, not a duplicate Place record.

## Compatibility sequence

### Feed

Add a versioned Place reference to the Feed contract. For a transition:

- retain the existing item ID for Feed identity;
- add an explicit placeId when the item is about a Place;
- mark legacy IDs and source namespace;
- reject ambiguous mappings rather than guessing;
- update analytics payloads to include both itemId and placeId.

### TraceDee

TraceDee currently owns tracedee_places references. Build a mapping/adapter:

- preserve tracedee place IDs;
- resolve canonical Place ID for reads;
- keep old IDs accepted for a bounded compatibility period;
- migrate new Trace authoring to canonical Place selection only after the
  public Place contract is available;
- preserve stop coordinates for arbitrary waypoints that are not Places.

Trace history must survive a Place merge through redirect resolution.

### Map and Search

Map feature properties and result cards should contain canonical placeId.
Store/branch/venue fields are optional relationship/capability fields.
Selection, URL deep links, and details should resolve canonical slug/ID and
show a redirect when a Place was merged.

### Saves and favorites

Saves should target canonical Place ID, not only a Store slug. Existing
store-slug favorites need a compatibility resolver and a migration policy for:

- mapped public Store;
- unmapped Store;
- merged Place;
- closed Place.

Do not delete a user's historical save merely because a provider record
disappeared.

### Booking

Booking stays authoritative for holds, slots, prices, availability, and
customer eligibility. The Place layer provides:

- a link from Branch/Store/Venue to Place;
- public capability flags;
- booking route/deep link;
- freshness metadata.

The Map must fetch live availability through the booking boundary when the
user opens a booking flow. It must not read booking rows or put slots into
tiles.

### Aevo Play and POS

Aevo Play's venue/court IDs and POS's store/queue IDs remain domain identities.
The integration should add an explicit Place relationship through the owning
service/API, subject to each repository's migration owner. No app should
write canonical Place fields directly.

## Merge impact contract

When Place A merges into Place B:

- Map/Search resolve A to B;
- Feed/Trace references resolve without broken links;
- Save/favorite reads resolve or show a historical target policy;
- booking capability moves only if the business relationship says so;
- analytics retain original IDs plus redirect target;
- submissions/claims re-target or remain historical with an audit link;
- old slug links redirect for a documented period;
- cache/tile keys for A are invalidated.

When a Place closes:

- public visibility/status follows policy;
- historical Trace/Feed content remains understandable;
- booking routes stop claiming capability;
- future claims/submissions can still reference closure history;
- the ID is not reused.

## Contract acceptance

Before implementation:

1. define canonical Place ID field names in aevo-contracts;
2. version Core Feed and public discovery responses;
3. document legacy ID namespaces;
4. add redirect resolution behavior;
5. test Trace and Feed references across merge;
6. test booking capability freshness and revocation;
7. align Admin audit target types.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

### Shared canonical resolver

All cross-product consumers use one bounded resolver for merged/retired Place
IDs. The resolver returns:

~~~text
requestedPlaceId
resolvedPlaceId
redirected
redirectReason
resolverVersion
~~~

It is used by Map, Search, Feed, Trace, Saves, business links, booking deep
links, old URLs, and analytics adapters. It caps hops, rejects loops and
conflicting targets, rejects new writes to retired IDs, and never resurrects
merged IDs. Foreign rows do not require immediate distributed rewrites.

The local Core implementation is `PlaceReferenceResolver`. It covers the
surface vocabulary above, resolves legacy IDs only through explicit mapping
rows, applies the bounded redirect graph, and rejects writes to retired IDs.
It is a pure adapter with no database writes and is not yet connected to the
production Feed, Trace, Save, business, or booking handlers. Wiring remains a
separate gate after deployment-owned mapping, RLS, and route smoke evidence.

### Geometry and capability

Feed/Trace references can point to a polygon/parent Place while preserving
displayPoint for Map. A branch/venue relationship carries capability metadata,
but live slots, current queue, wait time, and inventory are fetched from the
owning service. Static Place summaries and map overlays expose capability
with source/freshness, never live operational state.
