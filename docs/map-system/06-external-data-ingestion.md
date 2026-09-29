# External Place data ingestion

Status: source contract and review-only dry-run normalizer implemented; no
source import, provider selection, or migration authorized

## Current state

The only concrete external-data implementation found is
aevo-go/src/features/map/osm-service.ts. It supports mock and remote Overpass
modes, bounds the query span, caches in memory for five minutes, parses a
small tag subset, and removes simple duplicates. This is useful for a UI
experiment, but it is not a durable registry pipeline:

- no immutable source snapshot is stored;
- no import run or source version is recorded;
- no source-link row exists;
- no field-level provenance exists;
- no source disappearance policy exists;
- no reviewer/conflation audit exists;
- the browser can create a different merged result on every viewport.

## Recommended pipeline

~~~text
Source adapter
  -> raw snapshot / payload hash
  -> license and schema validation
  -> normalized external record
  -> candidate Place/source link
  -> conflation scoring
  -> automatic link or review queue
  -> approved canonical revision
  -> public discovery projection
  -> cache/tile invalidation
~~~

The pipeline must be idempotent by provider, dataset version, external ID,
and payload hash. Re-running an import should not create duplicate Places or
duplicate revisions.

## Source adapter contract

Each adapter should declare:

- provider and dataset name;
- retrieval method and endpoint/snapshot URI;
- source version/date;
- terms/license and required attribution;
- supported territory and category mapping;
- rate/size limits;
- external ID format;
- raw record parser version;
- retry and backoff policy;
- deletion/takedown behavior;
- owner and alert route.

The adapter returns normalized records, not canonical Places. A normalized
record should contain:

- external identity;
- names and alternate names;
- category candidates;
- coordinates and geometry precision;
- address/area candidates;
- contact/website values where legally usable;
- source tags and source URLs;
- observed timestamp;
- source confidence/quality flags.

## Source-specific posture

### OpenStreetMap and Overpass

OSM should be treated as community-maintained source data with explicit
attribution and ODbL review. Overpass is a query service, not the Place
registry. Production must not make every map pan a direct Overpass request.

Use one of:

- a reviewed periodic extract/import;
- a compliant provider with an agreed caching/usage contract;
- a server-side adapter with strict bounds, rate limits, and short-lived
  enrichment behavior.

Keep source IDs and OSM tags for traceability; do not present an OSM record as
verified Aevo business data without an independent claim/review.

### Overture Places

Overture is a possible candidate feed for broad coverage, but source-level
license and attribution must be recorded. Because the Places theme aggregates
multiple providers, the adapter must retain provider/source metadata rather
than collapsing all records into one “Overture” authority.

Use only after a legal/source packet is accepted under
04-open-data-and-licensing.md.

### Business-owned and open-government data

Business imports are scoped to an organization/branch and must not override
independent canonical data without a field ownership and verification rule.
Government/open datasets require territory-specific terms and attribution.

## Import run lifecycle

Suggested states:

~~~text
CREATED -> FETCHING -> VALIDATING -> NORMALIZING -> CONFLATING
         -> REVIEW_REQUIRED -> PUBLISHING -> COMPLETED
         -> FAILED / PARTIAL / ROLLED_BACK
~~~

Each run records counts for fetched, invalid, normalized, matched,
unmatched, auto-linked, review-required, published, skipped, and failed
records. A partial run is not silently treated as a complete snapshot.

## Update and disappearance policy

When a source record changes:

1. store the new raw hash/version;
2. compare normalized fields;
3. identify which fields are source-owned and not protected;
4. create a proposed revision;
5. auto-apply only within approved confidence/field rules;
6. send protected or conflicting changes to review;
7. invalidate the Place projection only after approval.

When a source record disappears:

- do not immediately delete the canonical Place;
- record last observed time and source status;
- mark the source link stale/retired;
- compare independent sources and business verification;
- create a closure/review candidate after a configurable grace period;
- retain the Place if another authoritative source or verified business link
  supports it.

## Provenance and rollback

Every imported field needs a source and revision pointer. A rollback should
be able to:

- disable one import run;
- revert unprotected fields from that run;
- restore the prior Place revision;
- remove only the affected source link;
- invalidate affected discovery caches;
- preserve later manual/business revisions;
- produce an Admin audit record.

Do not implement rollback as “delete all records from a provider” without
field-level revision checks.

## Operational controls

- bounded batch size and concurrency;
- provider-specific circuit breaker;
- exponential backoff with jitter;
- dead-letter queue for malformed records;
- per-source metrics and import dashboards;
- no user-provided URL fetching without SSRF-safe validation;
- raw payload retention limits;
- encryption/access control for raw payloads where they contain personal data;
- dry-run mode that creates no canonical revision;
- approval gate for source and license changes.

## Initial scope recommendation

For the first production slice:

1. keep OSM remote mode as an explicit development option;
2. do not ingest Overture or another broad provider until source ownership and
   licensing are approved;
3. implement the source-link/provenance contract before adding a second
   provider;
4. start with a small, replayable import fixture for Bangkok/Chiang Mai;
5. make all automatic links reversible and reviewable.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

External ingestion must preserve non-point geometry when a source provides
polygons or multipolygons. Derive displayPoint, labelPoint, and
boundingGeometry with an explicit method and provenance; do not silently
collapse a large Place to an arbitrary point.

Geocoding is not an external Place importer. A forward/reverse geocoder may
produce a temporary address result used by Admin/business/community workflows,
but only approved Place canonicalization can create or revise a Place.
Provider adapters must carry caching, storage, attribution, commercial-use,
privacy, and quota policy in their source packet. Public Nominatim is not an
assumed SLA.

Source updates must be evaluated field by field. A source may update an
unprotected alternate name while being rejected for a protected geometry,
verified website, or moderation state. The source revision and canonical
revision remain separate.
