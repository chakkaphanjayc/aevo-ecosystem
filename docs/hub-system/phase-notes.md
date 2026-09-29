# Hub Implementation Phase Notes

## Status

**IMPLEMENTED_AND_VERIFIED_IN_DEVELOPMENT**

The baseline, fail-closed entitlement gate, signed application compatibility handshake, tenant-context guard, RLS transaction-context check, Core-owned assignment projection, contract synchronization, manifest-backed application catalog, installation projection, store binding, billing/entitlement projection, and typed store application configuration are implemented in development. The verified Hub/POS/Play control-plane cutover is complete: Core owns app sessions and the retired public compatibility schema has been removed. Provider lifecycle depth, launch handoff, and app-domain ownership remain follow-on work.

## Date and operator

- **Date:** 2026-09-25
- **Operator:** Codex
- **Prompt/source:** Updated `/Users/jayc/Project/aevo-ecosystem/hub_implementation_plan.md`
- **Batch executed:** `BATCH-HUB-000 baseline plus Core cutover and legacy-retirement slices`
- **Scope:** Aevo Hub control-plane boundary and in-scope first-party applications
- **Explicit exclusion:** `aevo-digital-sing`

## Repositories inspected

| Repository | Branch/state observed before this batch | Role | Touched in this batch |
| --- | --- | --- | --- |
| `aevo-hub` | `main`, dirty from implementation batch | Hub UI and retained app-domain history | Yes |
| `aevo-core-api` | `main`, no commits, implementation files present | Core API/control plane | Yes |
| `aevo-edge-gateway` | `main`, no commits, 10 untracked | Edge ingress | No |
| `aevo-accounts` | `main`, no commits, 10 untracked | Identity broker | No |
| `aevo-admin` | `main`, no commits, 12 untracked | Privileged platform UI | No |
| `aevo-contracts` | `main`, no commits, 9 untracked | Shared contracts | No |
| `aevo-background-worker` | `main`, no commits, 10 untracked | Worker/probes/events | No |
| `aevo-infrastructure` | `main`, no commits, 9 untracked | Cloud/IAM/migration resources | No |
| `aevo-pos` | `main`, implementation changes present | POS app | Yes |
| `aevo-play` | `production`, implementation changes present | Play app | Yes |
| `aevo-go` | `main`, no commits, 19 untracked | Customer app | No |
| `aevo-digital-sing` | independent, no commits, 23 untracked | Separate product | **Excluded; no reads/writes** |

The workspace root is not itself a Git repository. Existing dirty and untracked work was preserved; no reset, clean, stash, or checkout was run. Development migrations and targeted legacy deletions were applied only to the in-scope repositories; `aevo-digital-sing` was not touched.

## Artifacts created

Machine-readable inventories:

- `docs/hub-system/inventory/repositories.json`
- `docs/hub-system/inventory/origins.json`
- `docs/hub-system/inventory/routes.json`
- `docs/hub-system/inventory/sessions.json`
- `docs/hub-system/inventory/applications.json`
- `docs/hub-system/inventory/contracts.json`
- `docs/hub-system/inventory/writers.json`
- `docs/hub-system/inventory/tables.json`
- `docs/hub-system/inventory/events.json`
- `docs/hub-system/inventory/infrastructure.json`
- `docs/hub-system/inventory/redundancy.json`

Decision and ownership documents:

- `docs/hub-system/ownership-ledger.md`
- `docs/hub-system/HUB-000-decisions.md`
- this file
- `docs/hub-system/inventory/README.md`
- report-only `scripts/hub-baseline-check.ts`

Updated existing workspace artifacts:

- `docs/hub-system/00-executive-summary.md`
- `docs/hub-system/hub-implementation-plan.md`
- root `package.json` (`check:hub:baseline` report-only command)

Every JSON inventory has `schema`, `inventoryVersion`, `batch`, `generatedAt`, and `entries`. No credentials, tokens, provider secrets, or secret values are stored.

## Coverage findings

### Routes and origins

- Edge `/api/*` is the public transport boundary; Core is the control-plane runtime owner.
- Accounts owns provider-facing identity routes; Core owns app session and authorization-facing routes.
- Hub modern local origin is `:4330`; the removed Hub `:4321` surface remains only in explicitly tracked stale/compatibility inventory entries.
- Core onboarding returns the current `/modern` Hub route; `/modern/organize` is not a supported canonical route.
- Core/TypeScript inventories describe 49 Hub route entries and the synchronized OpenAPI artifact contains 76 total paths with all 49 Hub route entries represented.

