# Personalization, discovery signals, and Feed flow

Audit date: 2026-09-26
Status: design proposal only; no schema, runtime, or Admin implementation was started

## Design rules

1. Explicit current intent outranks historical taste.
2. Session preference is short-lived context, not an opaque permanent profile.
3. Long-term taste is explainable, confidence-aware, decayed, and derived from
   meaningful evidence rather than raw impressions.
4. Geographic context distinguishes the selected destination, map viewport,
   coarse current location, frequent area, and saved area.
5. Safety and canonical eligibility are hard gates before score and after
   hydration.
6. `PLACE` and `TRACE` use different raw features and are calibrated before
   mixed ranking.
7. Re-ranking and module quotas protect diversity and discovery breadth.
8. Public reason codes explain decisions without exposing private vectors,
   exact location, moderation state, or internal source names.
9. Config is typed, bounded, versioned, auditable, rollbackable, and supports
   `OFF`, `SHADOW`, and `LIVE`.
10. V1 is deterministic. ML, embeddings, vector retrieval, and LLM-generated
    shelves are out of scope until data quality and outcome measurement justify
    them.

## Current versus target graph

### Current local implementation

```text
Go URL/request
  -> Core FeedSessionContext
  -> trace-v1 + place-v1 SQL generators
  -> feature inputs (quality, popularity, affinity, relationship, geo, penalty)
  -> FeedRankingPipeline
  -> stable order/cursor
  -> FeedDiversitySelector
  -> typed TRACE/PLACE hydration
  -> Go card + async Core event
```

Already present locally:

- request/session snapshot, fixed candidate cutoff, signed cursor and item token;
- server candidate generators for TRACE and PLACE;
- status/visibility/moderation/block/mute eligibility in the data path;
- quality/taste/popularity/relationship/geo/penalty inputs;
- deterministic serving and personalized shadow score in Core;
- diversity/exploration selector;
- typed public reason codes and event intake/outbox/consumer health;
- client URL filters, map surface, booking links, and explicit degraded states.

Not yet a separate production stage or contract:

- explicit intent versus session versus profile context objects;
- named discovery event confidence taxonomy;
- entity-specific feature calibration contract;
- candidate-source V2 beyond `trace-v1`/`place-v1`;
- server-owned module selector/shelves;
- community-evidence projection with confidence/verification;
- media eligibility in public hydration;
- discovery outcome evaluation and canary report.

### Target graph

```text
                         ┌────────────────────────┐
                         │  explicit request       │
                         │  query/area/vibe/time   │
                         │  map/availability       │
                         └────────────┬───────────┘
                                      │ strongest context
                         ┌────────────▼───────────┐
                         │ User Context Resolver   │
                         │ intent + session + taste│
                         │ + geographic context   │
                         └──────┬─────────┬───────┘
                                │         │
                  ┌─────────────▼─┐   ┌──▼────────────────┐
                  │ Candidate V2   │   │ entity features   │
                  │ Place/Trace    │   │ quality/evidence  │
                  │ sources        │   │ availability      │
                  └───────────────┘   └─────────┬─────────┘
                                └───────┬────────┘
                                        ▼
                              ┌─────────────────┐
                              │ Eligibility     │
                              │ moderation      │
                              │ privacy         │
                              │ block/mute      │
                              └────────┬────────┘
                                       ▼
                              ┌─────────────────┐
                              │ Entity-specific │
                              │ calibration     │
                              └────────┬────────┘
                                       ▼
                              ┌─────────────────┐
                              │ Contextual      │
                              │ deterministic   │
                              │ score           │
                              └────────┬────────┘
                                       ▼
                              ┌─────────────────┐
                              │ Re-rank         │
                              │ diversity/seen  │
                              │ novelty/quota   │
                              └────────┬────────┘
                                       ▼
                              ┌─────────────────┐
                              │ Module Selector │
                              │ shelves + order │
                              └────────┬────────┘
                                       ▼
                              ┌─────────────────┐
                              │ Public hydration│
                              │ entity + safe   │
                              │ evidence/reason │
                              └────────┬────────┘
                                       ▼
                                  Go Explore
```

