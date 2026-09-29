# Organization, Business, and Location Model

## Current model

The existing public schema has `organizations`, `brands`, `stores`, `memberships`, `membership_stores`, and related role/permission tables. Core Hub routes expose organizations and stores and create a membership plus Hub assignment for a new owner. A store is the physical/operational location used by app access and catalog configuration.

This is a workable model. Do not introduce a second “workspace” entity merely to replace the UI word “workspace”. The UI workspace is a navigation context; the durable hierarchy is organization → business/brand (where used) → store/location.

## Ownership matrix

| Domain | Current writer/reader | Target owner | Status |
| --- | --- | --- | --- |
| Organization identity | Core Hub data store over `public.organizations` | Core | PARTIAL / migrate ownership |
| Business/brand | Historical Hub/POS/Play schema | Core control plane, app projections | UNKNOWN/PARTIAL |
| Store/location | Core Hub routes; app migrations also contain shared tables | Core | PARTIAL / high migration risk |
| Membership | Core resolution and creation; app reads | Core | PARTIAL |
| Store membership | Core resolution; app RLS/migrations | Core | PARTIAL |
| App assignment | Core + legacy public assignment tables | Core | PARTIAL |
| Store operational data | POS/Play/app owners | App owner | GOOD direction |

## Required design decisions

- Define whether `brand` is a first-class billing/identity boundary or only a grouping under an organization.
- Define whether a location can belong to multiple businesses/brands. If not, enforce it in the data model.
- Define organization owner/admin/member roles separately from app/store roles.
- Define the canonical external identifier used by app APIs and events; do not let each app invent a store ID mapping.
- Define archival/deletion semantics for an organization and location. Development reset may delete data, but production must use retention and audit rules.

## Creation flow target

```text
Create organization
  → Core creates org + owner membership + Hub assignment
    → optional business/brand profile
      → create or instantiate store template
        → Core creates store/app bindings
          → app provisioning events
            → app-specific setup/readiness
```

Creation must be idempotent, auditable, and safe to retry. A failed app provisioning step must not create a second store or silently grant access.

## Security findings

- Store loaders/actions must derive the organization from the authenticated Core principal and validate the store relationship server-side.
- Client headers can help route selection but must not override the principal’s organization or store scope.
- Template and duplicate operations must copy configuration only; they must not copy member sessions, provider credentials, payment identifiers, device identity, audit history, or secrets.
- “All stores” views require explicit organization permission and bounded pagination.

