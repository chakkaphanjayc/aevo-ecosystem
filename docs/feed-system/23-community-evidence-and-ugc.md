# Community evidence, UGC safety, and privacy

Audit date: 2026-09-26
Status: design proposal for the unresolved media/evidence pipeline. The
fail-closed safety contract and Core moderation adapter are implemented in
controlled slices; no public UGC/media hydration or storage migration is
enabled.

## Core policy

Community content is valuable when it helps someone make a better discovery
decision. It is not valuable merely because it is safe, recent, popular, or
engaging.

```text
allowed public evidence
  = safe
  + relevant to the target Place/Trace
  + authentic enough for the claimed context
  + useful/legible to a future visitor
  + eligible under the current place/category/region policy
```

The product does not offer an NSFW mode, adult toggle, or blurred adult Feed.
Explicit sexual/pornographic/adult-oriented user content is not an allowed
product category. Educational, documentary, or artistic exceptions—if ever
needed—require a separate legal/product policy decision and must remain
place-relevant; they are not a Feed preference.

## Actual local UGC model

### Existing tables and functions

**LOCAL FACT.** The inspected TraceDee migrations provide:

- `tracedee_posts`: author, optional `trace_id`/`place_id`, body, lifecycle
  status, timestamps. The contribution function requires a completed Journey
  and a contextual Trace or Place target.
- `tracedee_comment_threads`: one thread per post.
- `tracedee_comments`: author, optional parent, body, `depth` constrained to
  0/1, lifecycle status.
- `tracedee_comment_reactions`: `HELPFUL`/`LIKE`; helpful action has an
  idempotent function and activity event.
- `tracedee_trace_ratings`: first-class Trace rating with optional tags/review,
  one per Trace/user, linked to a completion; text starts `UNDER_REVIEW` in the
  rating function while an empty review can be visible.
- `tracedee_content_reports`: entity types TRACE/PLACE/POST/COMMENT/PROFILE,
  status OPEN/REVIEWING/RESOLVED/DISMISSED, evidence snapshot and reviewer
  fields in later migrations.
- `tracedee_moderation_audit`: report/action/before/after/reason/operator
  evidence with activity/outbox integration.
- content lifecycle functions for owner edit/delete with expected version and
  soft-delete behavior.
- block/mute relations and Feed filters that exclude blocked/muted creators.

The live Trace detail UI uses APIs for community posts/comments, edit/delete,
report, block/mute, and displays an `UNDER_REVIEW` response. This is a useful
detail-surface foundation. It is not a complete Place review, photo, Q&A,
business-response, or media pipeline.

### What is absent or not proven

The inspected Feed-related code and migrations did not prove a production
equivalent for:

- a canonical `Review` entity for Place/Service;
- `ReviewAspect` or normalized aspect aggregation;
- `ReviewHelpful` separate from comment helpfulness;
- `ReviewVerification` that safely joins a completed Aevo Play booking or POS
  transaction to a public label;
- `CommunityEvidence` read model with evidence confidence and freshness;
- a business response entity/workflow;
- a canonical user-media attachment relation for TraceDee posts/ratings;
- upload quarantine, malware/content scan, image moderation, transcoding,
  variant publication, or public-media invalidation;
- a user-facing appeals flow or explicit account-level UGC suspension path.

These are gaps, not instructions to add all of them as tables. The eventual
owner and projection strategy must be decided first.

## Evidence model proposal

### Public evidence contract

The public Place/Trace response may eventually include a bounded evidence
block, for example:

```text
CommunityEvidence {
  aggregateRating: number | null
  ratingCount: number
  ratingConfidence: "none" | "low" | "medium" | "high"
  verifiedExperienceRatio: number | null
  popularAspects: string[]
  selectedReview: SafeReviewHighlight | null
  photoCount: number
  recentUsefulFeedbackAt: timestamp | null
  evidenceVersion: string
}
```

This is a conceptual contract, not a schema. It must not expose reviewer
identity unless that is already public and approved, purchase amount, booking
details, exact visit time, precise location, moderation reason, or raw private
profile values.

