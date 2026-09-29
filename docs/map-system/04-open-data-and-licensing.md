# Open data and licensing

Status: source and licensing design; legal review required before ingestion

## Principle

Basemap data, external Place records, business-owned facts, and user content
have different licenses and obligations. The ingestion pipeline must preserve
provenance and attribution per field/source. A global “open data” flag is not
enough.

The following are engineering recommendations, not legal advice. Terms and
provider policies must be rechecked before production ingestion, redistribution,
or caching.

## Candidate source matrix

| Source | Intended use | License/terms implication | Recommended V1 posture |
| --- | --- | --- | --- |
| OpenStreetMap | Basemap data and selected public POI enrichment | OSMF states OSM data is ODbL; attribution and license notice are required; share-alike obligations can apply to derivative databases | Use through a compliant tile/data provider or a reviewed import pipeline; keep OSM attribution visible and store source metadata |
| Overpass API | Development/enrichment query endpoint | Public service has operational usage limits and is not an Aevo-owned production data store | Keep remote mode opt-in for development; do not make direct browser calls the production architecture |
| Overture Places | Optional broad POI candidate source | Overture documentation says Places is published under CDLA Permissive 2.0 and Apache 2.0 by source and contains no OSM data; source-level attribution still matters | Consider batch snapshots after license/legal review and source-specific notice implementation |
| Business-provided data | Claimed/verified business facts | Contract, privacy, and business permission control use; may be proprietary | Treat as business-owned fields with explicit organization scope and claim audit |
| Community submissions | User-contributed edits/evidence | Aevo terms, consent, privacy, moderation, and potential third-party content rights | Store author/evidence metadata; publish only approved fields/content |
| Government/open datasets | Address/category/geometry enrichment | Varies by jurisdiction and dataset; attribution and use restrictions differ | Add only through a source adapter with recorded license and territory |

## References used for this design

- OpenStreetMap Copyright and License: https://www.openstreetmap.org/copyright
- Open Data Commons ODbL: https://opendatacommons.org/licenses/odbl/
- Overture attribution and licensing:
  https://docs.overturemaps.org/attribution/
- Overture Places guide and source-level license description:
  https://docs.overturemaps.org/guides/places/

The OpenStreetMap page requires credit to OpenStreetMap and its contributors
and a clear indication that the data is available under ODbL. Overture's
Places guide distinguishes Places from OSM-derived Base data; this distinction
must not be lost when source records are joined in a canonical registry.

## Attribution requirements as product behavior

The Map surface should reserve a stable attribution area that can show:

- map/tile provider attribution;
- OSM attribution where OSM-derived data is rendered or shown;
- Overture and upstream source notices where required;
- a link to the applicable license/terms;
- data freshness or “reported by” notice where a non-Aevo record is shown.

Attribution must remain visible in MapLibre loading, loaded, error, and
accessible-list states. It must not be hidden behind an interaction that is
unavailable on keyboard or screen reader surfaces.

## Provenance requirements

Each imported value or record must be traceable to:

- provider and dataset name;
- provider external ID;
- source URL, when permitted;
- license identifier and attribution text;
- retrieval timestamp;
- snapshot/import run ID;
- raw payload hash or immutable raw object reference;
- normalization version;
- conflation decision and reviewer;
- current publication status.

If a field is combined from more than one source, store the contributing
sources and the selection reason. Do not claim a canonical field is sourced
from OSM if it was manually verified from a business document.

## Data separation rules

1. Keep raw source payloads separate from canonical Place fields.
2. Keep OSM-derived/base data separate from Aevo-created business metadata.
3. Do not merge a provider's license into the license of user-authored text.
4. Do not redistribute a source dataset unless its license and provider terms
   permit it.
5. Keep a deletion/takedown path for source records and user content.
6. Record whether an output is a database, a derivative database, a produced
   work, or an API response; obtain legal review for ODbL boundary questions.
7. Preserve source attribution through API, Map UI, cached payloads, exports,
   screenshots/static output, and Admin review tools as applicable.

## Tile provider rules

Map data license and tile service terms are separate. Before selecting a tile
provider, verify:

- commercial use and traffic limits;
- cache/proxy restrictions;
- attribution placement;
- style JSON and sprite/glyph licensing;
- telemetry/privacy behavior;
- offline/device use;
- SLA and fallback terms;
- whether OSM or Overture attribution is inherited.

aevo-go/src/lib/env.ts currently accepts a style URL and defaults to
OpenFreeMap's dark style. That is a useful development default, not a
production legal approval. Provider configuration should be reviewed as a
deployable policy, not only a client environment variable.

## Ingestion acceptance gate

No new external source should be enabled until the source packet contains:

1. license and terms URL;
2. allowed use, storage, redistribution, and derivative-database analysis;
3. required attribution text and UI placement;
4. retention/deletion policy;
5. source contact/takedown process;
6. field-level provenance mapping;
7. rate/usage limits and operational owner;
8. rollback plan for records imported under a withdrawn source.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

### Geocoding is a separate provider boundary

Add a provider abstraction for:

- forward geocoding;
- reverse geocoding;
- address lookup;
- coordinate-to-address.

A geocoder result is temporary address/geographic evidence, not a canonical
Place. The allowed path is:

~~~text
geocoder result
  -> temporary address/geographic result
  -> discovery or Place submission
  -> approved canonical Place workflow
~~~

Provider review must cover caching, storage, attribution, commercial use,
request limits, privacy, data retention, and downstream redistribution.
Public Nominatim must not be treated as an implicit production SLA. The
provider adapter should fail closed when terms, quota, or attribution metadata
are unavailable.
