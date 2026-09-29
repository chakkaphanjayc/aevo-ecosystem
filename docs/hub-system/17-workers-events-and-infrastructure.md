# Workers, Events, and Infrastructure

## Current state

Infrastructure defines Cloud Run, Cloud SQL, IAM, Secret Manager, Pub/Sub, Cloud Tasks, Cloudflare, and worker resources. `aevo-background-worker` exposes health/readiness, connection probes, Pub/Sub intake, and task-oriented boundaries. The connection-probe path is the most concrete active vertical. The Pub/Sub handler currently returns `WORKER_NOT_CONFIGURED` rather than acknowledging/persisting events.

## Assessment

| Area | Rating | Disposition |
| --- | --- | --- |
| Cloud runtime/IAM definitions | GOOD DIRECTION | Keep; verify least privilege. |
| Core migration service account | GOOD DIRECTION | Keep; add operational runbook/evidence. |
| App connection probes | PARTIAL/ACTIVE | Extend to compatibility handshake. |
| Pub/Sub domain events | SCAFFOLD | Do not call production-ready until consumer is implemented and tested. |
| Cloud Tasks commands | SCAFFOLD/UNKNOWN | Define producers, idempotency, retries, and DLQ ownership. |
| Secrets | PARTIAL | Ensure registry stores references only and rotation is tested. |
| Cloudflare ingress policy | UNKNOWN/PARTIAL | Document rate/WAF/origin policy and test it. |

## Event envelope minimum

```json
{
  "eventId": "immutable-id",
  "eventType": "namespace.entity.action",
  "schemaVersion": 1,
  "occurredAt": "RFC-3339",
  "producerApp": "POS",
  "organizationId": "server-derived",
  "storeId": "optional-server-derived",
  "actor": { "type": "user|system|device", "id": "opaque" },
  "payload": {},
  "traceId": "request-trace"
}
```

The envelope is a contract, not permission. Consumers must re-check authorization for commands and protect against duplicate delivery.

## Operational gates

- readiness must fail when required dependencies are missing;
- retries must be bounded and observable;
- poison messages go to a dead-letter path with replay controls;
- worker service accounts cannot alter tenant data outside their declared operation;
- metrics include lag, retry count, dead letters, probe latency, and failure reason;
- local development can use emulators/stubs, but production-like tests must run against real auth/signature boundaries.

