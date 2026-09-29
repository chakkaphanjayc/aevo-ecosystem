# Moderation and safety

ARCHITECTURE REVIEW REVISION

## Current safety foundation

TraceDee already has moderation states for traces, places, posts, comments, and ratings; content reports with evidence/current snapshots; moderation audit; block/mute relations; soft deletion for community content; and feed filters that exclude blocked or muted creators. These are valuable primitives and should be reused.

The hot path should be:

    canonical moderation state
      -> eligibility projection
      -> Feed candidate filtering

Feed must not make a remote moderation service call mandatory for every request.

The safety contract must be applied at three points:

1. candidate generation;
2. before ranking/deduplication;
3. after hydration, immediately before response.

This protects against deleted content, stale projections, moderation changes, and a race between candidate selection and response. The eligibility projection is checked before ranking and again after hydration.

## Public eligibility

Default Feed policy:

- TRACE requires PUBLISHED + PUBLIC + VISIBLE/LIMITED;
- PLACE requires public-enabled and VISIBLE/LIMITED;
- POST requires VISIBLE/LIMITED, not deleted, and a public target if attached;
- TRACER requires profile visibility and no block/mute;
- UNDER_REVIEW and REMOVED never appear in public Feed;
- an unknown moderation state fails closed.

Limited content must have a product-approved presentation policy. Do not leak report reason, evidence, reviewer identity, or private moderation notes through public reasonParams.

## Projection freshness and outage policy

- Target eligibility projection freshness: under 60 seconds.
- Hard stale bound for serving last-known-good eligible state: 5 minutes, subject to measured safety review.
- Explicit deletion, removal, suspension, or block invalidation must evict the affected item from caches and projections as soon as the event is received.
- Unknown/new content without a valid eligibility state fails closed.
- If the projection is stale beyond the bound, disable the affected generator and serve only other sources with valid eligibility.
- A moderation outage must not trigger a synchronous network dependency or make the Feed serve unknown content.

These are initial bounds to validate in load and safety testing, not permission to weaken a stricter product policy.

## Admin actions

Moderation actions are privileged mutations and must go through Core API:

- permission content.moderate;
- ADMIN app-scoped session;
- CSRF for browser writes;
- required reason or incident ticket;
- idempotency key;
- audit before/after state;
- safe cache invalidation;
- outbox/event emission for downstream projections.

The action handler must verify the current entity version and return a conflict if the item changed after the Admin queue snapshot.

## Abuse controls

Add bounded rate limits and anomaly monitoring for:

- impression/event floods;
- repeated report submissions;
- follow/save loops;
- post/comment creation;
- media uploads;
- cursor/session replay.

Do not use a user-provided metadata flag as a moderation bypass. Trust and reputation may affect ranking only through a versioned, privacy-reviewed feature and never override hard safety states.

## Admin repository transition

aevo-hub/apps/admin contains an existing transitional TraceDee moderation screen and Core API calls. aevo-admin is the long-term privileged application and now owns the Core-backed Feed configuration and moderation routes. Keep the Hub screen only for compatibility/parity verification, and do not add new Feed controls to both surfaces. Remove the transitional workspace only after the production-origin switch, rollback evidence, and deployed authenticated smoke pass.
