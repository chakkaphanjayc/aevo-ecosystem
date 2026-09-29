# Discovery direction and current-state audit

Audit date: 2026-09-26
Scope: local source, migrations, tests, phase notes, and git state
Audit change boundary: documentation only; no production code, migration apply,
dependency install, or data deletion. A separately authorized implementation
follow-up is recorded at the end of this document and in the root plan.

## Reading guide

This document separates three kinds of statements:

- **LOCAL FACT** — observed in the checked-out repositories or local phase notes.
- **EXTERNAL RESEARCH** — primary/official material used to validate a pattern.
- **RECOMMENDATION** — the proposed product or architecture consequence.

The local workspace is a polyrepo. The root is not itself a Git repository;
the relevant application repositories are nested repositories. Existing dirty
and untracked work was preserved. In particular, `aevo-go`, `aevo-core-api`,
`aevo-admin`, `aevo-contracts`, `aevo-hub`, `aevo-play`, `aevo-pos`, and the
worker contain pre-existing changes or untracked source. This audit did not
reset, clean, stash, delete, or rewrite those changes.

## Product direction

TraceDee / Aevo Go should help a person discover, evaluate, plan, visit, book,
and experience a place or structured route. It is not a generic public
timeline whose main loop is post -> engagement -> follower growth.

```text
                  discovery decision
                         |
  intent -> candidate -> evidence -> plan -> visit/book -> experience
     ^                                                        |
     +---------------------- useful feedback ----------------+
```

The Feed candidate is the discovery entity. Community material is evidence
that increases confidence, relevance, or context for that entity.

```text
PLACE / TRACE                         community evidence
  |                                   - rating/review summary
  |                                   - selected useful review
  |                                   - community photos
  |                                   - verified experience signal
  |                                   - popular aspects / recent tip
  +----------> discovery card <-------+  creator provenance
```

The canonical first-class candidate set proven by the current Core contract is
`TRACE` and `PLACE`. `SERVICE`, `EVENT`, `EDITORIAL_COLLECTION`, and
structured `EXPERIENCE` remain future possibilities only if a canonical owner
and public contract already exist. The audit did not find a reason to invent
Feed-only `SERVICE` or `EVENT` records.

## Repository and ownership matrix

| Repository | Local Feed ownership | Actual evidence | Direction |
| --- | --- | --- | --- |
| `aevo-go` | Explore UI, Feed adapter/event transport, TraceDee details, booking entry points | `src/pages.tsx`; `src/features/discovery/explore-page.tsx`; `feed-adapter.ts`; `src/lib/feed-api.ts`; `src/lib/feed-events.ts`; `src/features/tracedee/trace-dee-detail-page.tsx` | Keep as consumer/presentation layer; no browser ranking or direct Supabase |
| `aevo-core-api` | Public Feed facade, session/cursor, generators, ranking, diversity, hydration, events, Admin boundary | `src/Aevo.CoreApi/Program.cs`; `Data/FeedCandidateGenerators.cs`; `Data/FeedCanonicalDataStore.cs`; `Data/FeedRankingPipeline.cs`; `Feed/FeedFacadeService.cs`; `Feed/FeedSession.cs` | Keep as serving authority; extend behind typed contracts |
| `aevo-contracts` | Shared TypeScript/OpenAPI boundary | Feed route/item/event schemas and tests | Add only intentional discovery contract versions |
| `aevo-hub` | TraceDee canonical Supabase domain and transitional Admin/moderation boundary | `supabase/migrations/20260921090639_tracedee_product_loop_foundation.sql`; contributions, ratings, moderation, lifecycle migrations; `apps/admin/app/routes/moderation.tsx` | Preserve canonical state; name migration owner before changes |
| `aevo-admin` | Long-term privileged Feed config and moderation control plane | `apps/admin/app/routes/go-feed.tsx`; `go-feed-moderation.tsx`; typed Admin API client | Extend typed controls; never expose SQL/service keys |
| `aevo-background-worker` | Feed event forwarding/consumer trigger | `src/index.ts` Feed event accepted/consume path | Extend consumers/projections asynchronously |
| `aevo-play` | Canonical service/venue/availability product surface | inspected repo and booking references | Remain booking/service owner; Feed consumes a projection/contract |
| `aevo-pos` | Operational transaction/order evidence | inspected repo boundaries and existing POS domain | Potential verified-visit source; never duplicate transaction state in Feed |
| `aevo-edge-gateway` | Customer/API routing boundary | existing gateway contracts and deployment docs | Keep public routing; no new browser data authority |
| `aevo-infrastructure` | Runtime/deployment/Pub/Sub/Cloud Run/secrets | existing infrastructure modules | Deployment and observability only; not Admin runtime config |

