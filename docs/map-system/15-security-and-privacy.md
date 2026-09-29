# Security and privacy

Status: security boundary implemented for public projections and Admin
read-only access; privileged workflow authorization remains gated

## Security boundary

The browser is untrusted. All Place, claim, submission, discovery, and Admin
decisions must be enforced server-side. Follow the existing Aevo security
architecture:

- app-scoped opaque sessions;
- HttpOnly cookies and matching CSRF protection;
- platform RBAC separated from organization membership;
- server-derived assignments and tenant scope;
- backend-only service-role/database credentials;
- RLS as defense in depth;
- Core API as the authoritative privileged API;
- structured audit for dangerous mutations.

Relevant references:

- aevo-admin/docs/REPOSITORY_BOUNDARY.md
- LOCAL_DEVELOPMENT.md
- aevo-security-architecture skill guidance in the workspace
- Supabase security guidance used by the existing migrations

## Public reads

Public discovery can expose only an explicit field allowlist:

- canonical Place identity and public slug;
- public name/category/area;
- public point/address policy;
- approved verification/capability badges;
- public media and rating projection;
- attribution/freshness.

Do not expose:

- organization membership;
- private evidence;
- raw source payloads;
- private phone/email unless the business policy explicitly allows it;
- internal moderation notes;
- service-role or database credentials;
- user location history;
- hidden/unpublished Places.

## Tenant and organization isolation

Business fields and claims must be scoped to the organization/branch derived
from the authenticated session. A client-provided organization ID is only a
selector to validate, not an authority.

For every business read/write:

1. validate app-scoped session;
2. resolve assignments and organization scope;
3. enforce permission;
4. apply RLS/tenant predicate;
5. validate Place relationship;
6. audit the result.

A public Place may be linked to a business without exposing the tenant's
private records.

## Admin isolation

Admin requests require:

- application=ADMIN app-scoped session;
- active application registry boundary;
- platform role/permission;
- CSRF for browser writes;
- audit and reason;
- self-protection rules;
- server-only Core API access.

The standalone Admin BFF must never query Supabase with a service role on
behalf of arbitrary browser parameters.

## Query security

Map/search filters are typed and allowlisted. Reject:

- raw SQL or query fragments;
- table/column names;
- arbitrary sort expressions;
- unbounded bbox/radius;
- client-selected tenant/source/verification scope;
- client-selected RLS bypass;
- hidden internal fields.

Admin query lists should use the universal typed query boundary and enforce
auth -> scope -> permission -> entitlement/quota -> execute.

## User location privacy

Near-me should be:

- explicit opt-in;
- ephemeral by default;
- bounded in precision/radius at the server;
- excluded from analytics unless separately consented;
- absent from URL/history unless the user intentionally shares it;
- unavailable to other users/admins by default;
- not used as a permanent home/work inference.

If analytics needs coarse geography, derive a coarse region with a documented
retention/consent policy and discard the raw point.

## Community and evidence privacy

- protect reporter identity when policy requires;
- separate public submission text from private evidence;
- scrub EXIF and metadata from media where appropriate;
- validate/sanitize URLs and uploaded content;
- limit moderator access and audit reads;
- support deletion/takedown with legal retention exceptions;
- do not publish private residence coordinates by default.

## External source security

- whitelist source hosts/endpoints;
- prevent SSRF and redirects to private networks;
- use timeouts, size limits, and content-type validation;
- treat imported text/HTML as hostile;
- hash and version raw payloads;
- isolate parser workers from API request paths;
- record license/source metadata;
- use least-privilege credentials for source APIs.

## Data integrity

Canonical Place writes must enforce:

- stable IDs and uniqueness;
- paired/valid coordinates;
- valid lifecycle transitions;
- field ownership/provenance;
- optimistic revision or expected-version checks;
- idempotency for commands;
- merge/split referential integrity;
- no overwrite of protected/verified fields by untrusted sources.

## Audit requirements

Audit at least:

- Place publish/close/remove/restore;
- merge/split/redirect;
- source import accept/revert;
- claim approve/revoke;
- verification field changes;
- community approve/reject;
- evidence access and deletion;
- projection rebuild and cache invalidation;
- permission/role changes.

Audit records should include actor, app, scope, target, action, reason,
before/after or revision IDs, request ID, idempotency key, and timestamp.

## Threat-model exit gate

Before implementation, review:

- IDOR on Place/claim/submission IDs;
- cross-organization claim access;
- public leakage from joins/RPCs;
- service-role exposure;
- forged verification/capability fields;
- source poisoning and malicious URLs;
- mass submission/merge abuse;
- location tracking;
- stale cache revealing removed data;
- redirect/merge loops;
- audit tampering.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

Geocoding requests are location-sensitive and follow the same explicit,
server-owned policy as Near me:

- request only after user/admin/business intent;
- avoid storing raw device coordinates by default;
- do not infer a home/work location;
- apply provider-specific retention, caching, attribution, and commercial-use
  rules;
- sanitize provider responses and URLs;
- keep temporary geocoder results separate from canonical Place writes.

The public Map overlay is a stricter field allowlist than Search/Detail. It
must not leak claims, provenance notes, raw source IDs, private business
evidence, or live operational state. Public polygon geometry should also be
generalized or withheld for sensitive/private locations under policy.

Merged Place IDs are read-resolvable but write-rejected. Authorization checks
must run after canonical resolution and verify that the resolved target is
allowed for the actor and operation. The resolver must not be an RLS bypass.
