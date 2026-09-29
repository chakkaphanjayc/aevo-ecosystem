# Implementation prompt — BATCH-FEED-001-CONTRACT

You are executing `BATCH-FEED-001-CONTRACT` for the Aevo Feed. Read and verify the accepted FEED-000 ADR before editing anything. This batch establishes the versioned boundary only; it does not implement ranking, candidate generators, config persistence, live client rollout, or a database migration.

## Objective

Publish one typed, versioned Feed contract and make the current deployment/origin boundary explicit. The public boundary is intended to be:

```text
Aevo Go -> Aevo Edge Gateway -> Aevo Core API -> private FeedDataPort
```

The client and Admin must not need to know whether V1 data is currently read from TraceDee/Supabase or a later Core-owned projection.

## Allowed repositories and scope

Allowed:

- `aevo-contracts`: Feed request, response, discriminated TRACE/PLACE item variants, safe reason codes, event envelope, typed error codes, OpenAPI v1 additions, and focused contract tests.
- `aevo-core-api`: contract/route inventory, private `FeedDataPort`/adapter interface, request/response mapping seam, and boundary documentation. Do not add schema.
- `aevo-edge-gateway`: route/origin contract tests or documentation needed to prove `/api/v1/public/feed` forwarding. Do not move authorization into Edge.
- `aevo-go`: compatibility parser/fixtures only if needed to prove additive parsing. Do not switch the live Explore page or change client ranking/interleaving.
- `aevo-hub`: boundary documentation only; do not add a public Gateway route or Feed migration.

## Contract requirements

Define and test:

- `GET /api/v1/public/feed` request fields: surface/tab, bounded query, optional coarse area/location, cursor, and bounded limit;
- response fields: `feedSessionId`, `configVersion`, `rankingVersion`, `nextCursor`, `degraded`, typed items, and safe public reason codes;
- item variants for TRACE and PLACE only in V1; POST/TRACER/collection are not enabled by this batch;
- `FeedEvent` envelope for later FEED-006 without implementing the consumer;
- stable error codes for invalid request, unauthorized/forbidden policy, cursor failure, rate limit, unavailable dependency, and degraded empty result;
- compatibility mapping from existing TraceDee/public discovery responses, including fields that must never be public;
- additive versioning and a compatibility window.

Use strict TypeScript types. Never expose raw ranking scores, feature vectors, creator reputation, block/mute state, exact location, private identifiers, SQL, table/RPC names, or service credentials.

## Required work

1. Record the exact Edge -> Core route/origin matrix and expected app-scoped session behavior.
2. Add the contract package types/OpenAPI shape and focused serialization/parsing tests.
3. Add the Core private adapter interface and, only if the accepted ADR selected it, the smallest read-only adapter wiring/fixture needed to prove that boundary; do not implement candidate composition, make Core depend on an unbuilt Hub workspace, or expose Supabase to callers.
4. Add Edge forwarding/contract coverage if the existing test layout supports it; HMAC proves ingress only, while Core performs end-user authorization.
5. Add only non-live Go fixtures/parser coverage if required. Leave the current two-query/interleave Explore behavior unchanged.
6. Update `docs/feed-system/phase-notes.md` with exact contract version, endpoint, compatibility matrix, files changed, tests, and any unresolved deployment-origin blocker.

## Forbidden scope

- any file under `*/db/migrations/` or `aevo-hub/supabase/migrations`;
- Feed config tables, feature-flag writes, experiments, ranking, diversity, candidate queries, or materialized sessions;
- live Aevo Go route/client migration;
- Admin Feed screens or direct database access;
- new public gateway in aevo-hub;
- service-role credentials in browser, Edge, or shared contract code;
- unrelated dependency upgrades.

## Verification

Run every check for a repository changed:

```sh
cd aevo-contracts && bun run check
cd aevo-core-api && dotnet build src/Aevo.CoreApi/Aevo.CoreApi.csproj
cd aevo-edge-gateway && bun run typecheck && bun test && bun run build
cd aevo-go && bun run typecheck && bun run test
cd aevo-hub && bun run typecheck
```

The Go and Hub commands are required only when those repositories are changed. Also run `git diff --check` in each changed repository and inspect that no migration/schema file changed.

## Stop condition and handoff

Stop after contract and boundary checks pass. Do not continue into FEED-002 or FEED-003 in the same invocation. FEED-002/003 may start only when the phase note records one contract version, one endpoint/origin matrix, a private adapter boundary, and no unresolved FEED-000 ownership decision.