## Actual current Feed implementation

### Core serving path

**LOCAL FACT.** `aevo-core-api` has a public Feed route at
`/api/v1/public/feed` and a separate event route. `FeedFacadeService` reads a
runtime config/session, generates candidates, ranks them, applies stable order
and `FeedDiversitySelector`, hydrates typed items, then creates a signed next
cursor. `FeedApiContracts.cs` exposes only `FeedTraceItemContract` and
`FeedPlaceItemContract` in the public item union.

The real generators are:

- `TraceFeedCandidateGenerator` (`trace-v1`): published/public traces,
  active creators, area/query/following filters, blocks/mutes, taste/quality/
  popularity/penalty feature inputs.
- `PlaceFeedCandidateGenerator` (`place-v1`): TraceDee places and public
  customer store profiles, active store/organization checks, public-enabled
  profile checks, category/query/area/PostGIS/coarse-location filtering.

The canonical data store filters `TRACE` to `PUBLISHED`, `PUBLIC`, and
`VISIBLE`/`LIMITED` moderation state. `PLACE` filters to
`VISIBLE`/`LIMITED`, active/public source state, and valid category. An unknown
or disallowed row is not hydrated as a public item.

**LOCAL FACT.** The current Core pipeline already has a useful shape for the
new direction, but its semantic stages are not yet separate enough:

```text
current Core
  config/session -> trace-v1 + place-v1 -> common feature score
  -> stable order -> diversity/exploration -> typed public hydration
```

The revised target inserts explicit Eligibility, Entity Calibration,
Contextual Scoring, Re-ranking, and Module Selection stages. This is a
boundary refinement, not a reason to discard deterministic serving.

### Aevo Go live versus demo behavior

**LOCAL FACT.** `aevo-go/src/pages.tsx` exports `ExplorePage()` as the
discovery Explore page and delegates directly to
`src/features/discovery/explore-page.tsx`. The unreferenced legacy Explore
implementation and its legacy Customer Gateway helper were removed in the
controlled cleanup batch; the separate `/traces` and Trace Map compatibility
flows remain intentionally available.

The active page has:

- URL-owned `tab`, `q`, `area`, `vibe`, `category`, `date`, and `party`
  controls;
- `for_you`, `following`, and `nearby` tabs;
- a live `useInfiniteQuery` against `getCoreFeedPage` when
  `customerDataMode === "live"`;
- a demo path using `filterDemoDiscoveryItems` over local traces, places,
  posts, and tracers;
- local hidden/saved/followed/liked/creator-follow state;
- Core Feed events only for live `TRACE`/`PLACE` items with a feed session and
  tracking token;
- selected Trace and selected Post detail panels;
- explicit demo notices and a separate offline/gateway degraded state.

`feed-adapter.ts` converts the live Core union into only `DiscoveryTrace` or
`DiscoveryPlace`. `DiscoveryItemType` still includes `POST` and `TRACER`, and
`demo-discovery.ts` deliberately includes both. That is a compatibility/demo
surface, not evidence that Core serves them as live For You candidates.