### Data and migration ownership

- Core owns the applied migration set and direct Hub control-plane data store; Infrastructure is the migration executor.
- Hub, POS, and Play retain only app-domain migration history for their own schemas; confirmed Hub control-plane migration files were removed and are blocked by the legacy-removal checks.
- Core owns the confirmed control-plane session, assignment, binding, installation, entitlement, billing, registry, and template authorities. Organization/store/membership tables remain shared domain tables with Core as the current write boundary.
- Development migrations and backfills are applied through 30 Core migration records; no production data migration was performed.

### Identity, session, and authorization

- Accounts is the identity broker; Core is the intended app-session and authorization authority.
- Core uses `aevo_app_sessions`; POS and Play resolve sessions through Core and their local session-manager packages are removed.
- Session authority is canonical in Core for all in-scope first-party applications.
- No tenant-isolation claim is made. RLS policy presence and transaction context require HUB-004 tests.

### App registry, installation, and entitlements

- Core `aevo_application_registry` is the development canonical registry; public catalogs and hard-coded fallback metadata remain compatibility-only.
- Store app access is distinct from organization entitlement, membership, and app feature configuration.
- Entitlement evaluation reads the Core canonical subscription/entitlement projection and fails closed; explicit local test fixtures remain separate from runtime authorization.

### Billing

- POS verifies provider webhooks and forwards production events to Core; Core owns the immutable billing event ledger and subscription/entitlement projections.
- Public billing tables and public entitlement/catalog compatibility relations are retired; lifecycle/replay/restore depth remains a Core follow-on test area.

### Worker, events, and infrastructure

- Core outbox, Pub/Sub/DLQ, Cloud Tasks, Cloud SQL, IAM, Secret Manager, and Cloudflare infrastructure are inventoried.
- Worker probes are active/transitional; Pub/Sub consumer returns not-configured behavior.
- Provisioned resources are not counted as active consumers.

### Redundancy

11 redundancy surfaces were catalogued: Edge remains narrow, the Hub legacy gateway and local app-session/control-plane compatibility surfaces are removed and guarded, app-domain migrations remain with their owning apps, and Digital Sign remains independent.

## Security observations

- Stale `:4321` CORS/config references can create callback/origin drift.
- Edge forwards browser credentials and adds a gateway signature; authorization remains downstream.
- Core `aevo_*` RLS policies use `current_setting` values, but complete transaction-context establishment was not proven.
- Public-table paths often use explicit organization/store predicates; this must be tested against conflicting headers and service identities.
- No browser/provider secret values were copied into inventory artifacts.
- A development entitlement shortcut must never be treated as production authorization.
- Unknown writers are treated as blockers, not as safe-by-default.

## Open blockers

1. One accountable migration authority per remaining shared table.
2. One app-session authority and proof that POS/Play local packages are adapters only.
3. Complete writer discovery and cutover for membership-store scope, app scopes/roles, and the POS trial compatibility path.
4. Provider lifecycle/replay/restore evidence before public billing compatibility removal.
5. Organization/business/brand/store/location semantics.
6. RLS transaction context and tenant-security evidence for the remaining app-owned readers.
7. Typed app configuration and launch handoff contract coverage.

## Commands and tests executed

- Read-only repository and Git status inventory across every in-scope repository.
- Read-only source/migration/route/writer scans using `rg` and `find`.
- JSON parse checks for all inventory artifacts.
- Inventory count/key inspection with Node.
- `bun --check scripts/hub-baseline-check.ts` — passed.
- `bun run scripts/hub-baseline-check.ts` and `bun run check:hub:baseline` — passed; stale references were reported as warnings only.
- `git diff --check` is required for each touched Git repository; this batch intentionally touched no source repository.
- No existing application build was run because no application source or runtime configuration was changed.

## Next gate

The expanded runtime tenant-security matrix and the first HUB-005 assignment
reconciliation have passed against the live development database. HUB-004
still needs direct RLS transaction-context/restore evidence; HUB-005 now moves
to the next shared domain (organization/store/membership or billing) while
the public assignment tables remain compatibility readers/projections.

## HUB-001 — Canonical route and origin cleanup

