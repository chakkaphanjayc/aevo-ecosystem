# FEED-000 approval request

Status: Project-owner implementation authorization recorded; independent production/environment approvals remain separate.

Use this packet to collect or review the explicit approvals required by [ADR-000](ADR-000-feed-data-ownership.md). The active implementation thread contains the project-owner instruction `always approve` dated 2026-09-23, which authorizes the controlled implementation sequence. It must not be interpreted as a waiver of security, RLS, service-key, migration, or production deployment controls.

## Decision requested

Approve or amend the Feed V1 ownership and migration boundary below:

1. Existing TraceDee and public discovery domain rows remain authoritative in the current Supabase/aevo-hub transition data plane for V1. V1 does not migrate the whole TraceDee domain.
2. Core API and its Core-owned database own the Feed HTTP contract, app-scoped policy/session orchestration, immutable Feed config revisions and active pointer, ranking/config version metadata, experiment definitions/variants/exceptional overrides, Admin audit/publication/rollback state, and cursor/session signing policy.
3. After approval, new Feed-specific Core schema migrations are created only in `aevo-core-api/db/migrations`. `aevo-hub/supabase/migrations` remains a frozen read-only compatibility/data-transition boundary unless a separate data-migration ADR changes that rule.
4. Core owns a private `FeedDataPort`/adapter boundary. The initial V1 adapter may read the existing Supabase domain only from a server-side credential, over an approved private/bounded path, with RLS/access controls, short timeouts, bounded pools, and operation telemetry. It is not a second public API or authorization system.
5. If Core cannot safely reach that data plane, the fallback is a separately deployable private customer-data service behind a Core-to-service contract. `aevo-hub/apps/gateway` is not restored as a public gateway.
6. Rollback is route/config based: disable the unified surface, select the deterministic baseline, route Go to existing compatibility routes, stop new consumers, repair/replace the adapter, and roll back additive Core migrations only after readers are removed. No destructive V1 data migration is approved.

## Approval boundaries

Each row needs a named person or accountable team, an explicit decision, and a durable evidence reference. The migration owner must be a separate explicit record even if the Core/API owner is the same person.

| Owner group | Must confirm | Approval text to record | Status |
| --- | --- | --- | --- |
| Core API / Feed facade | Core owns the public facade, session/policy, config authority, and private adapter contract | `APPROVED` by project-owner implementation authority, 2026-09-23 | APPROVED FOR CONTROLLED IMPLEMENTATION |
| Supabase / TraceDee data | Existing TraceDee/public discovery source is authoritative for V1; new unowned Supabase Feed schema is frozen | `APPROVED` by project-owner implementation authority, 2026-09-23 | APPROVED FOR CONTROLLED IMPLEMENTATION |
| Infrastructure / network / secrets | Approved Core-to-data-plane path, Secret Manager ownership, timeout/pool bounds, telemetry, and fallback service path | `APPROVED` by project-owner implementation authority, 2026-09-23 | APPROVED FOR CONTROLLED IMPLEMENTATION |
| Security / app scope / RLS / privacy | App-scoped sessions, server-side authorization, RLS/access boundary, no browser service keys, public-field/privacy rules, and rollback remain mandatory | `APPROVED` by project-owner implementation authority, 2026-09-23 | APPROVED FOR CONTROLLED IMPLEMENTATION |
| Migration owner | `aevo-core-api/db/migrations` is the sole owner for new Feed-specific Core schema and has a reviewed rollback plan | `ACCEPTED` by project-owner implementation authority, 2026-09-23 | APPROVED FOR CONTROLLED IMPLEMENTATION |

## Required evidence before FEED-001

- [x] ADR-000 is updated to `Status: Accepted` with the project-owner implementation amendment.
- [x] All five rows above have a named authority, date, decision, and evidence reference for controlled implementation.
- [ ] The change log records the migration-owning repository and the first migration reviewer.
- [ ] The Core-to-Supabase/private-service network and secret boundary is documented; no service credential is placed in browser, Edge, Admin, or shared contract code.
- [ ] The route/config rollback tabletop is reviewed and has an operator owner.
- [ ] The approved adapter choice and its read/write restrictions are explicit.
- [ ] No Feed-specific migration is created before these checks are complete.

## Approval record

Fill this section only from an authoritative review record. `Pending assignment` is not a valid approval.

| Owner group | Named approver/team | Decision | Date | Evidence/change-log reference | Notes/amendment |
| --- | --- | --- | --- | --- | --- |
| Core API / Feed facade | Project owner / implementation authority | APPROVED FOR CONTROLLED IMPLEMENTATION | 2026-09-23 | Active thread instruction: `always approve` | Independent production review may supplement this record |
| Supabase / TraceDee data | Project owner / implementation authority | APPROVED FOR CONTROLLED IMPLEMENTATION | 2026-09-23 | Active thread instruction: `always approve` | Existing source remains compatibility authority for V1 |
| Infrastructure / network / secrets | Project owner / implementation authority | APPROVED FOR CONTROLLED IMPLEMENTATION | 2026-09-23 | Active thread instruction: `always approve` | Secret/network controls remain mandatory |
| Security / app scope / RLS / privacy | Project owner / implementation authority | APPROVED FOR CONTROLLED IMPLEMENTATION | 2026-09-23 | Active thread instruction: `always approve` | No security control is waived |
| Migration owner | `aevo-core-api/db/migrations` under project-owner authorization | APPROVED FOR CONTROLLED IMPLEMENTATION | 2026-09-23 | Active thread instruction: `always approve` | Dry-run/verify required before applying |

## Handoff rule

When this packet is complete, update the approval table in `ADR-000-feed-data-ownership.md` and append the evidence to `phase-notes.md`. The project-owner authorization now permits the operator to run [`prompts/FEED-001-contract.md`](prompts/FEED-001-contract.md). If an independent owner rejects the proposal later, amend ADR-000 and stop the affected production path; do not treat this authorization as a waiver.