The active client still supports generic-looking actions and demo publishing:
`publishComposerDraft` creates a local Trace or Post only in demo mode. In the
live path, Trace/Place save and Trace/Tracer follow actions call existing
server APIs; hide is explicitly session-local because Core has no dismissal
mutation in this slice.

### UI surface map

| Surface | Actual component/path | Current behavior | Discovery assessment |
| --- | --- | --- | --- |
| Explore route | `aevo-go/src/pages.tsx` -> `DiscoveryExplorePage` | Active route is discovery master/detail | KEEP; change semantics, not routing first |
| Plan/search card | `features/discovery/explore-booking-portal.tsx` `ExploreBookingPortal` | “ค้นหาแล้วจองได้ในที่เดียว”, area/date/party/category, live/demo availability copy | KEEP as plan/book surface; reframe as explicit intent input, do not claim slots in Feed |
| Main Feed | `features/discovery/explore-page.tsx` | One central list with For You/Following/Nearby | KEEP; server modules/shelves later, entities only |
| “SHARE YOUR CITY” | `features/discovery/discover-feed-composer.tsx` | Post/Trace composer with body/media/mood/tags/style/visibility; demo local publish | MODIFY; move contribution to context and make top surface “What do you want to discover today?” |
| Discovery Context | `features/discovery/explore-sidebars.tsx` `ExploreContextSidebar` | Area buttons: Bangkok/Ari/Old Town/Thonglor/Sathorn; shortcut links | KEEP; request intent, not silent long-term profile mutation |
| Vibe & Mood | same sidebar | Slow Bar, Quiet Space, Art & Gallery, Work-friendly, Speakeasy | KEEP; explicit session/query signal; taxonomy must be canonicalized |
| Right booking card | `BookablePanel` | Aevo Play links for partner places; demo/live copy | KEEP; server-authoritative booking seam; optional module |
| Trending Tracers | `TrendingTracersPanel` | Creator-first panel, taste-match copy, follow button, featured Trace link | DE-EMPHASIZE; replace with discovery utility, show creator as provenance |
| Community Pulse | `CommunityPulse` | Demo completion/remix/save counts; live empty until Gateway events | MODIFY into evidence summary with confidence and anti-manipulation rules |
| Trace Map | `features/map/map-page.tsx` | URL/filter-owned Place/Trace map and viewport sheet; map moves retain stale results until refresh | KEEP; map viewport/nearby is intent/context, not precise retained profile |
| Trace detail | `features/tracedee/trace-dee-detail-page.tsx` | Live posts/comments, create/edit/delete, report, block/mute, under-review feedback | KEEP as detail/community evidence surface; bound thread depth |
| Store detail/booking | `pages.tsx`, `src/lib/public-api.ts` | public profile, availability, booking hold/confirm/order APIs | KEEP; Feed links to canonical booking/availability only |

### Documented versus actual versus proposed

| Topic | Documented baseline | Actual code audit | Proposed truth |
| --- | --- | --- | --- |
| Universal Feed | Older docs describe a future TRACE/PLACE/POST/TRACER envelope | Core public contract is only TRACE/PLACE; POST/TRACER are client/demo types | Keep public candidates at TRACE/PLACE; evidence remains nested/attached |
| Taste ranking | Docs describe taste projection and SHADOW/LIVE | Core reads taste affinity and uses personalized shadow score; Hub has taste tables | Separate intent/session/taste and keep personalized score SHADOW first |
| Moderation | Docs require eligibility projection/fail-closed | Core query filters canonical states; Admin moderation controlled slice exists | Add media/relevance/authenticity pipeline and propagation before broad UGC |
| Media | `07-media-pipeline.md` proposes media assets and quarantine | Inspected code has URL/array display and demo images; no canonical upload state found | Treat private/quarantine/approved variants as a prerequisite, not current fact |
| Admin | Docs identify aevo-admin as long-term control plane | `/go/feed` and `/go/feed/moderation` now exist; Hub route remains | Extend aevo-admin only; retain Hub route until parity and connected verification |
| Booking | UI exposes booking entry and public APIs exist | Core Feed does not call availability per candidate; Go booking uses holds/confirm | Optional feature/module input via bounded projection; no duplicate booking state |