- **Status:** `IMPLEMENTED_AND_VERIFIED` for the scoped route/origin changes; migration and data work remain untouched.
- **Date/operator:** 2026-09-24 / Codex
- **Prompt:** Continue implementation after the updated Hub plan and completed baseline.
- **Repositories changed:** `aevo-core-api`, `aevo-edge-gateway`, `aevo-admin`, `aevo-pos`, `aevo-hub`, plus workspace root docs/scripts already recorded above.
- **Changes:** removed Hub `:4321` from Edge local CORS defaults and example/runtime env; updated Edge preflight tests; changed Core onboarding registration response from `/modern/organize` to `/modern`; changed Core/Admin favorite navigation targets to current `/modern`, `/modern/stores`, and `/modern/settings` anchors; changed POS API test origins from legacy `:4321` to current POS `:4332`; added `aevo-hub/test/route-origin-cleanup.test.ts`; updated the Admin anonymous-route test to assert the current Core-owned privileged surface and the removal of retired legacy routes; made the `aevo-contracts` ESM entrypoints Node/SSR-safe with explicit `.js` specifiers; added `bun run sync:contracts` for local file-dependency rebuild/relink; and assigned distinct Wrangler inspector ports to the root and repo-local Hub/Admin launchers.
- **Security boundary:** Edge still only performs transport/CORS/signature forwarding; Core remains responsible for session and authorization. No auth, entitlement, RLS, or database behavior was changed.
- **Verification:** `aevo-contracts` check passed (`22/22`), Edge tests `6/6`, Edge typecheck passed, POS API tests `59/59`, POS typecheck passed, Core tests `50/50`, Hub full suite passed (`22/22`, `80` expectations), Hub/Admin typechecks passed, `bun run sync:contracts` passed, clean root `dev:all` and direct `aevo-hub bun run dev` smoke tests started the canonical surfaces without inspector-port collisions, `bun run check:local:hub+admin` passed, Admin web shell returned `200`, live preflight returned `204` for `:4330` and `403` for removed `:4321`, root `bun run test:all` passed all `22` application checks, and root `bun run test:tenant-security` passed all `12` tenant-security checks including live Hub Core/Edge registration and cross-tenant denial.
- **Known remaining compatibility evidence:** historical migration/ADR/checker references to `apps/gateway` remain intentionally documented; POS legacy Astro web config still has its own `:4321` development default and is not the current Hub surface; those are not silently deleted by this scoped change.
- **Next gate:** complete contract synchronization, then use HUB-004 tenant-security evidence and HUB-005 migration-authority decisions as the gates for shared-schema writer changes.

## HUB-002 — Fail-closed entitlement and assignment evaluation

- **Status:** `IMPLEMENTED_AND_VERIFIED` in local development; projection and migration ownership remain transitional.
- **Date/operator:** 2026-09-24 / Codex
- **Repositories changed:** `aevo-core-api`, `aevo-contracts`, `aevo-hub`.
- **Changes:** added the Core `EntitlementEvaluator` and exact app-to-feature mapping; removed the runtime allow-all behavior from Hub entitlement checks; added subscription-period, organization-entitlement, application-registry, and store-application checks; added bounded reason codes and `organization-entitlements-v1` projection metadata; added the production-like startup guard for unlimited-testing configuration; made Core app-session resolution re-evaluate entitlement; allowed Hub to perform a read-only app launch/access check through the Hub session without issuing a target-app session; materialized an explicit 14-day `TRIALING` starter projection during organization onboarding; and added structured entitlement decision logging.
- **Security boundary:** entitlement is distinct from member permission and assignment. Core is the enforcement point; Edge only forwards. Unknown apps, inactive/expired subscriptions, missing/disabled features, disabled store bindings, and unavailable projections fail closed. No production bypass was added. `aevo-digital-sing` was not changed.
- **Verification:** Core tests passed (`61/61`); contract validation/typecheck/tests passed (`22/22`); Hub typecheck passed; live Hub security smoke passed (`2` tests, `39` expectations), including organization onboarding, allowed starter POS entitlement, inactive KIOSK entitlement, disabled store binding, Hub proxy denial before assignment, Hub proxy allow after assignment, and false unlimited/bypass flags.
- **Remaining transition:** organization creation currently writes the starter subscription/entitlement projection through the transitional public schema so existing local fixtures can operate. HUB-005/HUB-010 must move this writer and billing projection to the Core/Infrastructure migration authority before legacy tables or compatibility migrations are removed.
- **Next gate:** run the full tenant-security matrix against the new evaluator and keep the transitional projection out of any final migration decision; HUB-003 is recorded below and HUB-004/HUB-005 remain the next gates.

