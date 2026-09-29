# Open questions requiring product and engineering decisions

Status: decision log for MAP-000; unanswered items block the affected
production cutover or privileged workflow

## Ownership and route

1. Which repository owns the canonical Place data model and future migrations:
   Core API, a promoted Hub data owner, or another explicitly named service?
2. Which exact deployed route currently serves the Go discovery/search
   contracts described in aevo-go/docs/api-gap-list.md?
3. Is the current Hub customer-discovery RPC a temporary adapter, or is it
   intended to become the Core-owned execution path?
4. Which team owns the async source-ingestion and conflation worker?

## Product semantics

5. What is the official definition of Place versus Business, Branch, Store,
   Venue, and bookable resource?
6. Can a Place exist without a business, and can one branch link to more than
   one Place?
7. Which categories and territories are in V1: Bangkok only, Thailand, or
   global coverage?
8. What should happen to a Place that is closed, moved, seasonal, private, or
   a user-reported landmark?
9. Which public fields are allowed for anonymous discovery and detail?
10. Are ratings/reviews Aevo-owned only, and how should external ratings be
    excluded or displayed?

## Verification and community

11. What evidence is sufficient for a business claim and how long does
    verification remain valid?
12. Which roles can approve/revoke claims, merge/split Places, and publish
    community edits?
13. What appeal, takedown, and privacy process applies to rejected reports or
    private evidence?
14. Should community submissions support media at V1, or text/coordinates only?
15. What anti-abuse/rate-limit policy is acceptable for new Place creation and
    duplicate reports?

## Data sources and licensing

16. Is OSM used only for basemap, for imported POIs, or both?
17. Is Overture Places approved for the initial territory, and which
    source-specific licenses/attributions are accepted?
18. Which tile/style provider is approved for commercial production, and what
    are its cache, privacy, and attribution terms?
19. What is the source takedown/deletion SLA and legal owner?

## Spatial/query behavior

20. Is antimeridian support required for the initial geography?
21. What are the maximum viewport span, nearby radius, result count, and
    payload-size limits?
22. What search languages, transliteration, typo tolerance, and category
    synonyms are required before considering a dedicated search index?
23. Are precise public coordinates acceptable for all Place categories, or are
    sensitive/private locations generalized?

## Integration and operations

24. Which legacy IDs must remain resolvable, and for how long?
25. Which Feed/Trace/Save/booking contracts can accept canonical placeId in
    the first migration?
26. What is the freshness requirement for capability badges versus live
    booking availability?
27. What p50/p95/p99 goals and traffic assumptions define “ready” for
    Bangkok/Chiang Mai dense viewports?
28. Who owns the operational runbooks, dashboards, and rollback approval?

## Decision record format

For every answer, record:

- decision and date;
- decision owner/approvers;
- affected repositories;
- contract/schema/version consequence;
- privacy/license/security review;
- rollback and sunset plan;
- unresolved follow-up.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

### Revised MAP-000 approval questions

MAP-000 must now answer these architecture decisions explicitly:

1. Is Place the cross-product geographic identity, with Store/Venue/Branch
   remaining operational IDs? Confirm the exact ownership language.
2. Can one Place contain multiple Businesses, and can a Branch have multiple
   typed Place links with one primary?
3. Can a Place have one direct parent in V1, and which child/sub-place
   relation types are allowed?
4. Which geometry types are accepted in the canonical contract and which are
   only derived display geometry?
5. What are the maximum overlay feature count, payload bytes, zoom behavior,
   truncation signal, and cluster policy?
6. Which exact Core route conventions will represent Map overlay,
   Search/Nearby, and Detail?
7. Which geocoder provider is approved for the initial territory, and what are
   its caching, storage, attribution, commercial-use, privacy, and quota rules?
8. What Thailand address/localization fields and aliases are required in V1?
9. Which capability fields are static projections, and what freshness makes a
   badge stale?
10. What resolver hop cap, redirect TTL, split/rollback policy, and retired-ID
    write rejection rule are required?
11. Which public polygon/sensitive geometry must be generalized or withheld?
12. Which field-level authorities are accepted for geometry, website, address,
    category, capability, and moderation?

These questions supersede any earlier assumption that Place is point-only,
that one source can win globally, or that community work must wait for
business verification.

## Current decision state after ADR-000

Resolved for implementation: Core owns the canonical Place boundary and
migrations; `/api/v1/public/places/map`, `/search`, `/nearby`, and `/{placeId}`
are the separate route family; Place is geometry-capable and distinct from
Business/Organization/Branch/Store/Venue/BookableResource; address fields are
Thailand-first; capability is static projection data while live state stays in
owning domains; the V1 viewport is non-antimeridian and bounded; and redirect
resolution is capped at five hops with retired-ID write rejection.

Still required before the affected production gates: provider/source/legal
approval, measured payload and latency budgets, field-level authority sign-off,
legacy reference inventory, business/claim ownership, community abuse policy,
and operational SLO/runbook ownership. Local code records these decisions and
keeps production cutover and privileged writes disabled until those questions
are answered.
