# Pagination and feed sessions

ARCHITECTURE REVIEW REVISION

## Current problem

The current TraceDee cursor is a base64url-encoded JSON object containing score, publishedAt, and id. It is not signed, does not bind to actor, surface, filters, config version, or expiry, and the Go repository records ranking evaluation with a null session ID. A ranking/config change can therefore reorder later pages, and a cursor can be replayed in another request context.

## Proposed cursor

Use a compact, signed, server-issued cursor with:

    version
    feedSessionId
    surface
    tab
    startedAt
    candidateCutoffAt or rankingEpoch
    requestFingerprint
    configVersion
    rankingVersion
    experimentSeed
    generatedAt
    expiresAt
    lastSortKey
    servedItemCount
    key identifier
    HMAC signature

The signature prevents tampering. The request fingerprint prevents using a cursor with changed filters, area, location bucket, or account state. Expiry prevents indefinite replay and limits stale ranking behavior.

The cursor is opaque to clients. Never accept client-supplied actor, tenant, score, or sort fields from a decoded unsigned token.

## Session strategy

The first release uses a FeedSessionContext plus a stateless signed cursor:

    feedSessionId
    surface
    startedAt
    candidateCutoffAt or rankingEpoch
    configVersion
    rankingVersion
    experimentSeed
    requestFingerprint
    expiration

The session binds impression and interaction events and freezes config/ranking version and reference time for its TTL. Freshness and other time-sensitive features for page two and later use candidateCutoffAt/rankingEpoch, not wall-clock now.

V1 deliberately avoids mandatory full candidate-list materialization. Stable session seed, fixed cutoff, deterministic ranking, and keyset pagination are sufficient for the first TRACE/PLACE scope. Materialization becomes necessary when personalized exploration requires exact cross-page exclusion, candidate generation is expensive or non-repeatable, source mutation makes stateless reconstruction unsafe, or product experiments need a frozen candidate list. That later snapshot should be short-lived and server-side, never a primary business record.

Session inputs include surface, normalized request, principal/anonymous bucket, config version, ranking version, and coarse location context. Do not put raw coordinates, email, or sensitive preference data in the client-visible token.

## Page stability

Within a session:

- use one config snapshot;
- use one ranking version;
- use one evaluation time or time bucket;
- use the session candidate cutoff/reference time for freshness;
- exclude already-served canonical identities;
- keep deterministic tie-breaks;
- tolerate new content appearing only after a session restart;
- return a safe empty state rather than duplicate items when the candidate pool is exhausted.

If a candidate is removed or becomes unsafe between pages, omit it and continue filling from the same session constraints. Never resurrect it from a cached page.

## API shape

The public response should contain:

    items
    nextCursor
    feedSessionId
    requestId
    configVersion
    rankingVersion
    hasMore
    degraded

The client must not be required to understand generator cursors. If a generator uses a database keyset cursor internally, the Feed service owns and encrypts/encodes it as part of the session state.

## Tests

Test cursor tampering, changed filters, changed actor, expired cursor, config publication between pages, deleted candidate between pages, duplicate source identities, anonymous-to-authenticated session transitions, and content inserted between page one and page two. The inserted item must not reorder or appear in an existing session unless the session is restarted. Include property tests for strict ordering and no duplicate canonical item IDs across pages.