## User context model

### Current intent

Current intent is request-derived and should be strongest. Inputs already
represented or partially represented by the active Go UI include:

- selected area (`area`);
- text query (`q`);
- category/mode and booking date/party (`category`, `mode`, `date`, `party`);
- vibe (`vibe`), currently a client/demo filter that must become a typed
  server facet before affecting live ranking;
- map viewport/nearby mode from Trace Map;
- availability-oriented phrases such as “tonight”, “near me”, or
  “work-friendly” after they are parsed into bounded canonical facets.

**Rule:** current intent is not automatically persisted as a permanent taste
preference. The user may explicitly save a preference or area; otherwise it is
request/session context only.

### Session preference

Session preference is a bounded, short-lived view of what the person is doing
now. It can be derived from the existing Feed session/event path without a new
distributed state system:

```text
FeedSessionContext
  + request facets
  + session seed/cutoff/cursor
  + bounded recent signals
      - recent Place/Trace opens
      - area/vibe changes
      - map movement/commit
      - booking opens
      - repeated category exploration
      - saves and explicit hides
```

Recommended storage boundary:

- request-local: query, area, vibe, date, party, map viewport, `nearby`;
- signed/opaque Feed session: bounded recent entity IDs and event summaries if
  pagination consistency needs them;
- client-only UI: unsaved/hidden optimistic state until a server dismissal
  contract exists;
- no permanent database row for every filter change;
- no precise coordinates in the profile or analytics context when a coarse
  area/distance bucket is enough.

The default session lifetime should be governed by existing session/cursor
expiry and product privacy policy, not an invented hard-coded number in this
audit. Session signals must decay faster than long-term affinities.

### Long-term taste profile

The local schema already has `tracedee_taste_affinities`, profile/expertise
scores, and quality projections. They are a useful base, but the Feed should
expose a clearer discovery-profile contract without forcing a new table yet.

Conceptual dimensions are derived from the existing taxonomy, not invented
fields:

```text
dimension_type: TOPIC | AREA | CATEGORY | PACE | BUDGET | SERVICE_TYPE
dimension_key: canonical taxonomy key
affinity: signed bounded value
confidence: evidence confidence
evidence_count: qualifying events only
last_evidence_at / decay_version
profile_version
```

Profile update rules:

- strong positive: completed/verified experience, booking completed, save;
- medium positive: qualified open, map/directions, booking open, useful review
  interaction;
- weak positive: long dwell or photo/review view only when quality thresholds
  are met;
- neutral/very weak: impression;
- negative: explicit hide/not interested, repeated qualified skip only after
  abuse-resistant inference;
- apply time decay and retain evidence count/confidence;
- require minimum evidence before showing a “because you like …” reason;
- never treat a single impression or a business-generated signal as a strong
  taste fact.

The first implementation should reuse the existing affinity projection or add
a versioned projection beside it, rather than introduce a `user_discovery_profile`
table solely because the concept has a name. The data-model decision is
recorded in `23-community-evidence-and-ugc.md`.

### Geographic context

These contexts must remain distinct:

| Context | Meaning | Ranking use | Retention rule |
| --- | --- | --- | --- |
| Selected area | User-chosen destination/area | Strong current intent | Request/session; persist only if explicitly saved |
| Map viewport | Current map exploration window | Candidate filter and local relevance | Operational/request context; do not retain raw path by default |
| Coarse current location | Approximate current area/geohash | Nearby candidate eligibility | Coarse bucket only in events/profile |
| Frequent area | Derived repeated exploration | Long-term affinity with confidence | Derived projection; deletion must remove/rebuild |
| Saved area | Explicit user preference | Strong preference when no conflicting query | User-owned saved preference |
| Travel destination | Planned trip/context | Session or saved-trip intent | Explicit product feature/consent only |

Operational map queries may use PostGIS and bounded coordinates. Personalization
and analytics should use area, geohash, or distance bucket. Exact coordinates
must not cross the public Feed reason/event contract.

## Discovery signal taxonomy

The event names below are a design taxonomy, not a request to add them now.
Each event must be classified separately for ranking value, analytics value,
privacy, retention, sampling, idempotency, and source authenticity.

