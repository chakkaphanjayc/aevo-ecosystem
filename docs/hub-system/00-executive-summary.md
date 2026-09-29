# Aevo Hub Architecture Baseline — Executive Summary

**Audit date:** 2026-09-24  
**Scope:** `aevo-hub` and the repositories that form its control-plane boundary  
**Explicit exclusion:** `aevo-digital-sing` source and data  
**Batch:** `BATCH-HUB-000 — Baseline, Ownership Ledger, Route/Data Authority Inventory`  
**Status:** **BLOCKED**. This batch adds only evidence, ownership decisions, inventories, and a report-only validation script. No production migration, route deletion, data deletion, or infrastructure behavior change is authorized.

## Decision summary

The current direction is sound: Hub is becoming a UI/control-plane consumer, while Edge handles ingress and Core API owns authentication-facing authorization, app sessions, organization/store control-plane operations, entitlements, audit, and migration execution. Accounts is an identity broker, not an organization-permission authority.

The migration is not complete. The main risks are ownership overlap and stale compatibility surfaces:

1. Core owns the new Hub API surface, but the domain still reads and writes Supabase-shaped `public.*` tables that are also represented in POS/Play migrations and the historical Hub migration tree.
2. `aevo-hub` is modern-only at runtime. HUB-001 removed the removed local `:4321` origin from the Hub Edge allowlist and updated the active preflight test; historical/POS legacy references remain explicitly classified.
3. The Core contract advertises a partial implementation even though the route inventory is materially larger; this makes capability discovery unreliable.
4. Entitlement checking contains a development shortcut that returns `allowed = true`; this must never be treated as production authorization.
5. The connection test currently checks an app `/health` endpoint. It does not prove signed API compatibility, tenant isolation, session exchange, or feature availability.
6. Onboarding still returns the removed `/modern/organize` route in one path.
7. Eventing and analytics infrastructure exists, but the worker event consumer is intentionally not configured and there is no demonstrated warehouse/read-model pipeline.

## Recommended target boundary

| Boundary | Long-term responsibility | Audit result |
| --- | --- | --- |
| Accounts | Identity provider broker, PKCE/redirect policy, credential operations, SSO handoff | Keep and narrow |
| Core API | App sessions, authorization, organization/business/location control plane, app registry, installations, entitlements, audit, canonical contracts | Keep and expand |
| Edge Gateway | Public ingress, CORS, request IDs, signature forwarding, rate/WAF integration point | Keep and narrow |
| Hub | Organization owner/admin UI and BFF-style Core API consumer | Keep and narrow |
| Admin | Privileged platform operator UI | Keep separate |
| POS / Play / Go | App-specific operational/customer domain and UI | Keep as app owners |
| Background Worker | Probes, asynchronous projections, event/task consumers | Keep but narrow; finish only needed verticals |
| Infrastructure | Cloud resources, IAM, secrets, migration execution path | Keep and expand |
| Contracts | Versioned inter-repository transport and domain boundary | Keep and expand |

## Critical gates before production cutover

- Establish one migration authority for organization, store, membership, application access, billing projection, and audit data.
- Replace every route/port reference to removed Hub legacy surfaces, especially `:4321` and `/modern/organize`.
- Make entitlements and app assignments fail closed; keep development unlimited mode impossible outside an explicitly isolated local profile.
- Publish a versioned Hub contract that matches the implemented Core route inventory and generate client types from it.
- Add integration tests for owner, member, store, app, and cross-tenant denial paths across Hub, Core, Edge, Accounts, POS, Play, and Go.
- Define an observable connection handshake instead of treating liveness as compatibility.
- Prove RLS transaction context and service-to-service authorization for every Core data access path.

## Current overall rating

**Architecture direction: GOOD. Migration completeness: PARTIAL. Ownership safety: PARTIAL/HIGH RISK.**

The repositories are in a useful development state, but the system should not be considered ready for an irreversible legacy removal or production data cutover until the gates above are evidenced by tests and migration reports. HUB-001 and later batches have not started; see [`HUB-000-decisions.md`](HUB-000-decisions.md) and [`phase-notes.md`](phase-notes.md) for the current block.
