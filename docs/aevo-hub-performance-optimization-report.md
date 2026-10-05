# Aevo Hub performance optimization report

Date: 2026-10-02

## Executive result

The authenticated Hub path meets the 100 ms target on the real local Hub Edge path for the normal post-login and warm-cache flows. Session issuance now primes the tenant-authorized bootstrap and organization dashboard read models in Core, so the shell does not immediately repeat the remote database work. A truly process-cold authenticated read remains bounded by the remote PostgreSQL connection path and is not yet under 100 ms.

| Request after fresh login | P50 | P95 | Cache | DB wall | Result |
| --- | ---: | ---: | --- | ---: | --- |
| `/api/auth/me?includeStores=true` | 4.1 ms | 5.7 ms | HIT | 0.0 ms | PASS |
| `/api/v1/hub/stores` | 4.8 ms | 8.5 ms | HIT | 0.0 ms | PASS |
| `/api/v1/hub/overview/organization` | 4.4 ms | 14.5 ms | HIT | 0.0 ms | PASS |
| `/api/v1/access?application=HUB` | 3.9 ms | 6.6 ms | HIT | 0.0 ms | PASS |

The final warm phase (twenty samples per route) reported:

| Warm request | P50 | P95 | Result |
| --- | ---: | ---: | --- |
| `/api/auth/me?includeStores=true` | 1.7 ms | 8.0 ms | PASS |
| `/api/v1/hub/stores` | 1.7 ms | 6.2 ms | PASS |
| `/api/v1/hub/overview/organization` | 1.7 ms | 4.6 ms | PASS |
| `/api/v1/access?application=HUB` | 1.5 ms | 6.4 ms | PASS |

The successful benchmark used eight fresh authenticated sessions per route and twenty warm samples per route, while measuring login separately; its 33 local login samples reported P50 518.8 ms and P95 548.8 ms. Login remains outside the 100 ms route SLO because it includes Accounts password verification, Core session writes, and read-model priming. These are development timings, not a production deployment SLO. The verified route claim is **the first authenticated request after login and the warm Hub API both remain under 100 ms P95**.

## Root causes found

1. The Hub shell previously requested `/api/auth/me` and `/api/v1/hub/stores` concurrently. Both requests resolved the same session and Hub principal, producing duplicate database work and contention.
2. The compatibility `/api/v1/hub/stores` and `/api/v1/access?application=HUB` routes still used the older multi-query authentication path.
3. Dashboard projection refresh opened several pooled connections concurrently. A single warm connection did not prevent the first stats/connections reads from paying multiple remote command latencies.
4. PostgreSQL execution is not the dominant cost. Connected `EXPLAIN (ANALYZE, BUFFERS)` plans were sub-2 ms, and `pg_stat_statements` showed low single-digit millisecond execution for the measured reads. The remaining 120–170 ms for a one-query miss is Core-to-Supabase network/protocol latency.
5. Request-time dashboard projection persistence crossed an RLS boundary that permits platform/background writers only. The failed write was being converted into a stale 200 response.
6. Session issuance wrote the identity, profile, and app-session projections in one command but still paid separate transaction-control exchanges, then the first Hub request repeated authorization and dashboard reads.

## Implemented changes

- Added a Core `hub.bootstrap` statement that resolves the app-scoped session, Hub principal, permissions, and authorized store index in one database round trip.
- Added short-lived L1 caching and single-flight coalescing for the bootstrap result. Session, assignment, membership, role, entitlement, and store-binding writes invalidate the relevant snapshots.
- Raised the default session/access snapshot window to 60 seconds, the existing bounded maximum; security-state writes still invalidate the snapshots immediately, so the longer window reduces repeated remote reads without moving Core's authorization authority into the browser.
- Updated `/api/auth/me?includeStores=true` to return the authorized store index in the same response. Ordinary lightweight auth checks do not request store data.
- Updated Hub read authentication, the compatibility stores route, and the Hub access route to use the bootstrap path.
- Configured the Core Npgsql pool with a bounded minimum/maximum size and a startup warmup of four connections. The warmup runs before Core begins serving traffic; failures are logged and traffic can still recover lazily.
- Added a 15-second application-connection cache and a five-minute organization/store dashboard L1 cache with single-flight loading, matching the dashboard projection freshness window.
- Dashboard projection, stats, and application-connection reads now share one PostgreSQL command exchange after a projection miss.
- The bootstrap exchange now returns the organization dashboard result set as well and seeds the tenant-scoped dashboard cache, removing the second remote read on a process-cold authenticated dashboard request.
- Added `db_open_ms` and bounded per-operation database timing to Core response headers/logs so pool checkout, remote command latency, and serialization are distinguishable.
- Removed request-time writes to the RLS-protected dashboard projection table. Reads return the computed model and leave persistence to the privileged projection-writer boundary.
- Batched the identity, profile, and app-session writes into one transactional PostgreSQL command while preserving the existing conflict/update behavior.
- Folded `BEGIN` and `COMMIT` into that same session-issuance command, removing two client/server transaction-control exchanges while retaining atomic rollback behavior on connection disposal.
- After the transaction commits, Core resolves the authoritative Hub bootstrap and primes the organization dashboard cache only when the session has a valid Hub membership. This is a server-side read-model optimization; it is not a browser permission cache.
- Extended the benchmark to report login latency separately from authenticated route latency.

## Security invariants preserved

