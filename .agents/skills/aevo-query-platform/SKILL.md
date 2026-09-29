---
name: aevo-query-platform
description: "Design and implement Aevo's tenant-safe universal query platform for search, filters, sorting, grouping, saved queries, imports, exports, reports, and bulk actions. Use it whenever a feature needs structured data discovery or cross-module query behavior; do not use it for ad-hoc SQL or one-off local filtering."
metadata:
  short-description: "AST-driven, tenant-safe query platform"
---

# Aevo Universal Data Query Platform

Use this skill as the design and implementation contract for Aevo's shared query infrastructure. Search, filter builders, saved views, reports, dashboards, import validation, export jobs, and future natural-language search are consumers of the same validated Query AST.

## Non-negotiable invariants

- Never persist or execute a user-provided SQL string. User input is parsed into a typed AST, validated against the model registry, and compiled by a server-owned adapter.
- Use one query contract for search text, structured filters, sort, group, saved queries, reports, import previews, and exports. Do not create separate filter/search engines for individual apps.
- Resolve the authenticated principal and organization/store scope on the server. Client-provided tenant IDs, fields, relations, permissions, entitlements, and limits are hints at most and must be revalidated or replaced server-side.
- Enforce the Aevo execution order: authenticate, resolve organization membership and store scope, check permission, check entitlement, check usage quota, then compile and execute.
- Allow only fields and operators declared by metadata. A field's capabilities and permission requirements control whether it can be searched, filtered, sorted, grouped, imported, exported, or bulk-edited.
- Keep PostgreSQL RLS enabled on query metadata, saved definitions, jobs, and all tenant data. API scoping is required even when the server uses a privileged Supabase client.
- Mutating imports, exports, saved-query sharing, and bulk actions must be idempotent and auditable. Use jobs for work that can exceed a request's latency budget.
- Treat query definitions as versioned contracts. Reject unknown AST versions and validate the full payload before touching the database.

## Implementation workflow

1. Inspect the current model and tenant schema. Reuse canonical tables and repositories; do not create a parallel Product, Order, Organization, or Store model.
2. Update the shared contract and model metadata first. Read [references/query-ast-v1.md](references/query-ast-v1.md) for the AST, parser, operators, and validation rules.
3. Add or refactor database metadata and job tables with a timestamped Supabase migration. Read [references/database-model.md](references/database-model.md) for table responsibilities, RLS, scopes, and seed requirements.
4. Implement parser, validator, and compiler tests before wiring a route. The compiler may use parameterized Supabase/Postgres adapters, but must never concatenate untrusted identifiers or values.
5. Add a repository boundary that accepts a resolved principal and validated query. API handlers should contain authentication and policy orchestration, not SQL or query parsing.
6. Expose a versioned `/api/v1/query/*` surface for metadata, execution, saved queries, imports, and exports. Keep imports and exports asynchronous after validation/preview.
7. Integrate UI consumers using the metadata returned by the API. Every dynamic list handles loading, empty, error/retry, stale/revalidating, and disabled states; preserve accessible labels and keyboard interaction.
8. Verify with unit tests, tenant-boundary tests, migration checks, typecheck, and route smoke tests. For database changes, run the migration and a real Supabase query against the configured project before claiming completion.

## Boundaries

- Raw SQL is permitted only inside reviewed migrations or controlled repository internals that are not exposed as a user query endpoint. The query UI must not call a SQL runner.
- Natural-language or AI layers may propose an AST only. They cannot execute queries, choose arbitrary tables, bypass permissions, or bypass entitlements.
- Plan names are never feature gates. Resolve access through the shared entitlement engine, then apply field/action permissions.
- Organization and store scopes are explicit. A saved query's scope (`PRIVATE`, `TEAM`, `STORE`, `ORGANIZATION`, or `SYSTEM`) must be enforced at read and write time.

## Supporting references

- Read [references/query-ast-v1.md](references/query-ast-v1.md) for the stable JSON contract, supported operators, parser behavior, and security validation.
- Read [references/database-model.md](references/database-model.md) for metadata, saved query, import, export, audit, and RLS design.