### Source policy by entity

| Entity | Evidence allowed in Feed | Not a Feed candidate |
| --- | --- | --- |
| PLACE | aggregate rating/confidence, selected useful review, approved photos, verified visit label, popular aspects, current useful tip | review/photo/comment row itself |
| TRACE | completion/save/remix signal, Trace rating/review, selected useful comment, stop-level tip | post/comment/creator row itself |
| Review | detail evidence and confidence input | standalone For You item in V1 |
| Photo | gallery/evidence on Place/Trace detail/card | standalone candidate |
| Comment | bounded detail discussion/helpful evidence | unlimited social thread |
| Creator | author/provenance and expertise signal if approved | popularity-first candidate |

Raw counts are not enough. A review count without authenticity, freshness,
relevance, or confidence can amplify spam or business manipulation.

## Moderation state audit

### Current states

The local model uses `VISIBLE`, `LIMITED`, `UNDER_REVIEW`, and `REMOVED` for
traces/places/posts/comments/ratings in the relevant paths. Reports use
`OPEN`, `REVIEWING`, `RESOLVED`, and `DISMISSED`. Core Feed eligibility currently
filters TRACE/PLACE to published/public or public-enabled plus
`VISIBLE`/`LIMITED`; the documented policy says unknown state fails closed.

FEED-009-MODERATION adds a Core/Admin queue and action boundary with
`REVIEW`, `LIMIT`, `REMOVE`, `RESTORE`, and `DISMISS`, required reason,
idempotency, expected report status, app-scoped permission, CSRF, audit, and
safe evidence rendering. Its local verification is a controlled slice only;
the migration/RPC/connected environment is not proven in this workspace.

### Required policy dimensions

The future policy taxonomy must separately classify:

1. explicit sexual/pornographic/adult-oriented content — reject; no NSFW mode;
2. nudity/sexualization — reject except a separately approved, place-relevant
   legal policy exception;
3. graphic violence/gore/animal cruelty — reject or escalate;
4. hate/harassment/threats/doxxing/unwanted sexualization — reject/escalate;
5. spam, repetitive, copied, meaningless, or promotional abuse — reject or
   suppress;
6. fake engagement, paid/incentivized reviews, review bombing, brigading,
   impersonation, and business manipulation — lower confidence, suppress, or
   reject;
7. off-topic rants/general politics/unrelated memes — not useful evidence;
8. PII, private faces/images, secrets, financial/medical/identifying data —
   redact/reject/escalate according to privacy/legal policy;
9. illegal/dangerous/child-safety content — reject and apply escalation path;
10. place mismatch, duplicate, inaccurate, or unverifiable content — reject,
    hold, or route to correction workflow.

**EXTERNAL RESEARCH.** Official Google Maps policy is used only as a benchmark:
it explicitly combines usefulness/real experience with fake-engagement,
off-topic, personal-information, sexually explicit/adult, violence,
harassment, advertising, repetitive-content, and place/category restriction
controls. It also describes automated detection plus trained human review,
account/feature restrictions, and appeals. The Aevo policy must be approved by
product, trust/safety, legal, and privacy owners before implementation.

## Media lifecycle gap

### Actual local behavior

The active Go/demo UI displays `mediaImages`, public store `image_url`/media
arrays, and remote demo image URLs. The Feed hydration contract exposes a
Place `imageUrl`; no inspected TraceDee migration supplies a canonical
`media_asset`/`media_attachment` table tied to user posts/reviews, and no
production upload -> scan -> variant -> public publication path was found.

Therefore the current code does not demonstrate that user media is private
until moderation. A client or public profile URL could become visible before a
content decision unless the owning upload/profile service already enforces a
separate boundary that was not found in this audit.

### Target lifecycle (conceptual)