- Core remains the authorization and tenant-scope source of truth.
- The bootstrap query keeps explicit session, organization, assignment, membership, role, and store-scope predicates; the browser receives no authority to choose a tenant or permission set.
- Cache keys contain the opaque session hash or explicit organization/store scope. They are not browser permission caches and are invalidated on security-state writes.
- Hub access remains fail-closed when the session, assignment, membership, or tenant headers are invalid.
- No session token, cookie, permission decision, or tenant payload is stored in the browser performance cache.

## Verification evidence

Benchmark command:

```sh
AEVO_BENCHMARK_COLD_SAMPLES=8 AEVO_BENCHMARK_SAMPLES=20 AEVO_BENCHMARK_TARGET_MS=100 bun run benchmark:auth-cache
```

The benchmark used the real local Hub Edge at `http://localhost:4000`, captured Core performance headers, issued eight fresh sessions per endpoint for the cold phase, measured login separately, collected twenty warm samples per endpoint, and exited non-zero if any cold or warm endpoint exceeded the configured P95 target.

Passed:

- `dotnet build src/Aevo.CoreApi/Aevo.CoreApi.csproj --no-restore -p:StaticWebAssetsEnabled=false`
- Core test suite: 185 passed
- Hub `bun run typecheck`
- Hub API-contract and auth-client tests: 4 passed
- Successful cold and warm SLO benchmark: all four endpoints passed
- Fresh-process verification: the first session prime recorded one `hub.bootstrap` exchange containing the bootstrap and dashboard result sets; the following organization dashboard request was a cache hit with zero database queries.
- Controlled process-cold verification: a valid session after Core restart completed the first organization dashboard request in 180.2 ms with `cache=MISS`, one database query, and 163.1 ms database wall time; before the combined exchange it was 303.2 ms with two database queries.
- A warm-pool `/ready` probe, which executes only `select 1`, completed in 107–140 ms across five samples. This is a lower-bound signal for an uncached Core-to-database request in the current local topology; the application query itself cannot reliably bring that path below 100 ms.
- The direct Supabase database hostname was tested in an isolated Core process. It resolves only to IPv6 from this workstation and returned `CORE_API_DATABASE_UNAVAILABLE`; the supported session pooler remains the only usable local connection path. The alternate transaction-pooler port was also rejected after approximately 1.25 seconds/timeout behavior.
- A Singapore shared-pooler hostname was also tested in an isolated Core process. TCP was reachable, but Supavisor rejected the project identity (`ENOIDENTIFIER`/tenant not found) with both the shared-pooler and direct-style username forms. [Supabase's connection documentation](https://supabase.com/docs/guides/database/connecting-to-postgres) states that the `aws-[INDEX]-[REGION]` host must be copied from the project Connect dialog because the index is a pooler-cluster identifier, not something that can be safely inferred; no guessed host was committed.
- 31-second post-login probe: organization dashboard completed in 42.5 ms with `cache=HIT` and zero database queries, confirming the 60-second bounded snapshot window covers the observed shell navigation delay.
- Concurrent shell verification: `/api/auth/me?includeStores=true` and `/api/v1/hub/stores` completed in 6.6 ms combined, both returned 200 with `cache=HIT` and zero database queries.
- Supabase targeted index inspection confirmed the session lookup, application-connection, binding, and dashboard projection indexes used by this path; no speculative index migration was added.
- Live authenticated route checks: consolidated auth returned the authorized store index and dashboard remained a successful response

The full Hub instant-navigation source-level test still has an unrelated pre-existing failure because the dirty worktree's `apps/hub/app/routes/stores.tsx` is a re-export and no longer contains the inline `prefetch="intent"` text expected by that test. A later eight-sample benchmark rerun also recorded one 118.1 ms local Edge outlier on `/api/auth/me?includeStores=true` while Core reported `cache=HIT`, zero database queries, and 0.3 ms total work; a twelve-sample diagnostic immediately afterward measured 2.0–5.2 ms for the same route. A subsequent higher-sample run could not complete because the local Accounts boundary returned a transient 503 during login. These are local runtime conditions, not reproduced Core/database regressions.

## Remaining work for a true uncached and login sub-100-ms SLO

The measured first route after login is sub-100 ms because the Core-side snapshots are primed and retained for 60 seconds. A process-cold request that intentionally bypasses those snapshots is now one remote database exchange but still measured 180.2 ms; the bare `/ready` database probe is already 107–140 ms, and login itself remains above 100 ms in this local topology. To make uncached reads and login reliably sub-100 ms, measure and change the deployment boundary:

- deploy Core in the same region as the Supabase PostgreSQL project (`ap-northeast-2`), or move the database to the Core deployment region;
- use the supported regional/private PostgreSQL connection path and keep the Npgsql pool warm on every replica;
- use the exact host and username pair supplied by the database provider's Connect dialog; changing only the region string does not select a valid project pooler;
- if multiple Core replicas require shared snapshots, add a versioned distributed cache with explicit invalidation for session/access/read-model security state;
- keep authorization snapshots short-lived and invalidated on session, assignment, membership, role, entitlement, and store-binding writes;
- rerun the benchmark from the production edge and enforce the warm and uncached SLOs separately.

The Edge Gateway currently forces personalized responses to `no-store`, and Core's
cache is intentionally an in-process L1 optimization. A cookie-keyed browser or
Edge cache would bypass the explicit revocation and tenant-scope boundary, so it
was not introduced as a shortcut for the cold path.

The alternate local transaction-pooler port was tested in an isolated Core process and regressed this read to approximately 1.25 seconds with a timeout on one attempt, so it was not selected as an optimization.

No speculative database index migration was applied because the measured PostgreSQL plans already use indexes and database execution is not the bottleneck.
