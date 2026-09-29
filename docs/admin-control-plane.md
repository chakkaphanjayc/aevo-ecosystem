# Aevo Admin control-plane contract

Aevo Admin is a privileged platform application. Core API remains the source of
truth for identity, platform RBAC, organization lifecycle, billing projections,
application registry, and immutable audit records. The browser never connects
directly to Supabase/Postgres.

## Directory contract

- Organizations, subscriptions, and users use a server-enforced maximum of 50
  rows per request. Directory pages use `page`, `limit`, `q`, and `status`, and
  return `hasMore`.
- Place registry and Place workflow queues use the same `page`, `limit`, and
  `hasMore` contract. Feed moderation uses a signed cursor and also caps each
  response at 50 reports.
- Detail routes are available for organizations, subscriptions, users, and
  registered applications.
- Search is a single validated Query AST v1 execution boundary:

```json
{
  "version": 1,
  "model": "admin.directory",
  "where": { "type": "text", "value": "acme" },
  "pagination": { "limit": 20, "offset": 0 }
}
```

  The Core API allow-lists the model and node shape. It never accepts a table
  name, column name, SQL fragment, or tenant identity from the browser.

## Lifecycle and separation of duties

- Organization edit/create is Core-owned, requires `organization.manage`, a
  CSRF token, and a non-empty administrative reason. Deactivation is a soft
  `SUSPENDED` lifecycle state; primary rows are not hard-deleted.
- User lifecycle is `ACTIVE`/`DISABLED`, requires `user.manage`, an audit reason,
  and revokes app sessions when disabled. Credentials and identity creation
  remain Accounts-owned.
- Subscription records are billing projections. Admin displays detail but does
  not create/delete provider state directly; changes must come from a billing
  provider webhook or an approved billing workflow.
- Application registry and connection records are platform boundaries. Admin
  can control an application lifecycle only through the existing privileged
  status action; arbitrary application creation/deletion is a registry
  migration concern.
- Audit logs are immutable read-only records and use signed keyset cursors.
- Place registry already exposes Core-owned create/update/soft-delete actions
  with revision checks; list reads are capped at 50.

These controls are ISO-aligned operational safeguards (least privilege,
traceability, change reason, separation of duties, and recoverable lifecycle
transitions). They are not a claim of certification by themselves.
