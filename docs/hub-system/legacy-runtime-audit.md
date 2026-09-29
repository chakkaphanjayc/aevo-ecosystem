# Hub legacy runtime audit

Date: 2026-09-26

This audit covers the active Hub/Core platform boundary:

- `aevo-hub`
- `aevo-core-api`
- `aevo-edge-gateway`
- `aevo-accounts`
- `aevo-admin`
- `aevo-contracts`
- `aevo-background-worker`
- `aevo-infrastructure`
- workspace launchers and Hub inventory checks

`aevo-go`, `aevo-play`, `aevo-pos`, and `aevo-digital-sing` were intentionally
excluded from implementation changes and this runtime audit, as requested.

## Result

The retired Hub runtime is absent. The active request path is:

```text
Hub Modern Console :4330
  -> Edge Gateway :4000
  -> Core API :5099
  -> Accounts :8787 for identity handoff
```

There is no Hub-owned API gateway, public-home server, legacy web worker, or
Hub migration writer in the active tree. Core migration verification reports 42
applied checksum-verified migrations through `0037`; the Core database legacy
removal check confirms that retired Hub compatibility relations and functions
are absent.

## Changes made in this audit

| Area | Finding | Action |
| --- | --- | --- |
| Hub `scripts/seed.ts` | Wrote `public.apps`, which is retired by Core migration `0024` | Removed the script and the stale `db:seed` command |
| Hub `scripts/sql.ts` | Generic direct SQL runner bypassed Core ownership and had no runtime consumer | Removed the script and `db:query` command |
| Hub settings loaders | 404 fallbacks called retired per-store/per-member read paths and could multiply request latency | Removed fallbacks; loaders now use the batch Core contracts only |
| Hub access loader | Missing access decision triggered a second endpoint request | Missing Core access data now fails as a contract error |
| Core session cookies | Single `AEVO_SESSION_COOKIE_NAME` alias could override app-scoped cookie mapping | Removed the alias; only app-scoped cookie maps/defaults remain |
| Core CSRF | `AEVO_ALLOW_LEGACY_CSRF` could bypass CSRF in local mode | Removed the bypass from code, examples, and runbook |
| Hub inventory guard | Rejected valid `HUB-006`, `HUB-011`, and `HUB-017` inventory revisions and scanned excluded apps | Accepts reviewed inventory batches and scans only the active audit scope |

Historical SQL migrations, inventory evidence, and plan notes still mention
retired tables such as `public.apps`. Those references are migration history or
audit evidence; they are not runtime readers or writers and must remain for
checksum/history integrity.

## Deliberately retained surfaces

- `aevo-hub/scripts/migrate-core.ts` is a convenience wrapper around the Core
  migrator; it does not own or execute Hub migrations.
- `aevo-hub/scripts/seed-tracedee.ts` is an explicit development fixture for
  TraceDee data, not a control-plane seed and not called by any runtime.
- `aevo-hub/scripts/add-admin.ts` is a manual development bootstrap for the
  canonical Core `aevo_platform_roles` table. It is not an HTTP route or a
  runtime authorization path.
- Core Place legacy mappings and Feed compatibility fields are domain migration
  boundaries, not the retired Hub gateway/session adapters. They remain guarded
  and server-owned.
- `aevo-edge-gateway` remains active. “Gateway” there means the current Edge
  ingress/signing boundary, not the removed Hub gateway application.

## Verification evidence

| Check | Result |
| --- | --- |
| Hub typecheck/build | PASS |
| Hub integration/security suite | 26 pass, 0 fail |
| Hub local surface check | PASS for Edge, Core liveness, contract, and web shell |
| Core build | PASS, 0 warnings/errors |
| Core tests | 147 pass, 0 fail |
| Core migration verify | 42 applied checksums verified |
| Core legacy-removal check | PASS against development database |
| Contracts validation/typecheck/tests | 88 paths / 56 Hub routes; 54 pass, 0 fail |
| Edge tests/build | 7 pass, 0 fail; dry-run build PASS |
| Accounts tests/build | 11 pass, 0 fail; dry-run build PASS |
| Background worker tests/build | 13 pass, 0 fail; build PASS |
| Admin typecheck/build | PASS |
| Infrastructure manifest/ownership check | PASS, 10 ownership checks |
| Hub inventory baseline check | PASS; no retired origin/path matches in active scope |

The full Hub suite requires the Hub Edge and the Admin Edge when it includes
Admin route probes. Running only `bun run dev` intentionally starts the Hub
profile and does not start Admin `:4001`; the Admin test was therefore rerun
with the Admin Edge check process explicitly started.