## HUB-003 — Versioned application compatibility handshake

- **Status:** `IMPLEMENTED_AND_VERIFIED` in local development; applications without the endpoint are explicitly degraded `HEALTH_ONLY`, not compatible.
- **Date/operator:** 2026-09-25 / Codex
- **Repositories changed:** `aevo-core-api`, `aevo-contracts`, `aevo-pos`, `aevo-play`, `aevo-background-worker`, and local launch configuration in `aevo-hub`.
- **Changes:** added the versioned `aevo.application-handshake` v1 envelope and typed response contracts; added Core-signed HMAC probes with bounded timeout/body size and strict response validation; added POS/Play handshake endpoints; added worker probing and compatibility metadata persistence; added explicit health-only fallback for older applications; and propagated the local shared secret/origins through the development launchers.
- **Security boundary:** the handshake is tenant-free and proves app/service compatibility only. It does not issue a user session, grant entitlement, or replace Core authorization. Secrets are never returned in the handshake response. Invalid signatures, stale responses, unsupported contracts, unauthorized responses, timeouts, and offline targets remain non-compatible.
- **Verification:** Core tests `64/64`; contracts `24/24`; POS API tests `60/60`; Play API tests `5/5`; worker tests `4/4`; POS/Play/worker typechecks passed; Hub live security smoke `2` tests and `39` expectations passed after the runtime restart. `aevo-digital-sing` was not changed.
- **Known transition:** the Core probe endpoint currently records compatibility metadata in the existing `aevo_application_connections` projection. HUB-005/HUB-007 must converge the registry/connection schema and writer authority before historical compatibility tables or adapters are removed.
- **Next gate:** complete the full HUB-004 tenant-security matrix and then execute HUB-005 table-by-table migration-authority convergence; do not treat a healthy legacy app as contract-compatible.

## HUB-004 — Tenant-security and RLS integration gate

- **Status:** `IMPLEMENTED_AND_VERIFIED` for the development security gate; remaining shared-table migrations are tracked under HUB-005.
- **Date/operator:** 2026-09-25 / Codex
- **Repositories changed:** `aevo-core-api` and the `aevo-hub` live security boundary.
- **Changes:** added `TenantContextValidator` to reject malformed tenant hints, conflicting `x-tenant-id`/`x-organization-id` headers, and organization/store headers that widen a scoped Core session. Hub authentication and Core app-session resolution enforce the same rule; an unbound session may narrow scope only through the server authorization query. Core assignment resolution now supports organization and store-scoped Core rows, and Hub assignment updates validate store ownership before writing. Added transaction-local tenant context application to authorization and audit queries, plus focused unit coverage for matching, conflicting, malformed, cross-scope, and store-scoped assignment cases.
- **Security boundary:** browser/client headers remain hints only. Core session scope and membership/assignment queries remain authoritative. A target app cannot turn a mismatched organization or store header into a broader principal.
- **Verification:** Core tests passed (`102/102`); the migrator RLS check passed using an existing non-bypass probe role and proved transaction-local context, rollback restore, and assignment isolation; live Hub security smoke passed (`4` tests, `75` expectations), including manifest response fields, two stores, a second member, store-specific POS assignment, idempotent store-binding retry/conflict, assigned-store allow, other-store denial, conflicting headers, and revoked session. The full root tenant-security suite passed (`18/18`), including all in-scope app boundary suites and the isolated Digital Sign suite without modifying that repository.
- **Next gate:** keep new shared-table changes behind the migration ledger and finish the remaining app reader cutovers; runtime shared-table changes remain fail-closed.

## HUB-005 — Shared schema writer and migration authority convergence

