# Feed domain model and source mapping

ARCHITECTURE REVIEW REVISION

## Principles

Feed is a delivery layer over existing domain entities. It must not become the source of truth for traces, places, profiles, posts, follows, saves, moderation, or booking.

Domain state answers what an entity is and whether it is publishable. Feed state answers whether a published entity is a candidate for a surface, how it was ranked in a request, and what delivery evidence was produced. Behavior events answer what a person or anonymous visitor did. Keep these three categories separate.

## Canonical entities

| Feed concept | Existing source | Public eligibility | Candidate status |
| --- | --- | --- | --- |
| TRACE | tracedee_traces plus trace stops and projections | PUBLISHED, PUBLIC, VISIBLE/LIMITED, creator not blocked/muted | First live generator |
| PLACE | tracedee_places and/or customer_store_profiles | Public enabled, visible/limited, valid location/profile | First live generator |
| POST | tracedee_posts plus optional trace/place | VISIBLE/LIMITED, not deleted, moderation policy satisfied | Later generator; no media relation yet |
| TRACER | user_profiles plus profile/expertise projections | Profile visibility and safety policy | Later generator; define privacy first |
| COLLECTION | No canonical collection table found | Not currently defined | Not in the first slice |

The two place sources need an explicit adapter policy. tracedee_places is the TraceDee spatial entity, while customer_store_profiles is the public store/map projection. The Feed must deduplicate a Store/Place identity and never show both as unrelated items merely because they came from different generators.

## Proposed universal item envelope

The public response should carry one discriminated envelope with a stable identity and a server-owned delivery context:

    FeedItem {
      itemType: TRACE | PLACE | POST | TRACER
      itemId: UUID
      entityVersion: string
      surface: DISCOVERY | FOLLOWING | NEARBY | SEARCH
      summary: typed variant payload
      creator: optional public creator summary
      media: typed media references, not raw storage secrets
      location: optional coarse/public location
      relationship: server-resolved save/follow/open state
      reason: public reason code and safe parameters
      delivery: item token, position, ranking version
    }

The score itself is not a product contract. Do not expose internal raw score components, creator reputation, block lists, exploration randomness, or sensitive feature values to the client. A safe reason such as FOLLOWING_TRACER, NEARBY, TASTE_MATCH, POPULAR, or NEW is sufficient.

## Identity and visibility

The server resolves the principal from the GO-scoped session. A client-supplied actorId, organizationId, storeId, creatorId, or moderation state is never authoritative.

Public Feed eligibility is not equivalent to tenant membership. Public stores can be cross-organization; their visibility comes from the public projection and product policy. Private drafts, organization-only entities, deleted rows, blocked/muted creators, and under-review content must be filtered before ranking and again before hydration.

For each entity type, define:

- canonical primary key and version/revision;
- publication and moderation state;
- public projection fields;
- creator/owner relation;
- place/area/geography relation;
- quality/statistics projection;
- deletion and recovery behavior;
- policy for an entity that disappears between candidate generation and hydration.

## Read-model direction

The first implementation should use a server-side Feed repository and explicit adapters over canonical tables. A physical universal feed_items table is optional; it becomes justified when candidate generation, counts, search, or moderation volume makes repeated joins too expensive.

If a read model is introduced, it should be a projection, not a duplicate business record:

    feed_item_projection(
      item_type,
      item_id,
      entity_version,
      visibility_state,
      creator_id,
      place_id,
      area_key,
      topic_keys,
      location,
      quality_score,
      interaction_count,
      published_at,
      materialized_at
    )

Use an immutable entity version or updated-at watermark to prevent stale hydration from reintroducing edited or removed content.

## Candidate/data ownership rules

- Trace domain writes remain in the TraceDee domain owner.
- Public store writes remain in the store/catalog owner.
- Feed configuration is platform-controlled and must have one authoritative control-plane store.
- Feed events are append-only behavior data and must not update ranking counters synchronously in the request path.
- Aggregates and quality scores are derived projections with an explicit version.
- Admin searches, saved views, reports, and exports use the shared Query AST; public Feed request filters use a small, typed Feed request contract.
- V1 has no canonical collection candidate and no mandatory fully materialized session list.
