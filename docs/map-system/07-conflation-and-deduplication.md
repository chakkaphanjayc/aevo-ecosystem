# Place conflation and deduplication

Status: matching policy and bounded resolver foundation implemented; no
automatic merge implementation authorized

## Current UI dedupe is not registry conflation

aevo-go/src/features/map/osm-service.ts currently de-duplicates OSM records by
provider ID, normalized name plus less than 15 metres, or distance less than
15 metres. This is suitable for reducing visual noise in one client response.
It is not sufficient to decide that two records are the same real-world Place:

- two businesses can share a building entrance;
- one business can have multiple branches within 15 m;
- a mall, shop, and venue can share coordinates;
- names can differ by language, abbreviation, or brand;
- stale coordinates can be wrong by more than the threshold;
- a Place may not have a name in one source.

The UI rule must remain an adapter detail until replaced by server-owned
conflation.

## Matching inputs

Candidate matching should use multiple independent signals:

- exact provider identity, when the same source record is re-seen;
- normalized canonical/alternate names;
- localized names and transliterations;
- category compatibility;
- address tokens, house number, road, area, postal code;
- point distance and geometry type;
- phone/website domain where use is permitted;
- business/store/branch identifiers supplied by an authorized owner;
- opening hours and other corroborating attributes;
- source freshness and source reliability;
- existing human decisions and prior redirects.

No single signal should auto-merge a public Place.

## Name normalization

The matcher should produce comparison keys without changing the stored display
value:

1. Unicode normalization;
2. case folding;
3. whitespace and punctuation normalization;
4. conservative script-aware tokenization;
5. alternate-language/token mapping;
6. known business suffix normalization;
7. abbreviation and transliteration variants with a recorded algorithm version.

Thai, English, and other local-language names must be compared as variants,
not treated as unrelated strings. Transliteration is a candidate signal only;
it must not replace the user's preferred display name.

## Confidence bands

Use explicit confidence bands with a deterministic score version:

| Band | Action |
| --- | --- |
| High | Auto-link the source record to an existing Place only when no protected field conflicts and the decision is reversible |
| Medium | Create a conflation review task with candidate pair and evidence |
| Low | Keep source record unmatched or create a separate candidate Place |
| Conflict | Never auto-merge; require Admin decision |

Thresholds should be calibrated from labelled local examples, not chosen only
from intuition. Store the score explanation and model/rule version.

## Spatial rules

Distance must account for context:

- dense urban POI: small point threshold plus address/category evidence;
- mall/market/large campus: parent/child location relation, not one flat
  point identity;
- rural or low-quality coordinate: larger candidate window but stronger name
  and address requirements;
- line/polygon sources: derive a display point with geometry provenance;
- antimeridian or invalid bounds: normalize before distance calculations.

A common distance threshold must not be used as the identity rule for every
category.

## Parent and child Places

The model should support distinct Places that are spatially related:

- shopping centre -> shop;
- sports complex -> court/venue;
- hotel -> restaurant/spa;
- university -> facility;
- market -> stall/tenant.

Use explicit relation types and avoid merging records only because their
coordinates are identical.

## Review experience

An Admin conflation review should show:

- candidate records side by side;
- maps and distance;
- localized/alternate names;
- category and address differences;
- source/license/last-observed metadata;
- protected/verified field markers;
- downstream references (Feed, Trace, Save, booking);
- proposed merge, keep separate, or split actions;
- confidence/rule explanation;
- required reason and optional ticket/evidence.

The review action must be idempotent and audited.

## Merge and split semantics

### Merge

- retain a winning canonical Place ID;
- create a redirect from the losing Place ID;
- retain source links on the target;
- preserve Trace/Feed/Save/submission history;
- reconcile field provenance explicitly;
- invalidate old slug/cache/tile keys;
- notify or expose redirects to clients as appropriate.

### Split

- create new canonical IDs;
- map source links and business links to the correct target;
- preserve historical references to the original where needed;
- require evidence and Admin approval;
- do not silently rewrite published user history.

## Rollback

A merge rollback should be possible while no conflicting edits have made the
state ambiguous. The rollback record must include:

- merge decision ID;
- old and new revisions;
- references moved or resolved;
- source links and field provenance;
- caches/tiles invalidated;
- reason and actor.

If later changes depend on the merge, create a compensating decision rather
than destructive history deletion.

## Test corpus needed

Before enabling auto-linking, build fixtures for:

- Thai/English name pairs;
- diacritics and punctuation;
- malls with multiple tenants;
- two branches of the same brand;
- same point with different categories;
- moved businesses;
- closed/reopened Places;
- missing names;
- stale source coordinates;
- OSM and Overture overlap;
- Store/TraceDee records representing the same Place;
- antimeridian coordinates if global coverage is supported.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

### Geometry-aware conflation

Matching must compare geometry types and containment as well as points:

- a mall/park/airport/university may be a parent polygon;
- a tenant/business unit may be a child point or bounded sub-place;
- same point does not imply same Place;
- parent containment is a relation signal, not an automatic merge;
- display point and canonical geometry are both retained in evidence.

### Redirect-first identity preservation

MAP-010 must publish one canonical redirect resolver. A merge from Place A to
Place B creates a bounded redirect and preserves both IDs for reads,
analytics, and historical audit. Resolver rules are:

1. resolve at most a configured depth;
2. reject loops and conflicting targets;
3. reject new writes using a retired/merged source ID;
4. never resurrect a retired ID;
5. return target plus redirect metadata;
6. support a compensating split/rollback decision.

Foreign references in Feed, Trace, Saves, booking links, and business links do
not need an immediate distributed rewrite. They resolve through the canonical
resolver until background compaction is safe.
