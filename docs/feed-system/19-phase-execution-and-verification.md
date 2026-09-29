# Feed phase execution and verification plan

Status: FEED-000 accepted for controlled implementation; FEED-001 through FEED-009 controlled slices and the connected local runtime gates are recorded in `phase-notes.md`; Feed production secret wiring and production-like Core/Worker readiness guards are verified as a configuration contract. Production deployment, route switch, and rollout evidence remain open.

ARCHITECTURE REVIEW REVISION

## Purpose

This document turns the Feed architecture plan into small, auditable implementation batches. Each batch has one objective, an explicit repository boundary, a copy-paste implementation prompt, tests that match the current repository scripts, and an acceptance gate. The agent executing a batch must stop after that gate and hand back evidence; it must not continue into the next FEED task automatically.

For a visual overview of the config lifecycle, fallback order, and target request path, see [`20-config-and-feed-flow-graphs.md`](20-config-and-feed-flow-graphs.md). The diagrams describe the original sequential gates; the current implementation/evidence ledger is maintained in [`phase-notes.md`](phase-notes.md).

The first execution path is deliberately:

```text
BATCH-FEED-000-ADR
        -> BATCH-FEED-001-CONTRACT
                -> BATCH-FEED-002-CONFIG
                        -> BATCH-FEED-003-FACADE
```

The architecture allows FEED-002 and FEED-003 to overlap after the contract is stable, but the default runbook keeps them sequential because the facade must consume one active config source and the current workspace has overlapping Core/Supabase flag stores. Do not parallelize them unless the phase note names disjoint files and a reviewer accepts the split.

## Operating rules for every batch

1. Read the linked prompt completely before changing a repository.
2. Capture the preflight state of every touched repository. Existing dirty or untracked work belongs to the user; do not reset, clean, stash, or overwrite it.
3. Work only inside the prompt's allowed files/areas. If the implementation requires a new repository, migration owner, secret, package, route, or data source outside that boundary, stop and record a blocker.
4. Keep the browser untrusted. No client-selected actor, tenant, rank, source, SQL, Supabase service key, or Admin privilege may cross the public boundary.
5. Run the required checks for every repository changed by the batch. A check that cannot run because a dependency, runtime, database, or credential is missing is `blocked`, not `passed`; record the exact command and reason.
6. Review `git diff --check` for every changed nested repository, inspect the root-document diff with the workspace's available review tooling when the root is not a Git repository, and review the ownership/security boundary before declaring a batch ready.
7. Write the phase note before starting the next batch. The note must include commit/diff identity if available, commands, outputs or links to logs, failures, decisions, rollback, and the next gate.
8. Do not broaden the batch because a nearby issue is convenient. Create a follow-up batch or update the plan first.

## Batch gates

| Batch | Scope | Repositories | Migration rule | Required exit gate |
| --- | --- | --- | --- | --- |
| `BATCH-FEED-000-ADR` | Ownership, migration, adapter, secrets, and rollback decision | Root docs; Core/Hubs/infrastructure boundary docs as needed | No migration or runtime change | ADR-000 accepted by named Core/API, TraceDee/Supabase data, infrastructure/secrets, and security owners; migration owner recorded |
| `BATCH-FEED-001-CONTRACT` | Versioned Feed request/response/event boundary and compatibility inventory | `aevo-contracts`, `aevo-core-api`, `aevo-edge-gateway`, optionally `aevo-go` fixtures and `aevo-hub` boundary docs | No production schema migration | Contract checks pass; endpoint/origin matrix is explicit; adapter boundary is private; FEED-000 decision is referenced; no Hub Gateway is restored |
| `BATCH-FEED-002-CONFIG` | Typed Core config revisions, validation, publication, rollback, audit, and propagation health | `aevo-core-api`, `aevo-contracts`, optionally `aevo-admin`, worker/infrastructure only when contractually required | Core migrations only, and only after accepted FEED-000 | Active config is one versioned source; invalid/infrastructure fields are rejected; publish/rollback/audit/idempotency/permission tests pass; last-known-good fallback is observable |
| `BATCH-FEED-003-FACADE` | Core public Feed facade, FeedSessionContext, signed cursor, and private candidate/hydration ports | `aevo-core-api`, `aevo-contracts`, `aevo-edge-gateway`; no Go UI switch yet | No new candidate/materialized-session schema required | Empty typed page is safe; session/cursor are bound and deterministic; actor/scope/filters cannot be overridden; tamper/expiry/page-insertion tests pass |

## Repository verification matrix

Run the rows for repositories that the batch actually changes. Do not report a repository as verified merely because another repository passed.

