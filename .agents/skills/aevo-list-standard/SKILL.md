---
name: aevo-list-standard
description: "Design and implement Aevo list and directory screens with a consistent query contract: multi-selection, permitted bulk actions, search, advanced filters, server-side sorting, URL pagination, page-size control, and user-controlled column visibility. Use for any structured data list; do not use for feeds, maps, or card-only discovery surfaces without a tabular/list contract."
metadata:
  short-description: "Aevo universal list interaction standard"
---

# Aevo List Standard

Use this skill whenever an Aevo screen presents a collection of records that a
user needs to inspect, compare, operate on, or export. The four required
capabilities are always present unless the underlying API contract makes a
specific capability impossible; in that case the UI must state the boundary
and the server contract must be completed before claiming the feature:

1. Multi-select rows with actions appropriate to the user's permission and
   resource lifecycle, such as export, archive, disable, or delete.
2. Search, normal filters, an advanced-filter surface, and sort.
3. Pagination with a user-selectable page size.
4. A column chooser that can show or hide safe list fields.

## Non-negotiable architecture

- Use the shared Aevo Query AST and model metadata for search, filters, sort,
  selected fields, exports, and future bulk actions. Do not create a new
  page-specific filter parser or raw SQL endpoint.
- Keep query state in the URL: search text, filter values, sort field and
  direction, page/cursor, page size, and view mode when it affects the result.
  Back/forward, refresh, deep links, and shared links must reproduce the same
  list state.
- Resolve identity, organization/store scope, permissions, entitlements,
  field capabilities, and server limits on the server. Client-supplied
  tenant IDs, field names, sort identifiers, limits, or selected columns are
  hints only and must be validated against server-owned metadata.
- Sort fields and filter operators must be mapped from an allow-list to
  server-owned SQL/adapter expressions. Never interpolate a browser-provided
  identifier into SQL.
- Export and bulk actions must use the same normalized query and selected
  fields as the list. For large results, create an idempotent audited job;
  do not silently export only the visible page while labelling it as a full
  export.
- A destructive or privileged bulk action requires the permission check,
  confirmation appropriate to its risk, idempotency, audit metadata, and a
  recoverable error path. Use the existing Hold Button contract for disabling,
  revoking, deletion, or other high-impact actions.
- Selection is scoped clearly. A page checkbox selects the current page;
  selecting all matching records must be an explicit server-backed action and
  must communicate the scope before execution.

## UI contract

Every standard list includes:

- A labelled search input and an advanced-filter disclosure. Filters are
  metadata-driven and support multiple values where the field allows it.
- Sortable headers with an accessible direction indicator and a deterministic
  tie-breaker in the server query.
- A page-size control. Prefer the product's supported server values; for the
  current Admin directory the safe values are 10, 25, and 50 because Core
  caps the endpoint at 50.
- Previous/next controls that preserve all other query state, announce the
  current page or cursor, and keep loading/error/empty states visible.
- A select-all-on-page checkbox, row checkboxes, a selected-count status, and
  an action bar. The action bar must not show actions the principal cannot
  perform.
- A column chooser with accessible checkboxes, a visible minimum of one
  column, and per-list preference persistence. Visibility preferences never
  grant access to sensitive fields; metadata and permissions decide whether a
  field exists in the chooser.
- Loading, stale/revalidating, empty, permission-denied, offline, and error /
  retry states. Never fabricate rows or metrics when the source is absent.
- Keyboard-accessible controls, visible focus, minimum 44px touch targets for
  primary actions, Thai/English label expansion, and reduced-motion behavior.

For responsive layouts, preserve the list's information hierarchy. Use
horizontal overflow for wide tables rather than hiding important fields, and
keep the toolbar/action bar usable at narrow widths. Column visibility is a
user preference, not a reason to remove the accessible table header semantics.

## Implementation workflow

1. Identify the canonical model, endpoint/repository, tenant boundary,
   permission codes, field metadata, and existing list route. Reuse the
   canonical model; do not create a parallel read model only for the UI.
2. Define or extend the Query AST metadata for searchable, filterable,
   sortable, exportable, and bulk-editable fields. Add parser/compiler,
   permission, tenant-boundary, and limit tests before wiring the screen.
3. Implement server query parameters or the versioned query endpoint. Validate
   AST version, fields, operators, direction, page size, cursor/offset, and
   export/bulk idempotency before touching data.
4. Use a shared list primitive for toolbar, advanced filters, selection,
   action bar, pagination, and column preferences. Keep row rendering and
   domain actions in the owning feature route.
5. For an action, return authoritative server state and an audit/event result;
   do not infer success from local removal or an optimistic checkbox. Show
   pending, success, error, and retry feedback without native alert/confirm.
6. Verify with typecheck/build, component tests for URL state and selection,
   server tests for tenant/permission/sort/limit behavior, and a real route
   smoke test. Browser QA is separate from build success and must be recorded
   when unavailable.

## Current Aevo Admin reference implementation

`aevo-admin/apps/admin/app/components/admin-list-standard.tsx` is the shared
UI primitive. `admin-list-query.ts` owns the safe page-size and query parsing
helpers. The Admin directory routes use server-backed list params and Core
whitelist sort mappings; future lists should adopt the same primitive rather
than restoring `AdminDirectoryToolbar`.

The current local export action intentionally exports selected rows from the
current page and labels the selection scope. Replace it with a Query Platform
export job when a route needs all matching records, sensitive field policy,
or large-result handling.

## Related contracts

- Read `.agents/skills/aevo-query-platform/SKILL.md` and its AST/database
  references for shared query execution, metadata, jobs, and RLS.
- Read `.agents/skills/aevo-security-architecture/SKILL.md` when list actions,
  tenant scope, app assignments, or privileged permissions are involved.
- Read `.agents/skills/ux-ui-skill/SKILL.md` when implementing Hub/Go visual
  composition, responsive behavior, focus, motion, or high-impact controls.
