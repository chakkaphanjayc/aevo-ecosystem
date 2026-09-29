# Migration Strategy

## Principles

- The source plan is audit-only; this document describes future phases and does not authorize execution.
- `aevo-digital-sing` is excluded from all Hub migration steps.
- Prefer expand → backfill → dual-read/compare → switch writes → observe → contract → remove.
- Do not delete historical migrations until the target schema and restore procedure are proven.
- Every phase has a measurable exit gate.

## Phase 0 — inventory and freeze

Create the table/writer/reader inventory, route/port inventory, contract inventory, and callback matrix. Freeze creation of new duplicate control-plane tables. Add CI checks for Hub legacy references and direct browser/database access.

**Exit:** signed ownership ledger and clean baseline reports.

## Phase 1 — security and contract gates

Release the matching Core/Edge/Contracts version. Fail closed on entitlement and assignments. Fix stale route/origin contracts. Add tenant-security tests and compatibility handshake tests.

**Exit:** all P0 security and contract tests pass in clean local and CI environments.

## Phase 2 — control-plane projection convergence

Reconcile organization, business/brand, store, membership, app registry, installation, binding, and assignment rows. Introduce Core-owned writes and compare legacy reads. Record discrepancies and resolve them explicitly.

**Exit:** zero unexplained divergence for the agreed observation window; app consumers use Core projections.

## Phase 3 — billing and provisioning

Verify webhook source of truth, populate Core entitlement projections, and emit idempotent installation/binding provisioning events. Add app readiness and retry states.

**Exit:** subscription lifecycle scenarios produce deterministic access decisions and audit records.

## Phase 4 — worker/event/read-model maturity

Implement only the event/task verticals needed by Hub. Add dashboard projections and freshness. Keep generic analytics/plugin work deferred.

**Exit:** lag/retry/dead-letter/health signals are observable and tested.

## Phase 5 — deprecate compatibility surfaces

Remove old runtime entrypoints, stale routes/origins, duplicate writers, and migration compatibility code only after the conditions in `19-redundancy-and-deprecation.md` are met.

**Exit:** repository search, deployment configuration, smoke tests, and telemetry show no supported dependency.

## Rollback principles

- Keep legacy source data read-only until reconciliation and restore tests pass.
- Roll back application writes via feature flags or deployment rollback, not by reverting applied migrations.
- Use compensating data migrations for incorrect projections.
- Preserve audit and migration ledgers during rollback.
- Never roll back by re-enabling a deleted security bypass.

