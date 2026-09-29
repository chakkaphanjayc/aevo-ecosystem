# Repository Map

## Scope and evidence

This map was produced from the repository READMEs, local launchers, route implementations, migration directories, and test suites on 2026-09-24. It describes the current state, not an assumption about the desired end state.

## Repositories

| Repository | Current role | Main evidence | Long-term status | Notes |
| --- | --- | --- | --- | --- |
| `aevo-hub` | Organization owner/admin UI | `apps/hub/app/routes/*`, `README.md` | KEEP BUT NARROW | Modern console only; no longer the API/migration owner. |
| `aevo-core-api` | Canonical control-plane API and session/authorization authority | `src/Aevo.CoreApi/Program.cs`, `HubApiEndpoints.cs`, `Data/*` | KEEP AND EXPAND | Still backed by transitional `public.*` tables for Hub domains. |
| `aevo-edge-gateway` | Public worker ingress to Core | `src/index.ts`, `test/index.test.ts` | KEEP BUT NARROW | No business authorization; stale `:4321` compatibility remains. |
| `aevo-accounts` | Identity broker and SSO/password boundary | `src/index.ts`, `README.md` | KEEP BUT NARROW | Core owns durable app session and org/app authorization. |
| `aevo-admin` | Privileged platform control plane UI | `apps/admin/app/routes/*`, `README.md` | KEEP SEPARATE | Must remain isolated from organization-owner Hub UI. |
| `aevo-contracts` | Versioned cross-repository contracts | `src/index.ts`, `src/hub-domain.ts`, `openapi/v1.json` | KEEP AND EXPAND | Remove duplicate control-plane contracts over time. |
| `aevo-infrastructure` | Terraform, IAM, Cloud Run, Cloud SQL, eventing, secrets, DNS | `modules/*`, `scripts/check-migration-ownership.ts` | KEEP AND EXPAND | Migration service account and runtime resources are defined here. |
| `aevo-background-worker` | Probe worker and future event/task consumer | `src/index.ts`, tests | KEEP BUT NARROW | Probe vertical is useful; event consumer is currently disabled. |
| `aevo-pos` | POS operational app | app routes, API, Supabase migrations | KEEP AS APP OWNER | Still contains app-local auth/db/contract and shared-table migration residue. |
| `aevo-play` | Booking/venue operational app | app routes, API, Supabase migrations | KEEP AS APP OWNER | Same shared control-plane migration overlap as POS. |
| `aevo-go` | Customer-facing app and customer gateway | `src/features/*`, gateway code | KEEP AS CUSTOMER SURFACE | Must consume only customer-safe projections and app-scoped session. |
| `aevo-digital-sing` | Independent document-signing product | its own runtime and data stack | OUT OF SCOPE / KEEP INDEPENDENT | Do not migrate, delete, or refactor as part of Hub work. |

## Runtime topology currently documented

```text
Browser
  ├─ Hub :4330 ───────┐
  ├─ Admin :4335       │
  ├─ Play :4331       ├─ Edge/API boundary ── Core API :5099
  ├─ POS :4332        │                           ├─ Accounts :8787 (identity broker)
  └─ Go :4324 ────────┘                           └─ PostgreSQL / transitional public schema

Background Worker ── probes/events/tasks ── Core internal endpoints
Infrastructure ───── Cloud Run / SQL / Pub/Sub / Tasks / secrets / DNS
```

The authoritative local port and launch behavior is documented in `LOCAL_DEVELOPMENT.md` and `scripts/local-dev.ts`. The Edge worker is the only public `/api/*` ingress in the current Hub profile.

## Boundary findings

- No single repository should own both browser UI and the canonical control-plane API.
- The presence of old Supabase migrations in Hub does not by itself mean Hub still owns migrations; runtime ownership is now delegated to Core, but the schema/data ownership transition is incomplete.
- POS and Play remain app owners, but shared organization/membership/store tables must have one migration authority and one authorization contract.
- `aevo-digital-sing` is deliberately excluded from all Hub migration phases.

