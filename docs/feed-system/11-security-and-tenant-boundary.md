# Security and tenant boundary

## Customer requests

The browser is untrusted. The Customer API must:

- resolve the GO app-scoped opaque session server-side;
- distinguish anonymous and authenticated principals;
- ignore client actorId and tenant hints when they conflict with the session;
- enforce account-to-save/follow and personalization preferences server-side;
- apply request, event, cursor, and media limits;
- use HttpOnly cookies and CSRF protection for state-changing browser calls;
- never expose a Supabase service-role key or Cloud SQL credential.

The Feed is public/cross-tenant only where the underlying public projection explicitly permits it. Organization/store scope must be resolved server-side for any operation that crosses into private or operator data.

## Admin requests

Feed configuration, moderation, projection rollback, event diagnostics, and sensitive ranking evidence require the ADMIN app session and platform permissions. Organization membership is not a substitute for platform authorization.

Recommended permissions:

- go.settings.read;
- go.settings.manage;
- go.analytics.read;
- content.moderate;
- system.jobs for operational projection actions;
- audit.read for change history.

Use platform roles and explicit scope as defined by aevo-security-architecture. Dangerous mutations require audit records with actor, action, target, reason, request ID, before state, after state, and result.

## Database controls

Keep RLS enabled on all exposed Supabase/Core tables. The application may use a server-side privileged client, but application policy still resolves the principal and visibility before returning data.

Rules:

- no service-role credentials in Go, Admin, or browser bundles;
- no direct browser reads from tracedee tables;
- no user-supplied SQL, table names, joins, or function names;
- SECURITY DEFINER routines require a fixed search_path, narrow grants, and explicit review;
- public read models expose only safe columns;
- event and evaluation tables have retention and access policies;
- updates require both row visibility and write policy;
- deleted/removed content remains recoverable only in protected operator paths.

## Cross-database calls

If Core API uses a private Supabase adapter during transition, isolate credentials in server-only secrets, restrict network access, set timeouts, and log only request IDs and operation names. Do not let a Supabase connection become a second authorization system. Core session/policy resolution remains authoritative.

## Privacy

Do not expose raw ranking feature vectors, creator reputation components, block/mute reasons, exact location, private profile fields, or internal moderation evidence. Hash or tokenize anonymous identifiers for analytics, honor account deletion, and maintain a data inventory for all retained Feed events.