| Signal class | Examples | Ranking interpretation |
| --- | --- | --- |
| Strong positive | `BOOKING_COMPLETED`, `TRACE_COMPLETED`, `SAVE_PLACE`, `SAVE_TRACE`, verified `DIRECTIONS_OPENED` | High-confidence evidence of useful intent/experience; abuse and verification checks required |
| Medium positive | `PLACE_OPEN`, `TRACE_OPEN`, `BOOKING_OPEN`, `MAP_OPEN`, `REVIEW_EXPAND`, `TRACE_STARTED` | Useful contextual interest; position and accidental-open bias must be measured |
| Weak positive | `PHOTO_VIEW`, useful review interaction, qualified dwell | Supporting evidence only; never enough alone for strong taste |
| Very weak | `DISCOVERY_IMPRESSION` | Exposure/measurement, not interest; must not dominate profile updates |
| Strong negative | `HIDE`, `NOT_INTERESTED`, block/mute | Suppression/negative preference with explicit user intent; hard safety relations stay separate |
| Cautious negative | repeated qualified skip, stale availability rejection | Use only with minimum evidence, decay, and no punitive inference from missing clicks |
| Trust/quality | report, fake-engagement anomaly, duplicate, correction, verified visit | Eligibility, confidence, or guardrail input; never a popularity boost |

Existing local events partially cover this taxonomy: Core Feed events include
impression/open/click/save/share/Trace start/complete/place open/booking click;
TraceDee activity includes saves, follows, journey/completion, rating,
post/comment/helpful/report, and outbox state. Booking completion and
directions are not yet a single Feed semantic contract. The next contract batch
must map each existing source instead of emitting duplicates.

## Candidate Generation V2

Candidate generators remain server-owned and independently budgeted. The
following names are proposals for source boundaries, not implementation claims:

### Place sources

- `NearbyPlaceGenerator` — bounded PostGIS/area query.
- `IntentMatchedPlaceGenerator` — query/category/vibe/time/availability facets.
- `TasteMatchedPlaceGenerator` — long-term affinities with minimum confidence.
- `SimilarToSavedPlaceGenerator` — saved Place/Trace taxonomy and area.
- `NewPlaceGenerator` — recently public/updated, quality-safe, not just newest.
- `CommunityEvidencePlaceGenerator` — trusted evidence/confidence threshold;
  not raw review count.
- `RevisitPlaceGenerator` — prior qualified experience with a freshness/novelty
  guard.
- `BookablePlaceGenerator` — only when a bounded booking projection is healthy;
  never a per-candidate live availability fan-out.

### Trace sources

- `NearbyTraceGenerator`;
- `IntentMatchedTraceGenerator`;
- `TasteMatchedTraceGenerator`;
- `SavedTraceRelatedGenerator`;
- `NewTraceGenerator`;
- `CompletedTraceRelatedGenerator`;
- `CommunityEvidenceTraceGenerator`.

`PostGenerator`, `ViralPostGenerator`, and `TrendingCreatorGenerator` are not
first-class For You sources. A post or creator can contribute evidence,
provenance, or a secondary Following surface after policy and contract review.

### Generator contract

Every generator should return typed internal metadata:

```text
sourceId, sourceVersion, entityType, canonicalEntityId,
candidateTimestamp, sourceReason, featureHints,
budgetUsed, latency, degraded, failureCode
```

The source name, raw score, moderation state, and private feature vector never
cross the public contract. Generator failure is isolated; remaining safe
sources continue.

## Entity-specific calibration

Raw Place and Trace numbers are not comparable. The calibration boundary maps
each entity into a bounded common feature space before contextual scoring.

```text
TRACE raw                         PLACE raw
  completion ratio                  rating/review confidence
  save/follow/remix                 save/open/directions
  stop count/duration               booking/availability evidence
  Trace quality                     Place quality
        \                              /
         -> typed calibrated features <-
              intent_match
              taste_affinity
              geo_relevance
              community_confidence
              quality
              freshness
              novelty
              negative_feedback
              optional availability
```

Calibration requirements:

