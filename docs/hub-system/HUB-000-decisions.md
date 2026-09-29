# HUB-000 Decisions and Blockers

**Batch:** `BATCH-HUB-000`  
**Date:** 2026-09-24  
**Status:** **BLOCKED**  
**Rule:** These decisions record the baseline and the safe boundary for later work. They do not authorize migrations, route removal, data deletion, or production changes.

## Decided in this batch

| ID | Decision | Evidence / consequence |
| --- | --- | --- |
| D-000-01 | `aevo-digital-sing` is independent and excluded from Hub changes. | It is listed only as an independent application registry/runtime dependency. No source, schema, or data is modified. |
| D-000-02 | Hub supported local web origin is `http://localhost:4330`; the old `:4321` origin is stale. | Current launcher and Hub env use `:4330`; stale Edge CORS/test/config references remain for HUB-001. |
| D-000-03 | Edge is ingress/transport, not the tenant authorization authority. | Edge adds request ID/HMAC/CORS and forwards cookies/headers; Core must authenticate and authorize. |
| D-000-04 | Accounts is the identity broker; Core is the application session and authorization authority. | Accounts exposes provider/credential flows; Core owns app-scoped sessions and access decisions. |
| D-000-05 | App manifests must be declarative. | A future manifest may declare metadata/capabilities/origins/contracts, but must not execute arbitrary remote code or grant unreviewed permissions. |
| D-000-06 | HUB-000 is evidence and report-only. | Only inventories, ownership docs, phase notes, and a non-mutating baseline check are produced. |
| D-000-07 | No Store-to-Location rename is allowed in this batch. | Store is the shared physical/operational key today; a semantic change needs product/data approval and migration evidence. |

## Provisional architecture decisions

| ID | Provisional direction | Why it is not yet a cutover |
| --- | --- | --- |
| P-000-01 | Core API is the target owner for organization, store, membership, assignment, installation, device identity, control-plane audit, and Hub contracts. | Current public tables have duplicate migration trees and runtime writers. |
| P-000-02 | Infrastructure executes the canonical Core migration set and owns deployment/IAM/migration credentials. | Historical Hub/POS/Play migrations remain present and must be reconciled table-by-table. |
| P-000-03 | `aevo_app_sessions` is the target application-session store. | POS and Play still read/write `public.app_sessions`; revocation and session parity are unproven. |
| P-000-04 | `aevo_application_registry` is the target registry candidate. | `public.apps`, `public.application_registry`, and hard-coded consumers are still observed. |
| P-000-05 | Store app access is separate from entitlement, membership, and app feature configuration. | Current tables/routes exist, but the fail-closed evaluator and projection ownership are incomplete. |

## Blocked decisions

| ID | Decision needed | Blocking evidence | Required owner |
| --- | --- | --- | --- |
| B-000-01 | Which repository is the only migration authority for each shared `public.*` table? | Hub, POS, and Play migration trees overlap; runtime writers are also duplicated. | Core + Infrastructure + data owner |
| B-000-02 | Is `public.app_sessions` a supported session store or compatibility residue? | POS and Play local session managers still write it while Core uses `aevo_app_sessions`. | Security + app owners |
| B-000-03 | Who writes membership-store scope and app scope/role tables? | Readers are known, complete writers are not. | Core authorization + app owners |
| B-000-04 | What is billing source of truth and who owns webhook verification/idempotency? | POS owns concrete Stripe webhook/customer writes; Core reads projections. | Billing + Core + POS |
| B-000-05 | Are public subscription and entitlement tables projections or authorities? | Writer and reconciliation paths are incomplete; development access shortcut exists. | Billing + Security |
| B-000-06 | What is the exact Organization → Business/Brand → Store/Location hierarchy? | `public.brands` exists but semantics and lifecycle are not fully specified. | Product + data owner |
| B-000-07 | How is RLS context established for every Core and app transaction? | `aevo_*` policies use `current_setting`; public-table access uses explicit predicates, but a complete context proof is absent. | Security + Core |
| B-000-08 | Which Hub route inventory is contractually supported? | Core/TypeScript lists materially more routes than the partial OpenAPI document. | Core + Contracts |
| B-000-09 | Are provisioned Pub/Sub/Tasks/BigQuery resources active dependencies? | Worker Pub/Sub consumer is not configured; warehouse usage is not proven. | Infrastructure + Worker |

## Security decisions required before later batches

1. Development-only unlimited entitlement behavior must be isolated by an explicit local profile and must fail closed in every other environment.
2. Client-supplied organization/store headers must never override Core-derived membership and store scope.
3. App assignment, installation, entitlement, and feature access must return auditable reason codes without revealing cross-tenant existence.
4. Session revocation must be consistent across Core, Accounts, POS, Play, and Edge-forwarded requests.
5. RLS policy presence is not sufficient; transaction context, service identity, and negative cross-tenant tests must be evidenced in HUB-004.

## Product/data decisions required before schema work

- confirm whether `brands` is a first-class cross-app entity or an app-specific legacy concept;
- define Store versus Location without in-place renaming;
- define organization installation, store binding, app feature flags, and app-domain configuration as separate states;
- define how a template/duplicate store copies settings while excluding credentials, devices, sessions, billing identity, and audit history;
- define whether POS and Play may create shared organizations/stores directly or must call Core.

## Explicit non-decisions

- No table is renamed, dropped, truncated, or migrated by HUB-000.
- No legacy gateway, adapter, route, origin, test, migration, or compatibility file is deleted by HUB-000.
- No entitlement, auth, RLS, billing, worker consumer, or application registry behavior is changed by HUB-000.
- No tenant-isolation claim is made; tenant-security verification belongs to HUB-004.
- No new registry, installation, location, or migration compatibility table is created.

## Gate to leave BLOCKED

The batch can move to `VERIFIED` only when every known shared control-plane route/table/session/app-registry/migration owner has an accountable classification and all remaining missing evidence is explicitly external. At present, unknown writers and conflicting session/billing/migration authorities make the status `BLOCKED`.