```text
client requests upload intent
          |
          v
private object / opaque asset id
          |
          v
UPLOADED -> QUARANTINED -> automated text/image/malware checks
                              |
                 +------------+-------------+
                 |                          |
             APPROVED                    NEEDS_REVIEW
                 |                          |
                 v                          v
       derive safe public variants       human queue
                 |                          |
                 +------------+-------------+
                              |
                  PUBLIC only after approval

reject / failed / deletion -> inaccessible public variants + audit event
```

The asset state must be checked in candidate eligibility and public hydration.
Removal, owner deletion, account deletion, place restriction, and moderation
action must invalidate public variants/cache quickly. A placeholder or
“limited” display is a product choice; it must never reveal rejected content.

### Text and image moderation boundary

Text and image decisions are separate inputs but share one content lifecycle.
Automated confidence is not an unconditional publish authority for high-impact
categories. Use threshold bands:

```text
high-confidence reject -> reject/quarantine
high-confidence allow  -> approved only for low-risk policy classes
uncertain              -> needs human review
unknown service state  -> fail closed for public UGC
```

No classifier provider, model, or vendor is selected in this audit.

## Place-level UGC policy

The existing moderation functions are entity/report based; a reviewed place,
category, or region policy switch was not proven. A future policy projection
may conceptually contain:

```text
place / category / region scope
reviewsEnabled
photosEnabled
commentsEnabled
postingMode: OPEN | LIMITED | PREMODERATED | DISABLED
reasonCode
effectiveAt / expiresAt
policyVersion
```

Use cases include review bombing, sensitive locations, temporary incidents,
legal restrictions, and emergency suppression. This policy is not a browser
flag and not an arbitrary SQL switch. It must be server-resolved, audited,
cached with invalidation, and fail closed for unknown high-risk scope.

## Review and comment product boundary

### Review

A Review is an evaluation of a Place, Service, or Trace experience. It should
have a target, author, rating (if applicable), text/aspects, lifecycle,
authenticity/verification state, helpfulness, reports, and edit/delete history.
The target’s summary should be derived from eligible reviews, not from all
submitted rows.

### Comment

A Comment is discussion or response around a Trace or Review context. Keep the
existing root-plus-one-reply constraint. Place detail should favor:

```text
Review summary -> useful review -> Helpful / Report -> business response
```

over an open-ended social discussion tree. A comment can be useful evidence,
but it does not become a review just because it contains a rating-like phrase.

### Business response

No inspected first-class business response contract was found. If introduced,
it needs verified organization/store authority, edit/audit history, policy
limits, and no ability to alter review ranking directly. It is a detail
surface/evidence context, never an unreviewed promotional candidate source.

## Verified experience

Potential trusted sources are:

- completed Aevo Play booking/visit, without exposing booking details;
- verified Aevo POS transaction, without exposing purchase details;
- Trace completion/completion verification;
- another confirmed interaction with a documented trust level.

Public copy can be `Verified visit` or `Verified booking` only after the source
owner proves identity matching, event authenticity, revocation/deletion,
merchant abuse controls, and privacy boundaries. Verification increases
confidence; it must not guarantee a positive review or allow a business to
buy rank.

## Data-model gap analysis (no migration)

| Concept | Existing equivalent | Decision now | Eventual direction |
| --- | --- | --- | --- |
| Review | `tracedee_trace_ratings.review` for Trace; Place aggregate only | Reuse Trace; do not force Place into comments | Canonical Place review decision with owner |
| ReviewAspect | rating tags and topic arrays | Reuse/normalize taxonomy only if justified | Derived aspect projection, not necessarily a table |
| ReviewHelpful | comment helpful reaction only | Gap | Add only with a clear review owner and abuse control |
| ReviewVerification | Trace completion/verification fields; booking/POS domain exists separately | Gap at public evidence boundary | Privacy-reviewed verification projection |
| CommunityEvidence | scattered counts, quality scores, rating/review aggregate | New read-model concept | Batched projection over eligible sources |
| UserDiscoveryProfile | `tracedee_taste_affinities`, profile/expertise scores | Reuse/extend projection | Versioned normalized projection if current table cannot express decay/confidence |
| EntityDiscoveryFeature | quality scores and `aevo_feed_item_metrics_projection`; store profile fields | Reuse first | Add typed projection only for missing features/freshness |
| SessionDiscoveryContext | Core `FeedSessionContext` and Go URL/session | Reuse request/session | No DB table by default |
| PlaceUgcPolicy | No proven scoped policy | Gap | Server-owned scoped config/projection after policy approval |
| MediaAsset/Attachment | No proven TraceDee canonical asset relation | Gap | Private/quarantined asset owner selected before migration |
| Appeal | No inspected public appeal flow | Gap/decision | Product/legal decision before exposing mutation |

