# Implementation prompt — BATCH-FEED-003-FACADE

You are executing `BATCH-FEED-003-FACADE` for the Aevo Feed. Read the accepted FEED-001 contract and the FEED-002 phase note before editing. This batch creates the Core delivery boundary and session/cursor primitives; it does not implement TRACE/PLACE candidate generators, ranking, events, or the live Go migration.

## Objective

Implement one server-owned `GET /api/v1/public/feed` path through Edge -> Core with a safe empty typed page as the initial deterministic baseline. Core resolves the GO app-scoped session/anonymous principal, policy, active config snapshot, and a short-lived `FeedSessionContext`. The browser cannot choose actor, tenant, source, rank, SQL, or config.

## Allowed repositories and scope

- `aevo-core-api`: Feed endpoint/service, request normalization, app policy/session resolution, context/cursor signer, rate/limit validation, private `FeedDataPort`/candidate and hydration interfaces, typed error mapping, and focused tests.
- `aevo-contracts`: finalized request/response/cursor/error types and contract tests only when FEED-001 needs additive changes.
- `aevo-edge-gateway`: forwarding route/config/contract tests; preserve HMAC freshness/signature and credentialed CORS behavior.

Do not change `aevo-go` live routes, `aevo-admin` screens, Hub APIs, Supabase migrations, new Feed materialized-session tables, or infrastructure resources.

## Required session and cursor behavior

Define `FeedSessionContext` with:

- `feedSessionId`;
- `surface` and normalized request parameters;
- `startedAt` and fixed `candidateCutoffAt`/reference time;
- `rankingEpoch`, `configVersion`, and `rankingVersion`;
- stable `experimentSeed` (no per-user assignment row by default);
- canonical `requestFingerprint` excluding the cursor;
- short expiration and any policy version needed for invalidation.

Create an opaque signed cursor bound to the context, actor/session scope, surface, normalized filters, ordering/version, and expiry. Reject tampering, wrong actor/app/surface/filter/config/session, malformed payloads, reuse after expiry, and page-size changes if the contract forbids them. Use existing Core signing/session primitives where available; do not invent a browser-verifiable bearer token or put private data in the cursor.

Implement:

1. Server-side anonymous/GO session resolution and policy; no client actor or tenant override.
2. Bounded request normalization, rate/limit errors, request ID, and no-store behavior for personalized responses.
3. Config snapshot resolution with last-known-good/deterministic fallback and observable version metadata.
4. Private `FeedDataPort` interface for future TRACE/PLACE generators and hydration; this batch may return zero items without fake fixtures.
5. Stable empty response with `feedSessionId`, version fields, `nextCursor: null`, `degraded`, and safe reason fields according to FEED-001.
6. Edge route coverage proving forwarding only; Core remains responsible for authorization and policy.

## Required tests

Add focused tests for:

- anonymous versus authenticated GO session isolation;
- app cookie isolation and no tenant/actor override;
- request fingerprint stability and filter normalization;
- cursor tamper, wrong-context, expiry, malformed, and page-size rejection;
- deterministic session ordering/seed and content inserted between page one and page two not reordering the existing session;
- configured limits/rate-limit/error envelope/request ID;
- config fallback/kill switch and no raw table/SQL exposure;
- Edge HMAC/route forwarding and no authorization decision in Edge.

## Verification

Run:

```sh
cd aevo-contracts && bun run check
cd aevo-core-api && dotnet build src/Aevo.CoreApi/Aevo.CoreApi.csproj
cd aevo-edge-gateway && bun run typecheck && bun test && bun run build
```

Run any focused Core test project created/used by the implementation. If no test harness exists in the current Core repository, do not silently call build success a full test pass; create focused pure tests within the approved batch or mark the missing coverage as a blocker. Run `git diff --check` in every changed repository and inspect for service keys, actor/tenant input trust, raw SQL/table leakage, or unintended migration files.

## Stop condition and handoff

Stop after the endpoint/session/cursor gate and phase note are complete. Do not add candidate queries, ranking, diversity, event intake, Go UI adoption, or production rollout. FEED-004 is unblocked only after the note proves a stable Core session/cursor context and a private candidate seam.
