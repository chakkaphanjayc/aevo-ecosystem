# Failure modes and recovery

ARCHITECTURE REVIEW REVISION

| Failure | Public behavior | Operator signal | Recovery |
| --- | --- | --- | --- |
| Config unavailable | Use last valid config, then deterministic code baseline | Config propagation/config cache alert | Repair Core/config projection; publish or rollback |
| Optional generator timeout | Serve other candidates, mark degraded internally | Generator latency/error metric | Inspect query plan or lower budget |
| Trace source unavailable | Serve Place baseline if safe, or a clear empty state | Source health alert | Restore source; no client-side fabricated results |
| Place source unavailable | Serve Trace baseline if safe | Source health alert | Restore source |
| All candidate sources unavailable | Safe empty/degraded response | High-priority alert | Restore data plane |
| Hydration item removed | Omit and refill from eligible pool | Dropped/stale projection metric | Rebuild projection/moderation cache |
| Cursor invalid/expired | Return typed 400 and request a fresh first page | Cursor error rate | Client restarts session |
| Config changes mid-session | Continue old version until TTL/session expiry | Version mismatch metric | Expire or revoke only when safety requires |
| Event ingest unavailable | Return Feed response; bounded client retry/queue | Event rejection/outbox lag | Replay durable intake |
| Outbox consumer dead | Continue domain writes; no synchronous rank update | Dead-letter/age alert | Retry/replay by idempotency |
| Moderation projection unavailable | Serve last-known-good eligible state only within the freshness bound; unknown/new content fails closed; disable stale source after bound | Projection freshness/invalidation alert | Restore/rebuild eligibility projection; replay removal events |
| Media not ready | Safe text/placeholder or omit by policy | Media processing metric | Retry/quarantine and reprocess |
| Database overload | Shed optional sources, lower candidate budget, use safe cache | DB pool/query latency | Scale/read model/indexes |
| Admin Core API unavailable | Show read-only cached active version and no mutation controls | Admin source status | Restore Core API |

## Rollback rules

- ranking rollback selects the prior validated config;
- projection rollback uses the existing projection run mechanism;
- code rollback and config rollback are separate operations;
- event schema changes are backward-compatible for at least the retention window;
- database migrations are additive first, with destructive cleanup delayed until readers are removed;
- cache invalidation is safe to repeat.
- no new Feed schema migration is applied before FEED-000 ADR approval;
- explicit removal/suspension invalidation takes precedence over last-known-good eligibility;
- Core config rollback and compatibility-route rollback are independently reversible.

Never use a client release as the only kill switch. The server must be able to disable personalization and optional generators independently.

## Incident runbook minimum

1. identify request/config/ranking version;
2. check Core, Edge, data adapter, projection freshness, and event backlog;
3. activate deterministic kill switch if ranking or safety is suspect;
4. disable the failing generator;
5. preserve event/evaluation evidence;
6. rollback config or projection if required;
7. verify public safety and page stability;
8. document the cause and follow-up task.