No model is created in this audit. The first implementation should prefer a
projection over a duplicate canonical domain entity.

## Privacy and retention plan

Retention classes require product/privacy approval; this table intentionally
does not invent numeric durations.

| Data | Operational use | Personalization/analytics use | Retention class | Deletion/anonymous behavior |
| --- | --- | --- | --- | --- |
| Exact map coordinates/viewport | Map query and current result | Avoid raw retention; derive coarse bucket if needed | Request/operational | Not copied to public reason/events; clear with session |
| Coarse area/geohash/distance bucket | Nearby eligibility | Locality context and aggregate measurement | Derived, bounded | Rebuild/remove on account deletion; anonymous only coarse/session |
| Query/filter/vibe/date/party | Current request | Session intent and aggregate UX metrics | Request/session | Not permanent taste unless user opts to save |
| Place/Trace opens/saves/completions | Product actions and ranking features | Derived profile/evaluation | Activity/derived profile | Delete/rebuild actor-linked aggregates; anonymous session only |
| Booking/transaction evidence | Operational booking/POS and verification | Public confidence boolean/aggregate only | Owner-system/audit | Never expose purchase details; revoke/rebuild on deletion/refund |
| Review/photo/comment body | Public evidence/detail | Quality/moderation only | Content lifecycle/legal | Owner delete soft/audit as policy requires; public variants revoked |
| Moderation report/evidence/audit | Safety operations | Guardrails, not public rank | Safety/audit | Restricted access; legal hold rules apply |
| Taste affinities | Personalization | Profile projection | Derived profile | Delete/rebuild with account; no anonymous cross-session identity by default |
| Event IDs/tokens | Idempotency/measurement | Aggregate metrics | Event/outbox | Server retention policy; no raw precise location metadata |

Anonymous discovery should work with current explicit context, local quality,
and diversity. Do not silently create a durable anonymous taste profile or use
browser secrets to link it to an account.

## Abuse and integrity controls

Community evidence must withstand:

- review bombing and coordinated rating changes;
- paid/incentivized or business-requested reviews;
- fake visits/completions and replayed booking evidence;
- spam saves/follows/impressions;
- creator brigading and repeated self-promotion;
- copied/duplicate media and place misassociation;
- sudden place/category/region abuse spikes.

Controls include minimum evidence, rate limits, account/device/pattern signals
with privacy review, verified event weighting, anomaly suppression, scoped UGC
policy, human review, audit, cache invalidation, and confidence decay. These
controls alter eligibility/confidence; they do not create a secret popularity
boost.

## Required tests for the eventual implementation

- review is evidence and never becomes a standalone Core Feed candidate;
- POST/TRACER cannot enter a TRACE/PLACE public response through adapter drift;
- explicit sexual/adult/graphic-violence/hate/PII/illegal content is not public;
- off-topic, duplicate, promotional, fake, or unverifiable place content is
  excluded or routed to review;
- media URL is inaccessible before approval and after removal/deletion;
- unknown media/moderation state fails closed;
- bounded comment depth and edit/delete/report conflicts are preserved;
- helpful votes cannot directly dominate ranking;
- verified experience exposes only approved labels and revokes correctly;
- place/category/region restriction suppresses new and cached UGC;
- account deletion removes public attribution and profile-derived features;
- appeals, if approved, are audited and cannot bypass safety state;
- fallback serves the Place/Trace without unavailable evidence.