## Capability current-state matrix

| Capability | Current state | Evidence | Target | Gap | Proposed phase |
| --- | --- | --- | --- | --- | --- |
| Feed facade | Core public route with session/config/cursor | `FeedFacadeService`, `Program.cs` | discovery-owned serving boundary | modules/evidence not public contract | DISCOVERY-001/007 |
| TRACE candidates | real `trace-v1` generator | `FeedCandidateGenerators.cs`, `FeedCanonicalDataStore.cs` | intent/taste/nearby/related sources | source split/calibration | DISCOVERY-005 |
| PLACE candidates | real `place-v1` + store profile source | same Core files; public store profile migration | discovery Place inventory | evidence/availability features | DISCOVERY-005 |
| Generic posts | contextual table/API; demo Feed type | TraceDee contributions; Go `DiscoveryPost`/demo fixtures | evidence/detail only | client vocabulary drift | DISCOVERY-001/009 |
| Creator feed | demo `TRACER`/sidebar; no live Core item | `demo-discovery.ts`; `TrendingTracersPanel` | provenance/secondary follow | creator-primary presentation | DISCOVERY-009 |
| Reviews/ratings | Trace rating first-class; Place aggregate only | `tracedee_trace_ratings`; store profile fields | target-specific reviews/evidence | Place review owner/contract | DISCOVERY-003/007 |
| Comments | depth 0/1, helpful/report/edit/delete | TraceDee migrations/detail page | bounded detail discussion | evidence relevance/Place context | DISCOVERY-003 |
| Media | URL/array display and demo images | Go discovery/store UI; no asset relation found | private/quarantine/approved variants | no media lifecycle | DISCOVERY-003 |
| Moderation | states/reports/audit/Core Admin slice | moderation migrations, FEED-009 sources | text/image/relevance/authenticity gate | connected DB, automation, appeals, propagation | DISCOVERY-003 |
| NSFW policy | no explicit evidence of full classifier/policy | moderation states are generic | no explicit adult/NSFW public UGC | policy and automated media/text enforcement | DISCOVERY-003 |
| Feed config | typed versioned Core/Admin lifecycle | `FeedConfigService`, `/go/feed` | discovery source/rank/module controls | new typed fields/health | DISCOVERY-008 |
| Events | strict Core Feed events + TraceDee activity/outbox | contracts, Core event service, migrations | discovery confidence/outcome taxonomy | semantic mapping/retention | DISCOVERY-001 |
| Session context | request-derived context/cursor | `FeedSessionContext`, Go URL | intent/session/profile separation | bounded recent signals contract | DISCOVERY-002 |
| Long-term preference | taste affinity/quality projections | `tracedee_taste_affinities`, Core SQL | confidence/decay discovery profile | explicit profile contract | DISCOVERY-004 |
| Location context | PostGIS, area, coarse geohash, map viewport | Core geo resolver, map page | selected/current/frequent/saved separation | retention and semantic split | DISCOVERY-002 |
| Candidate generation | two live server generators | `trace-v1`, `place-v1` | V2 source portfolio | more sources and budgets | DISCOVERY-005 |
| Ranking | deterministic plus shadow personalized score | `FeedRankingPipeline.cs` | intent-first calibrated discovery score | explicit context/evidence semantics | DISCOVERY-006 |
| Re-ranking | diversity/exploration selector | `FeedDiversitySelector` | seen/lineage/business/category/area rules | explicit module quotas | DISCOVERY-006/007 |
| Modules | UI sidebars only; no server selector | `ExploreInsightsSidebar` | server-owned discovery shelves | public module contract | DISCOVERY-007 |
| Community evidence | scattered counts/quality/rating/comment data | TraceDee projections and UI | confidence/freshness evidence block | new read model/allowlist | DISCOVERY-003/007 |
| Admin controls | Feed config and moderation routes | `go-feed.tsx`, `go-feed-moderation.tsx` | Personalization/Sources/Modules/Evidence/Safety | typed discovery panels | DISCOVERY-008 |
| Booking integration | canonical availability/hold/confirm APIs | Go `public-api.ts`, Hub booking migrations | optional bookable module/CTA | bounded projection and health | DISCOVERY-005/007 |
| Analytics/experiments | event health/outbox plus bounded read-only discovery evaluation snapshot | FEED-006/007 notes, Core evaluation route, and Admin `/go/feed` panel | causal/session attribution, shadow/canary report | metric ownership/coverage | DISCOVERY-001/010 |

