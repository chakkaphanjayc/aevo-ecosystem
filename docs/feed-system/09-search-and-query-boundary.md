# Search and query boundary

## Two different problems

Public Feed retrieval and Admin structured data discovery must not share an unsafe, over-generalized execution path.

Public Feed needs a small typed request:

    surface, tab, q, area, category, locationContext, cursor, limit

The server maps these fields to declared candidate-generator capabilities and ranking context. The client cannot choose tables, joins, SQL, ranking expressions, or arbitrary sort fields.

Admin needs the Aevo universal Query AST for moderation queues, feed diagnostics, event reports, saved views, exports, and operational dashboards. The AST is versioned, metadata-driven, tenant-safe, permission-aware, quota-aware, and compiled server-side. It must not be used as a loophole for public Feed ranking or raw SQL.

## Public text retrieval

The first release may keep normalized q matching in the Trace and Place generators. Before traffic grows, replace broad per-row LIKE scans with a declared search strategy:

- Postgres full-text/search vector for title, description, area, and topic tags;
- trigram index for carefully bounded fallback matching;
- dedicated search service only after measured scale requires it.

Search result identity remains a Feed candidate. Search relevance is a source feature; it does not bypass safety, diversity, or final ranking.

## Admin query models

Register Feed operational models only after canonical views and RLS exist, for example:

- feed.moderation_item;
- feed.config_revision;
- feed.ranking_evaluation;
- feed.event_summary;
- feed.outbox_health.

Each model must declare readable fields, operators, sort/group capability, retention, and required permission. Sensitive fields such as raw event metadata, internal reputation components, and actor identifiers require explicit platform permissions.

## Execution order

For Admin query routes:

1. authenticate the ADMIN session;
2. resolve platform role and any organization/store scope;
3. check permission;
4. check entitlement;
5. check quota;
6. validate Query AST version and metadata;
7. compile through a server-owned adapter;
8. execute with RLS and audit where required.

The Feed route follows the equivalent public sequence but uses a surface-specific contract rather than accepting an arbitrary AST.