| Repository | Baseline check | Additional check when relevant | Notes |
| --- | --- | --- | --- |
| `aevo-contracts` | `bun run check` | Inspect `openapi/v1.json` diff and run focused `bun test` if available | `check` runs OpenAPI validation, TypeScript typecheck, and Bun tests |
| `aevo-core-api` | `dotnet build src/Aevo.CoreApi/Aevo.CoreApi.csproj` | `dotnet build src/Aevo.CoreApi.Migrator/Aevo.CoreApi.Migrator.csproj`; `dotnet test tests/Aevo.CoreApi.Tests/Aevo.CoreApi.Tests.csproj`; migrator `-- --dry-run` and `-- --verify` when database settings are available | FEED-002 adds a focused validator/fallback test project; database-backed lifecycle/RLS tests remain an environment follow-up |
| `aevo-edge-gateway` | `bun run typecheck && bun test` | `bun run build` for worker bundle/origin changes | HMAC ingress remains an ingress boundary, not end-user authorization |
| `aevo-admin` | `bun run check` | Run the focused route/type check from `apps/admin` when changing only Admin code | Admin must call Core BFF/API; no direct Supabase access |
| `aevo-hub` | `bun run typecheck` | `bun test packages/auth packages/auth-client packages/app-access packages/tenant-context packages/permissions packages/api-contract` for boundary changes | FEED-000/001 should normally update docs only; do not add a new Hub API or migration |
| `aevo-go` | `bun run typecheck && bun run test` | `bun run build` for client/worker changes | FEED-003 does not switch the live client; full Go migration is FEED-008 |
| `aevo-infrastructure` | `bun run check` | `terraform fmt -check`, `terraform init -backend=false`, and `terraform validate` per stack when Terraform changes are authorized | No new queue/topic/secret is justified by a contract-only batch |

## Phase procedure and evidence

### Phase 0 — FEED-000 ownership ADR

Prompt: [`prompts/FEED-000-ADR.md`](prompts/FEED-000-ADR.md)

Approval packet: [`FEED-000-approval-request.md`](FEED-000-approval-request.md)

Expected output is an accepted or explicitly amended ADR, not code. The note must name the migration-owning repository, canonical V1 domain source, Core adapter/network/secrets boundary, long-term destination, and route/config rollback. If any owner declines or the decision remains ambiguous, mark the phase `blocked` and do not begin FEED-001.

Verification is documentary: inspect the ADR, ownership matrix, repository boundary docs, and rollback tabletop record; run the root-document self-check described in the prompt and `git diff --check` for any changed nested repository. No migration runner, schema file, dependency, deploy, or runtime setting may change.

### Phase 1 — FEED-001 contract boundary

Prompt: [`prompts/FEED-001-contract.md`](prompts/FEED-001-contract.md)

The contract batch publishes one versioned request/response/event vocabulary and an explicit current-route compatibility matrix. It may add contract types, Core interfaces/route inventory, Edge route tests/config documentation, and non-live Go fixtures. It must not implement candidate generators, ranking, config persistence, client rollout, or schema migration.

The phase note must include the exact endpoint path, origin chain, auth/session behavior, compatibility mapping, public-field allowlist, contract version, and the result of every touched-repository check. FEED-002 and FEED-003 are not unblocked if the client or Admin still needs to know whether data came from Supabase, Hub, or Core.

### Phase 2 — FEED-002 config control plane

Prompt: [`prompts/FEED-002-config.md`](prompts/FEED-002-config.md)

This is the first batch that may create Core-owned Feed migrations, and only after the FEED-000 approval evidence is recorded. The config service must use immutable revisions plus an active pointer, typed validation, bounded runtime-only fields, structured audit, publish/rollback, propagation health, and deterministic safe fallback. It must not create a parallel Supabase config store or expose infrastructure settings through Admin.

The phase note must include migration IDs, dry-run/verify evidence, schema/version compatibility, permission/CSRF/idempotency tests, rollback result, and a record that the Feed facade consumes the active version without a second authority. If database verify cannot run because `AEVO_DATABASE_URL` is unavailable, record the exact failure and keep the deterministic code baseline as the explicit fallback; do not claim production migration state.

### Phase 3 — FEED-003 Core facade and sessions

Prompt: [`prompts/FEED-003-facade-session.md`](prompts/FEED-003-facade-session.md)

This batch creates the public Core boundary and the deterministic session/cursor primitives. It may return an empty typed page while candidate generators remain outside the batch; it must never fabricate content. The private `FeedDataPort`/repository boundary is the seam for the later TRACE and PLACE generators.

The phase note must include route and contract compatibility, session field behavior, cursor signing/binding/expiry, request fingerprint rules, anonymous/authenticated policy, rate-limit behavior, and the content-insertion-between-pages test. FEED-004 is still blocked until this note is accepted.

## Handoff note template

Copy the following into [`phase-notes.md`](phase-notes.md) for every completed or blocked batch:

```md
## BATCH-FEED-XXX — <title>

- Status: READY | IN_PROGRESS | VERIFIED | BLOCKED | ROLLED_BACK
- Date/time and operator:
- Prompt:
- Parent decision/gate:
- Repositories touched:
- Pre-existing dirty/untracked work preserved:
- Files/areas changed:
- Files/areas deliberately not changed:
- Implementation summary:
- Contract/schema/config versions:
- Commands run and result:
- Evidence links or log paths:
- Security/tenant/RLS/secret review:
- Migration and rollback result:
- Decisions and open risks:
- Follow-up items (separate batch IDs):
- Next gate:
```

`VERIFIED` means the acceptance gate and all applicable repository checks passed. `BLOCKED` means a required external decision, runtime, database, credential, or test capability was unavailable; it is not a substitute for a failing test. `ROLLED_BACK` records a deliberate safe revert and must include the reason and the route/config state restored.

## What is intentionally not in these first prompts

- FEED-004 candidate generators and server-side TRACE/PLACE composition;
- FEED-005 calibration, ranking, diversity, and exploration selection;
- FEED-006 event consumer wiring and high-volume impressions;
- FEED-008 live Aevo Go migration;
- FEED-009 Admin Feed screens;
- FEED-010 production safety launch gate;
- FEED-011 post-V1 POST/TRACER/media work;
- FEED-012 production rollout.

Those tasks remain in `feed-implementation-plan.md` and require the preceding phase notes as evidence.