## Domain audit: discovery entities and community

### Canonical concepts found

The TraceDee foundation migration contains first-class:

- `tracedee_places`, `tracedee_traces`, `tracedee_trace_stops`;
- saves, trace follows, tracer follows, remixes, journeys, completions;
- `tracedee_trace_ratings` with one rating per trace/user and optional review
  text/tags;
- `tracedee_posts` with an optional Trace or Place target;
- `tracedee_comment_threads`, `tracedee_comments` with depth limited to 0/1,
  and `tracedee_comment_reactions`;
- content reports, moderation audit, activity events, event outbox,
  idempotency keys, profile/expertise/taste/quality projections;
- block/mute and content lifecycle functions.

`tracedee_create_post` requires a completed journey and a contextual Trace or
Place target. That is materially safer than an unrestricted social post, but
the active demo composer presents it as a generic public Post. The product
boundary should follow the contextual server contract rather than the demo
label.

### Review, rating, and comment boundary

**LOCAL FACT.** Trace review/rating is already a distinct entity
(`tracedee_trace_ratings`) rather than only a comment. Place public profiles
carry aggregate `rating` and `review_count`, but the inspected migrations do
not show a first-class Place review entity equivalent to Trace ratings. Posts
and comments are distinct, and comments are bounded to a root plus one reply.
The inspected model has no standalone `ReviewHelpful` or business-response
entity.

**RECOMMENDATION.** Preserve this separation:

```text
Review / Rating = evaluation of a Place, Trace, or later canonical Service
Comment         = discussion or response attached to a Trace or review context
Photo           = media evidence attached to a Place or Trace
Question        = place-context request for information
Answer          = place-context response
Post            = compatibility/contextual contribution, not discovery candidate
```

Do not rename the existing tables in this audit. A future Place review model
must be decided by the canonical Place owner and must not be created merely to
make the Feed look richer.

### Service/booking audit

The Hub booking migration has canonical `venues`, `bookable_resources`,
operating/special hours, pricing rules, resource blocks, and `bookings`.
Aevo Go calls public availability, booking-hold, hold-confirm, order, and
tracking APIs with idempotency. This proves a booking integration seam, not a
Feed-owned Service entity. The audit did not find enough canonical evidence to
add `SERVICE` or `EVENT` as Feed item types.

The eventual seam is:

```text
Aevo Play / Hub booking authority
  -> bounded public availability/eligibility projection
  -> optional Feed feature/module input
  -> canonical booking route
```

No per-card synchronous availability fan-out is allowed in a Feed request.

## Generic Post/social audit