- bounded [0,1] or signed bounded values with explicit missingness;
- entity-specific confidence and freshness;
- no raw review count, follower count, or completion count directly mixed;
- minimum evidence thresholds before confidence affects rank/reason;
- source/version attached internally for evaluation;
- missing feature stays neutral or is excluded, not silently interpreted as
  high quality.

## Contextual scoring and re-ranking

The score is conceptual and intentionally has no production weights here:

```text
base relevance
  = intent match
  + session fit
  + long-term taste fit
  + geographic fit
  + calibrated quality
  + community confidence
  + freshness/novelty
  + safe availability fit
  - explicit negative feedback
```

The existing Core config remains the mechanism for typed, bounded, versioned
values. New fields should be added only after a contract and evaluation report
define their meaning, missingness, minimum, maximum, default, and rollback.

Re-ranking is a separate stage. Rules are classified as:

| Rule kind | Examples |
| --- | --- |
| Hard constraint | ineligible moderation state, blocked/muted creator, private/unresolved canonical identity, explicit user hide |
| Soft penalty | same category/area/business group repetition, stale evidence, recently seen entity, same Trace lineage |
| Quota/coverage | minimum Place/Trace mix, module inventory, exploration share, area/category breadth |
| Tie-break | deterministic session seed, canonical ID, candidate cutoff |

No “sort by one score and stop” implementation satisfies the revised product
direction.

## Module and shelf architecture

### Initial modules

Derive modules from available inventory and current UI rather than creating all
possible shelves:

1. `FOR_YOU` — mixed Place/Trace discovery entities, intent-first.
2. `NEAR_SELECTED_AREA` — selected area or bounded nearby context.
3. `BECAUSE_YOU_SAVED` — only when saved entity taxonomy is sufficient.
4. `NEW_AND_USEFUL` — new public entities with quality/evidence floor.
5. `BOOKABLE_NOW` — optional, only with healthy bounded availability data.
6. `CONTINUE_TRACE` — active/saved Journey/Trace continuation.
7. `COMMUNITY_FAVORITES` — evidence confidence and anti-manipulation floor.

`TRENDING_TRACERS` is not an initial primary module. Creator identity can be a
line in a Trace card: “Trace by Mina P. · local contributor · Ari”.

### Server-owned Module Selector

```text
context:
  explicit intent, time bucket, map/area, session signals,
  profile confidence, candidate inventory, availability health
       |
       v
eligible module rules + typed config + quotas
       |
       v
ordered modules with discovery entity IDs and safe reason codes
       |
       v
public hydrator adds evidence, booking CTA, creator provenance
```

Modules must degrade independently:

- no availability -> omit `BOOKABLE_NOW`, retain Place/Trace;
- no profile -> use intent/session/local modules;
- no evidence projection -> serve entity without evidence, mark internally
  degraded, never invent a rating/review;
- low inventory -> merge to a safe baseline rather than emptying discovery.

Time-of-day can be a bounded feature or rule (“lunch nearby”, “evening Trace”)
only when the underlying Place/booking data supports it. Do not use an LLM to
invent modules or availability.

## Explainability contract

### Public reason codes

Proposed safe codes, localized in Go:

```text
BECAUSE_VIBE
BECAUSE_CATEGORY
NEAR_SELECTED_AREA
NEAR_CURRENT_COARSE_AREA
SIMILAR_TO_SAVED
NEW_IN_AREA
POPULAR_IN_AREA
AVAILABLE_NOW
BASED_ON_COMPLETED_TRACE
BECAUSE_YOU_VISITED
CONTINUE_YOUR_TRACE
COMMUNITY_CONFIDENCE
```

The current public codes (`FOLLOWING_TRACER`, `TASTE_MATCH`, `POPULAR`,
`NEW_TRACE`, `NEARBY_PLACE`, `POPULAR_PLACE`) remain compatibility inputs until
the new contract is versioned. The client may map them to revised copy, but
Core must not reveal raw scores, exact location, private affinity keys,
moderation status, report evidence, other users’ behavior, or internal source
names.

### Reason eligibility

