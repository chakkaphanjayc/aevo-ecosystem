# Hub baseline inventories

These files are the machine-readable evidence set for the Hub migration batches. They are static/reporting artifacts, not runtime configuration and not migration input. `BATCH-HUB-000` is the initial baseline; later `HUB-###` batches record reviewed implementation revisions.

## Common envelope

Every JSON file uses:

```json
{
  "schema": "aevocado.hub-baseline.<kind>",
  "inventoryVersion": 1,
  "batch": "BATCH-HUB-000",
  "generatedAt": "YYYY-MM-DD",
  "entries": []
}
```

`inventoryVersion` must be a supported positive version and `batch` must use either the initial `BATCH-HUB-###` format or a reviewed `HUB-###` implementation batch. `entries` may contain evidence-specific fields. An entry may use `UNKNOWN`, `UNRESOLVED`, or `not proven` when repository evidence is incomplete. Those values are intentional blockers; they must not be replaced with guesses.

## Files

| File | Purpose |
| --- | --- |
| `repositories.json` | repository scope, branch/state, role, and exclusion boundary |
| `origins.json` | local/production origin, port, callback, and redirect evidence |
| `routes.json` | route owner, auth/authz, app/tenant scope, exposure, and contract status |
| `sessions.json` | app session cookies, Core/Accounts ownership, and conflicts |
| `applications.json` | app codes, runtime, registry, launch, and manifest status |
| `contracts.json` | contract sources and route-count comparison |
| `writers.json` | table-level runtime/migration/read/write evidence |
| `tables.json` | table ownership, semantic domain, RLS status, and HUB-005 lifecycle placeholders |
| `events.json` | outbox, Pub/Sub, Tasks, worker, probe, and event-consumer status |
| `infrastructure.json` | Cloud/IAM/secret/runtime resource ownership and activation status |
| `redundancy.json` | duplicate or legacy surfaces and their safe lifecycle classification |
| `migration-authority.json` | HUB-005 table-by-table migration owner, writer, reader, and transition state |

## Safety rules

- Do not put credentials, tokens, connection strings, webhook signatures, or secret values in these files.
- A route or table appearing here does not authorize deleting it.
- `CANONICAL` means the observed or explicitly designated boundary only; it does not prove every consumer has migrated.
- `UNKNOWN` means the ownership evidence is incomplete and the next migration/deletion step is blocked.
- Digital Sign is excluded from Hub modifications even when its app code appears in shared registry inventories.
- `migration-authority.json` is a transition ledger, not permission to delete a
  legacy table. `RECONCILE_REQUIRED` entries must remain until reconciliation,
  restore, and observation evidence exists.

## Validation

Run the report-only guard from the workspace root:

```sh
bun run scripts/hub-baseline-check.ts
```

The guard parses the inventories, checks the common envelope, scans inventory values for obvious secret patterns, and reports stale route/origin references without modifying files or failing solely because legacy evidence exists. The scan covers the active Hub/Core/Edge/Accounts/Admin/Contracts/Worker/Infrastructure boundary; Go, Play, POS, and Digital Sign are outside this audit.