| Piece | Live/demo/API state | Product value | Risk | Decision and migration path |
| --- | --- | --- | --- | --- |
| `tracedee_posts` | Canonical table; create API is journey-scoped and Trace/Place-targeted | Field notes and contextual experience | Can drift into timeline behavior; no media relation | KEEP as contextual evidence; rename UI language later without deleting data |
| Go `DiscoveryPost` type | Live adapter does not produce it; demo fixtures do | Test/demo coverage and compatibility | Makes a generic Post look like a first-class Feed entity | DEPRECATE AS LIVE CANDIDATE; retain fixture until UI migration is complete |
| Main composer `Post` mode | Demo-only `publishComposerDraft`; local state | Demonstrates interactions | “Publish Post in Feed” contradicts product boundary | MODIFY to “add a useful note/review/tip” within a Place/Trace context |
| Live Trace detail community | APIs for posts/comments, edit/delete, report, block/mute; under-review status | Strong evidence and trust loop | Thread sprawl, moderation load | KEEP; depth-one, relevance checks, detail-only default |
| Like count/like action | Present for demo `POST`; not a Core Feed event/item path | Lightweight feedback | Optimizes social engagement if elevated | DE-EMPHASIZE; keep only where it supports helpfulness/evidence, not rank directly |
| `TRACER`/Trending Tracers | Demo type/panel; Core public Feed does not serve it | Provenance, expertise, follow | Creator popularity loop | KEEP provenance/follow; DE-EMPHASIZE as a standalone module |
| Creator profile | Existing profile/follow UI | Identity, authorship, trust | Follower-growth incentives | KEEP; show “Trace by …” and evidence quality, not popularity-first ranking |

No deletion is proposed in this audit. Removal, legacy cleanup, or database
conversion requires a separate test-environment gate with dependency checks,
export/rollback evidence, and product approval.

## External research and constrained inference

**EXTERNAL RESEARCH.** Google’s recommendation-systems overview describes a
three-stage pattern of candidate generation, scoring, and re-ranking, with
re-ranking used for preference, diversity, freshness, and fairness. Google’s
YouTube paper also separates candidate generation from ranking. These sources
validate the staged boundary, not any YouTube-specific objective or model.

- [Google recommendation systems overview](https://developers.google.com/machine-learning/recommendation/overview/types)
- [Google candidate generation overview](https://developers.google.com/machine-learning/recommendation/overview/candidate-generation)
- [Covington, Adams, Sargin — Deep Neural Networks for YouTube Recommendations](https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/)

**RECOMMENDATION / INFERENCE.** At the current local maturity, the safest
implementation is a deterministic, explainable version of this staged design:
use existing TRACE/PLACE retrieval, make safety a hard gate, calibrate entity
features, keep personalization SHADOW first, and add explicit diversity/module
logic before considering ML/vector retrieval.

Google Maps’ official UGC policy is relevant as a policy benchmark because it
explicitly expects contributions to reflect real experiences, rejects fake or
misleading engagement, covers off-topic/personal information/sexual or adult
content/violence/harassment/spam/promotional abuse, and describes automated
and human review plus place/category/area posting restrictions. It is not an
Aevo policy and must not be copied wholesale.

- [Google Maps user-generated content policy](https://support.google.com/contributionpolicy/answer/7422880?hl=en)
- [Google Maps prohibited and restricted content](https://support.google.com/contributionpolicy/answer/7400114?hl=en)
- [Google report/fix and appeal flow](https://support.google.com/contributionpolicy/answer/7445749?hl=en-GB)

## Audit conclusion

The repository already has a credible TRACE/PLACE serving foundation. The
largest architectural risk is not that deterministic ranking is missing; it is
that the browser/demo vocabulary still makes generic posts, creators, likes,
and a public composer look like peers of places and traces, while media and
UGC safety are not yet production-complete. The next work should freeze the
entity/evidence/signal contract before adding more ranking sophistication.

The original audit stopped at that documentation boundary. A later explicit
instruction to continue implementation authorized a separate controlled
follow-up. That follow-up is additive: it freezes the contract, binds explicit
request context to the existing Core session/cursor boundary, and keeps
migrations, public UGC/media, LIVE personalization, and legacy data deletion
out of scope. Evidence is recorded under
`BATCH-DISCOVERY-001-002` in `docs/feed-system/phase-notes.md`.
