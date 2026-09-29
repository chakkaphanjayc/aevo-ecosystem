# Redundancy and Deprecation Audit

## Current redundancy map

| Redundant surface | Current locations | Risk | Deprecation condition |
| --- | --- | --- | --- |
| Hub legacy runtime | historical `apps/web`, gateway/adapters removed from runtime | stale links/docs may return | no supported launcher/reference remains; smoke tests pass. |
| Hub migration tree | `aevo-hub/supabase/migrations` | false ownership and schema drift | all required schema represented in Core/Infrastructure; read-only archive retained. |
| App registry | Core registry, public `apps`, Hub/Admin hard-coded catalogs | conflicting metadata | parity report and one canonical registry. |
| Session/auth adapters | Accounts/Core plus app-local packages | second authority risk | app-local code proven adapter-only and no durable session writes. |
| Control-plane contracts | `aevo-contracts`, Admin/app local packages | drift and unsafe casts | shared control-plane shapes released and consumers migrated. |
| Shared public schema migrations | Hub, POS, Play, Core compatibility migrations | concurrent DDL/data ownership | one writer/lock and no app migration alters control-plane tables. |
| Port/origin docs | old `:4321` references versus modern `:4330` | wrong callback/launch behavior | repository-wide origin inventory is clean. |

## Removal rules

Never remove a compatibility surface merely because a new code path exists. Remove it only after:

1. code/search inventory proves no runtime or deployment reference;
2. contract and callback consumers are migrated;
3. data reconciliation is complete;
4. integration and tenant-security tests pass in a clean environment;
5. logs/metrics show no traffic for the agreed observation window;
6. a rollback or restore procedure exists;
7. the removal is documented in the release/deprecation record.

The current audit does not invent traffic observations. Those must come from deployment telemetry when available.