- **Status:** `IMPLEMENTED_AND_VERIFIED`; the application-assignment domain and app-session authority are Core-canonical in development, and the confirmed legacy control-plane relations/readers are retired.
- **Date/operator:** 2026-09-25 / Codex
- **Repositories changed:** `aevo-core-api`, `aevo-contracts`, `aevo-infrastructure`, `aevo-admin`, `aevo-hub`, and workspace inventories/docs.
- **Changes:** added Core migrations `0013` through `0018`, `0019`, `0020`, `0021`, `0022`, `0023`, and `0024` through `0029`; kept the advisory-lock-managed, checksum-tracked authority ledger; added the privileged Core inspection route `/api/v1/admin/migrations/control-plane`; changed Hub application catalog/store-app reads, assignment writes, entitlement evaluation, template instantiation, billing reads, and typed store app configuration to canonical Core projections; removed POS/Play local application-session managers and legacy Hub API surfaces; removed retired control-plane migration files from Hub/POS/Play trees; and synchronized the Hub route inventory into the OpenAPI artifact.
- **Transition safety:** historical application migration trees remain historical sources and are not applied by the Hub launcher. Migration `0024` records the retired compatibility rows in the authority ledger without touching Digital Sign; migration `0025` removes the final local session/catalog relations after runtime reader cutover.
- **Verification:** development database has `32` applied Core migrations; migration verify/dry-run passed; Core tests passed; RLS transaction-context check passed; Infrastructure ownership check passed (`10/10`); contract artifact validation passed (`76` API paths / `49` Hub route entries); typed configuration/template smoke passed; and the retired public control-plane relations are no longer valid runtime dependencies.
- **Next gate:** provider lifecycle/replay/restore depth and idempotent launch handoff remain follow-on work.

## HUB-006 — Contract release synchronization

- **Status:** `IMPLEMENTED_AND_VERIFIED` in local development for route/method coverage; endpoint-specific payload schema expansion remains a follow-on.
- **Date/operator:** 2026-09-25 / Codex
- **Repositories changed:** `aevo-contracts`, `aevo-core-api`, `aevo-hub`, and workspace scripts.
- **Changes:** added deterministic synchronization from Core Hub route sources into `aevo-contracts/openapi/v1.json`; synchronized `49` Hub route entries and `76` total API paths; added contract artifact preflight to the root test runners; and advanced the shared contract release metadata to `2026-09-25`.
- **Security boundary:** OpenAPI describes denial responses and transport boundaries only; authorization remains Core-owned and no generated client can infer access from catalog metadata.
- **Verification:** OpenAPI validator, contract typecheck, and contract tests passed (`36` tests, `122` expectations); route inventory and OpenAPI path coverage are aligned.
- **Next gate:** complete manifest-backed registry consumption and preserve the generic generated response as a compatibility envelope until endpoint payload schemas are promoted.

## HUB-007 — Manifest-backed application registry

- **Status:** `IMPLEMENTED_IN_PROGRESS`; Core manifest, installation, billing, and store-binding projections plus Hub/Admin consumers are live in development, while environment connection writers and compatibility catalogs remain transitional.
- **Date/operator:** 2026-09-25 / Codex
- **Repositories changed:** `aevo-core-api`, `aevo-contracts`, `aevo-admin`, `aevo-hub`.
- **Changes:** added Core migration `0017_application_manifest.sql` with immutable code metadata, owner repository, contract version, audience, install scope, store scope, launch path, capabilities, configuration schema references, and lifecycle status; added typed fields to the versioned Hub contract; made Hub settings derive member assignment choices and launch access checks from the Core manifest; made store workspace features derive from manifest capabilities; and stopped the connected Admin registry view from completing the catalog with a hard-coded list. `aevo-digital-sing` remains excluded from runtime changes.
- **Security boundary:** manifest metadata is descriptive and never grants entitlement, assignment, or permission. Digital Sign is filtered by owner boundary in store configuration and was not edited. Origins are optional connection metadata; Hub environment URL fallback is explicitly transitional until HUB-012.
- **Verification:** `23` Core migration records are applied and checksum-verified; Core/Hub/Admin typechecks passed; live Hub smoke validated POS `manifestVersion=v1`, `storeScoped=true`, and `catalog` capability; store-binding, installation, and billing projection checks passed with `0` mismatches; tenant-security suite passed (`18/18`).
- **Next gate:** add registry reconciliation/read-parity evidence for every first-party app and complete environment-connection/launch handoff work; public `apps` and `application_registry` have already been retired from the target development database.

## HUB-008 — Installation, entitlement, and store binding projections

