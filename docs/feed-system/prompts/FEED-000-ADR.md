# Implementation prompt — BATCH-FEED-000-ADR

You are executing `BATCH-FEED-000-ADR` for the Aevo Feed. This is a governance and documentation batch only. Do not implement production code, create or edit database migrations, add dependencies, deploy infrastructure, change routes, or modify Admin/customer UI.

## Objective

Resolve and record the Feed V1 ownership boundary before FEED-001. The decision must cover:

- canonical TRACE and PLACE domain source for V1;
- Core Feed control-plane and session/policy ownership;
- the repository allowed to create future Feed-specific migrations;
- the private Core-to-Supabase/TraceDee adapter, network, credential, RLS, timeout, and telemetry boundary;
- the long-term Core-owned read-model destination without making it a V1 prerequisite;
- route/config rollback and compatibility behavior;
- named approvers for Core/API, TraceDee/Supabase data, infrastructure/secrets, and security.

## Allowed scope

You may edit only the Feed ADR and repository-boundary documentation:

- `docs/feed-system/ADR-000-feed-data-ownership.md`;
- `docs/feed-system/17-polyrepo-contracts-and-ownership.md`;
- relevant `aevo-core-api/docs`, `aevo-hub` boundary documentation, or `aevo-infrastructure` documentation if required to make the decision explicit.

Do not edit production source, SQL, migrations, package manifests, Wrangler/Terraform runtime configuration, or environment files.

## Required work

1. Compare the proposed ADR with the current repository boundaries and record amendments rather than silently changing ownership.
2. Name exactly one migration-owning repository for new Feed-specific schema. Existing TraceDee/Supabase schema remains a frozen compatibility boundary unless a separate ADR changes that rule.
3. Record that the browser, Edge, Admin UI, and aevo-go never receive Supabase service credentials or raw internal Feed data.
4. Record the fallback if Core cannot safely reach the existing data plane; do not resurrect `aevo-hub/apps/gateway`.
5. Record the safe rollback sequence and the owner responsible for each step.
6. Obtain or record explicit approval from all four required owner groups. If any approval is absent, leave the ADR Proposed and mark the batch BLOCKED/READY rather than claiming acceptance.
7. Append a concise handoff section to `docs/feed-system/phase-notes.md` using the required template.

## Verification

Run the root-document self-check (the workspace root is not a Git repository) and inspect the resulting file list:

```sh
rg -n "migration owner|Supabase|service credential|rollback|approval|Proposed|Accepted" docs/feed-system/ADR-000-feed-data-ownership.md docs/feed-system/17-polyrepo-contracts-and-ownership.md
test -s docs/feed-system/ADR-000-feed-data-ownership.md
test -s docs/feed-system/17-polyrepo-contracts-and-ownership.md
rg -n "migration owner|Supabase|service credential|rollback|approval|Proposed|Accepted" docs/feed-system/ADR-000-feed-data-ownership.md docs/feed-system/17-polyrepo-contracts-and-ownership.md
find . -path '*/db/migrations/*' -type f -print | sort
```

Compare the migration file list with the preflight snapshot. If a nested repository was changed, also run `git -C <changed-repository> diff --check`. Inspect the file list for accidental production files. There must be no new file under any `db/migrations` directory and no package/deployment change.

## Stop condition and handoff

Stop after the ADR decision and note are recorded. If the migration owner, adapter boundary, or any required approval is unresolved, report the exact blocker and do not start FEED-001. FEED-001 is unblocked only when the ADR says Accepted, the owner names are recorded, and the phase note links the evidence.
