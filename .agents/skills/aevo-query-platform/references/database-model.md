# Aevo Query Platform Database Model

The query platform is metadata-driven and tenant-aware. It describes existing Aevo models; it does not duplicate tenant business data.

## Core metadata

```text
query_models
query_model_fields
query_model_relations
query_model_views
query_search_definitions
query_saved_queries
query_history
```

`query_models` stores the technical model name, canonical source table/view, label, module, tenant scope, default search fields, default ordering, and lifecycle status. `query_model_fields` stores a field path, type, relation model/path, capability JSON, allowed operators, sequence, and optional read/write permission codes.
`query_model_relations` stores the server-owned relationship path, embedded relation name, foreign-key hint, cardinality, and source/target columns. Relation filters must be compiled through the PostgREST embedded-resource adapter; clients never submit a table or foreign-key identifier.
`query_model_views` stores reusable LIST/KANBAN/PIVOT/CHART projections (columns, default sort, and grouping). `query_search_definitions` stores named system search profiles and field-specific operator overrides. Both are metadata, not tenant data, and are only exposed when the referenced model is active.

The canonical models are seeded from existing tables such as `product.product -> products`, `sale.order -> orders`, and `res.store -> stores`. Add a model only after its canonical tenant table/view and RLS policy exist. A model registry must map technical names to a server-owned table/view; clients cannot submit arbitrary table names.

## User definitions

`query_saved_queries` stores the normalized Query AST, model, owner, organization, optional store, and scope:

```text
PRIVATE       owner only
TEAM          organization members with query.read/team access
STORE         members authorized for the selected store
ORGANIZATION  organization members
SYSTEM        platform-managed definitions only
```

`query_history` records execution metadata, not sensitive result rows. Retention and redaction must be explicit. `query_export_templates` stores reusable export projections and follows the same scope rules as saved queries.

## Jobs

`query_import_jobs`, `query_import_columns`, `query_import_mappings`, and `query_import_errors` support `UPLOAD -> ANALYZING -> MAPPING -> VALIDATING -> READY -> QUEUED -> PROCESSING -> COMPLETED/FAILED/CANCELLED`. A preview does not mutate business tables. The mapping endpoint can replace inferred mappings before confirmation. The worker revalidates the AST/field permissions and uses an idempotency key before writing; stale locks are recoverable and transient failures use bounded retry/backoff.

`query_export_jobs` and `query_export_templates` support `QUEUED -> PROCESSING -> COMPLETED/FAILED/CANCELLED`. An export is a projection of the same validated AST, with a selected field list filtered by permissions. Import and export jobs persist a canonical `request_fingerprint` beside the idempotency key; replaying the same request is safe, while reusing a key for a different payload is rejected.

Entitlement keys for the platform are resolved separately from permissions: `query_platform`, `query_import`, and `query_export` gate actions; `query_rows`, `query_import_rows`, and `query_export_rows` are usage counters/quotas.

## RLS and access

- Enable RLS on every query table.
- All organization rows use `private.is_org_member(organization_id)` for read and the appropriate organization permission for writes.
- Store rows additionally verify store membership/authorization. Do not rely on a client-supplied `store_id`.
- Private saved queries include `owner_user_id = auth.uid()`; shared scopes use membership checks; system rows are service/platform managed.
- Job rows are readable only by the creating user plus authorized organization roles; errors and source files must not become public storage objects.
- Add indexes for `(organization_id, model_id, updated_at)`, job status/created time, and the scope lookup columns.

## Lifecycle and audit

Definitions and templates use `ACTIVE/ARCHIVED` rather than destructive deletion. Import/export creation, sharing, cancellation, completion, and failed validation should write a structured audit record with organization, user, resource, action, and metadata.

## Migration discipline

Use a timestamped Supabase migration. Keep seed inserts idempotent and preserve existing rows. Verify migration history, table/RLS state, model/field seed counts, and a tenant-boundary query against the configured Supabase project before completing the task.
