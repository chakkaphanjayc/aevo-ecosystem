# Location and nearby discovery

ARCHITECTURE REVIEW REVISION

## Current state

tracedee_places has a PostGIS geography point and a GiST index for visible places. Public store discovery already validates bounded map boxes and uses a spatial path. The TraceDee feed currently accepts area but does not use a geospatial radius or distance feature. Aevo Go has a map-specific discovery query and MapLibre UI, but the live explore Feed is not location-ranked.

## Location context contract

The client may send one of:

- a named area selected by the user;
- a bounded map box for map discovery;
- a coarse location bucket and radius for nearby Feed;
- no location.

Do not require precise location for For You. When device location is used, send the minimum precision needed for the surface, retain a coarse bucket for telemetry, and do not place raw coordinates in cursors, logs, or analytics events.

Geo radius and distance thresholds are runtime-tunable only through bounded, validated Feed configuration. Coordinate precision, storage, retention, and provider/network settings remain infrastructure/privacy-controlled.

## Nearby generator

The future Nearby generator should:

1. validate bounds/radius and maximum search area;
2. resolve the server-side location policy and consent state;
3. use ST_DWithin or a bounded box plus distance ordering against a read model;
4. filter moderation, public visibility, block/mute, and duplicate Place identity;
5. return distance as a safe presentation field only when product policy permits;
6. cap results and use deterministic distance/tie ordering.

Do not use client-supplied distance or latitude/longitude as a rank score. Do not query an unbounded world-wide spatial range.

## Schema and indexing

Keep one canonical geometry representation. If customer_store_profiles still stores latitude/longitude while tracedee_places stores geography, the adapter must normalize them and define precedence for conflicting values. A future migration can add a generated geography column to the public store projection, but this should be coordinated with migration ownership.

Required indexes for scale:

- visible/limited partial GiST on geography;
- visibility/area/published-at keyset index;
- public store enabled plus geometry index;
- generated/search fields used by the nearby query;
- item projection index on surface eligibility and materialized time.

## Privacy and degradation

Location is optional and must not become an identity key. If geospatial lookup is unavailable, Nearby should show a clear degraded/empty state or fall back to area-based deterministic discovery; it must not pretend results are nearby. For You can continue without location.
