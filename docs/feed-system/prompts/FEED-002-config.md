# Implementation prompt — BATCH-FEED-002-CONFIG

You are executing `BATCH-FEED-002-CONFIG` for the Aevo Feed. This batch may create Core-owned migrations only after `BATCH-FEED-000-ADR` is VERIFIED and the accepted ADR names `aevo-core-api` as the migration owner. If that evidence is absent, stop before editing a migration and report BLOCKED.

## Objective

Replace overlapping immediate flags with one Core-owned, typed, auditable Feed configuration lifecycle:

```text
draft -> validate -> immutable revision -> publish active pointer -> propagate/health -> rollback
```

The active config must be consumable by the future Feed facade and must fall back to the last valid revision, then a deterministic code baseline. There must be one source of truth; existing Supabase/TraceDee flags are compatibility inputs only and are not written by this batch.

## Allowed repositories and scope

- `aevo-core-api`: Core migrations (only after FEED-000 approval), typed config model/validator/service, admin endpoints, publication/rollback/audit, propagation health, and focused tests.
- `aevo-contracts`: versioned config/admin request-response types and error codes.
- `aevo-admin`: only typed API client/contract fixtures or a minimal read-only integration required to prove the Core contract; do not build the full Feed Admin UI (FEED-009).
- `aevo-background-worker` and `aevo-infrastructure`: only the smallest publication/health binding required by an already-owned existing event path. Do not provision a new queue/topic/secret in this batch.

Do not edit `aevo-hub/supabase/migrations`. Do not create a second config table there.

## Required configuration behavior

Define strict schema/versioned fields for bounded runtime controls: source enablement, candidate budgets/minimums, ranking mode/weights/version, freshness, coarse geo radius, diversity/source ratios, exploration quota, bounded cache TTL, event sampling, rollout/variants, safety policy, and kill switches. For every field record type, default, minimum/maximum or enum, cross-field rules, safe fallback, and whether it is runtime-tunable.

Reject or ignore as invalid any SQL/table/RPC name, ranking expression, credential, storage setting, Pub/Sub/Cloud Tasks/Cloud Run setting, unbounded worker concurrency, unsafe timeout/query/connection-pool limit, or arbitrary JSON path that would turn Admin into infrastructure control.

Implement:

1. Immutable draft/revision records with schema version and validation result.
2. Active publication pointer with optimistic concurrency/version conflict behavior.
3. Structured audit event with actor, app scope, reason, request ID, before/after version, and safe diff metadata.
4. GET active/draft/revisions, POST draft/validate/publish/rollback, guardrail/propagation health endpoints as approved by the FEED-001 contract.
5. App-scoped Admin auth, platform permission, CSRF, idempotency, and no direct Supabase access.
6. Last-known-good and deterministic baseline fallback, with explicit health/degraded state.
7. Compatibility read/mismatch telemetry for old flags without allowing direct old-store writes.
8. Deterministic experiment bucketing from stable user key + experiment ID + salt; do not create per-user assignments by default.

## Migration and rollback rules

- Use the single accepted migration owner and the repository's existing migration runner.
- Keep migrations additive, rerunnable, versioned, and rollback-aware.
- Do not delete or rewrite existing canonical TraceDee data.
- Before applying, run migrator dry-run; after applying in an approved environment, run verify and record the migration IDs.
- A failed publication must leave the previous active version serving. A rollback must change the active pointer, not delete revision/audit history.

## Verification

Run all applicable checks:

```sh
cd aevo-contracts && bun run check
cd aevo-core-api && dotnet build src/Aevo.CoreApi/Aevo.CoreApi.csproj
cd aevo-core-api && dotnet build src/Aevo.CoreApi.Migrator/Aevo.CoreApi.Migrator.csproj
cd aevo-core-api && dotnet run --project src/Aevo.CoreApi.Migrator/Aevo.CoreApi.Migrator.csproj -- --dry-run
cd aevo-core-api && dotnet run --project src/Aevo.CoreApi.Migrator/Aevo.CoreApi.Migrator.csproj -- --verify
cd aevo-admin && bun run check
cd aevo-background-worker && bun run typecheck && bun run test && bun run build
cd aevo-infrastructure && bun run check
```

Do not convert missing database settings into a pass. If migrator dry-run/verify cannot run, mark the batch BLOCKED or VERIFIED-with-follow-up only according to the project owner’s explicit policy and record the exact reason. Add focused validator, bounds, fallback, publish/rollback, idempotency, permission/CSRF, audit, mismatch, infrastructure-field rejection, and deterministic-bucketing tests. Run `git diff --check` in every changed repository.

## Stop condition and handoff

Stop after config checks and migration evidence are recorded. Do not implement the public Feed endpoint, candidate generators, ranking, or live Admin Feed screens in this batch. The phase note must state the active config version and prove that there is no second authoritative Supabase config writer. FEED-003 starts only from this accepted config contract or an explicit decision to use the deterministic code baseline while config publication is still disabled.