- **Status:** `IMPLEMENTED_AND_VERIFIED`; Core installation, billing/entitlement, and store-binding projections are canonical in development and the confirmed public compatibility schema has been retired.
- **Date/operator:** 2026-09-25 / Codex
- **Repositories changed:** `aevo-core-api`, `aevo-pos`, workspace migration/test scripts, and Hub migration-authority documentation.
- **Changes:** added Core migrations `0018`, `0020`, `0021`, `0022`, `0023`, `0024`, and `0025`; backfilled canonical projections, recorded their authority in the migration ledger, enabled tenant-aware RLS policies, moved template instantiation to Core, and removed the public compatibility relations after reader/writer cutover. `aevo-digital-sing` is excluded from the projection and no source/data in that repository was changed.
- **Security boundary:** store binding is still separate from organization entitlement and member assignment. A binding can be enabled only through Core's authenticated Hub path; app authorization and entitlement checks read the Core projection and continue to fail closed when the row is absent or disabled. The migration does not grant access or copy secrets.
- **Verification:** migration application and checksum verification passed with `32` applied Core migrations; `--legacy-removal-check` passed; Core API/migrator builds passed; RLS transaction-context check passed; tenant-security and typed configuration/template smoke passed; POS and Play regression suites passed; full integration passed `27` application checks; and the migration ownership check passed `10/10`.
- **Remaining transition:** provider lifecycle/replay/restore depth remains a canonical Core concern. No active POS/Play compatibility action or reader remains for the retired control-plane relations.
- **Next gate:** expand provider lifecycle/replay/restore tests and idempotent launch handoff without reintroducing public compatibility writers.

## HUB-010 — Billing and entitlement projection

- **Status:** `IMPLEMENTED_AND_VERIFIED`; the Core billing projection and POS forwarding boundary are live in development and the public billing compatibility relations are retired.
- **Date/operator:** 2026-09-25 / Codex
- **Repositories changed:** `aevo-core-api`, `aevo-pos`, `aevo-hub`, workspace migration/test scripts, and Hub migration-authority documentation.
- **Changes:** added Core migration `0021_billing_entitlement_projection.sql` with immutable `aevo_billing_webhook_events`, canonical `aevo_organization_subscriptions`, and canonical `aevo_organization_entitlements`; backfilled them from the historical public projections; added Core's secret-protected `/internal/billing/webhooks` projection endpoint with provider/event idempotency, unknown-customer handling, lifecycle status mapping, entitlement synchronization, installation synchronization, and an outbox audit event; switched Core entitlement evaluation and Hub subscription reads to the canonical projections; made POS forward verified production webhook events and subscription reads to Core; and removed compatibility mutation/read paths in `0024`, `0026`, and `0027`.
- **Security boundary:** the browser and Hub UI cannot grant paid access. Provider signature verification remains at the billing ingress, Core owns the immutable event ledger and authorization projection, and assignment/store binding remain separate gates. Unknown providers/events/customers fail closed or become explicit `IGNORED` statuses without inventing organization access. `aevo-digital-sing` is excluded.
- **Verification:** Core tests `105/105`; migration verify/dry-run and legacy removal check passed; unknown-customer replay remains fail-closed/idempotent; POS tests passed; and tenant-security passed `16/16`.
- **Remaining transition:** expand provider lifecycle coverage for cancel, downgrade, refund, out-of-order, and restore/replay scenarios in the canonical Core ledger; no public billing compatibility writer remains.

## HUB-011 — Typed app configuration boundary

- **Status:** `IMPLEMENTED_AND_VERIFIED` in local development; Core is the only configuration write authority.
- **Date/operator:** 2026-09-25 / Codex
- **Repositories changed:** `aevo-contracts`, `aevo-core-api`, `aevo-hub`, and Hub migration/inventory documentation.
- **Changes:** added typed schema, configuration response, and update request contracts; added Core-owned schema definitions for Play, POS, Kiosk, and Queue; added scoped GET/PATCH configuration routes with validation, audit/outbox events, default values, and secret-like key rejection; added RLS-protected `aevo_store_application_configurations`; and copied validated configuration during Core template instantiation.
- **Security boundary:** Hub renders the Core schema and never stores app-domain secrets. App enablement, entitlement, assignment, and configuration permission are evaluated independently. Supabase/Postgres RLS remains defense in depth: exposed tables require explicit policies and UPDATE paths require both visibility and write checks. [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)
- **Verification:** Core build and Hub typecheck passed; contracts synchronized to `49` route entries and `76` OpenAPI paths; migrations `0028` and `0029` applied and verified; live smoke covered valid config, secret rejection, schema mismatch, disabled-app rejection, and template copy.
- **Remaining transition:** app-owned operational behavior and provider/launch lifecycle remain in follow-on HUB-012+ work.