“Because you like X” requires minimum profile confidence and a current entity
match. “Available now” requires a fresh, canonical availability result. “Based
on your visit” must not expose transaction/purchase details. If evidence is
missing, use a neutral reason or no reason.

## Config and Admin graph

The existing Core config lifecycle remains the authority. The discovery
extension is typed fields, not arbitrary expressions:

```text
Admin /go/feed
  -> app-scoped ADMIN session
  -> permission + CSRF + idempotency
  -> typed draft
  -> validate bounds/schema/policy
  -> audit + immutable revision
  -> publish expected-active-version
  -> Core active snapshot
  -> FeedSessionContext snapshot
  -> generators/ranker/reranker/module selector
```

Suggested typed sections:

```text
personalization:
  mode: OFF | SHADOW | LIVE
  profileVersion
  decayVersion
  minimumEvidence
  intentPrecedence
  intentMatchWeight (bounded 0.05–0.8)

sources:
  place/trace source enablement
  source budgets and timeout bounds
  minimum quality/evidence floors

ranking:
  bounded feature weights
  entity calibration versions
  freshness/novelty bounds

diversity:
  category/area/business/lineage/seen limits
  exploration quota
  module quotas

evidence:
  review confidence floor
  verified-experience policy version
  public highlight limits

safety:
  eligibility freshness bound
  emergency source/module disable
  place/category/region UGC mode

measurement:
  event sampling, shadow report version, guardrail thresholds
```

Admin must not edit SQL, ranking code, raw table/RPC names, secrets,
moderation classifiers, or unbounded infrastructure values. High-impact
changes retain hold-to-confirm, reason, optimistic version, and audit.

## Objective and measurement boundary

The Feed may use events as features, but ranking and product success are not
the same metric. Define three separate families:

### Discovery outcomes

- qualified Place/Trace open;
- save Place/Trace;
- map open/directions/menu open;
- booking open/started/completed;
- Trace started/completed;
- review expand/helpful/useful interaction;
- valid return/revisit signal.

### Trust and quality guardrails

- unsafe or disallowed content exposure;
- report/hide/not-interested rate;
- false/duplicate/repetitive content rate;
- review manipulation/fake-visit anomalies;
- entity/source concentration and rich-get-richer drift;
- latency, degraded responses, empty safe inventory;
- reason correctness and privacy leakage.

### Operational metrics

- generator latency/error/degraded counts;
- eligibility freshness;
- feature/projection freshness;
- event acceptance/duplicate/dead-letter;
- module fill rate;
- booking dependency health.

Do not turn likes, comments, shares, or follower growth into direct production
weights merely because they are easy to count.

## Rollout modes

```text
OFF
  deterministic baseline serves

SHADOW
  deterministic baseline serves
  personalized score/modules are computed and logged in bounded evaluation
  no public reason or ordering mutation

CANARY
  small approved cohort/traffic slice
  guardrails and outcome comparison required

LIVE
  personalized path may serve within typed config/kill switch
  deterministic fallback remains immediately available
```

The local Core already has a ranking mode and shadow score concept. The new
direction requires applying the same discipline to context, calibration,
re-ranking, modules, evidence, and public reasons as a versioned bundle.

## Failure policy

| Failure | Required behavior |
| --- | --- |
| Personalization profile unavailable | deterministic discovery using explicit intent/session/local quality |
| Session signal unavailable | explicit request intent + safe local discovery |
| One generator timeout | continue with remaining generators; mark internal degraded |
| Eligibility projection stale/unknown | fail closed for affected UGC/source; keep valid discovery entities |
| Evidence projection unavailable | serve Place/Trace without evidence block; never fabricate |
| Booking availability unavailable | omit `BOOKABLE_NOW`; link to canonical booking only if safe |
| Module inventory too small | merge into baseline; do not repeat same entity endlessly |
| Event intake unavailable | serve Feed; retry asynchronously; do not block request |
| Config unavailable | last-known-good validated snapshot or deterministic kill switch |
| Cursor/session invalid | bounded 4xx and restart path; no arbitrary browser recomposition |

The baseline discovery path must remain useful without personalization,
evidence, booking, or analytics dependencies.
