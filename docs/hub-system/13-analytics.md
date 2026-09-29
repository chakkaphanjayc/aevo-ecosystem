# Analytics and Metrics

## Current state

Core owns `aevo_product_events` and has administrative/Go control-plane projections. Hub overview/stats routes read organization/store/application counts. App repositories own operational data and their own domain metrics. Infrastructure enables BigQuery-related services, but this audit found no complete, evidenced warehouse pipeline or canonical metric catalog.

## Target model

```text
App domain event (tenant + actor + app + schema version)
  → authenticated event ingress
    → durable event/outbox
      ├─ operational projection for Hub/Admin
      ├─ app-specific reporting
      └─ optional warehouse export
```

Hub should read bounded control-plane projections, not query every app database synchronously for every page load. App metrics should remain app-owned unless they are explicitly promoted to a shared metric contract.

## Metric ownership

| Metric | Owner |
| --- | --- |
| organizations/stores/members/app bindings | Core projection |
| POS sales/register/inventory metrics | POS |
| bookings/venues/waitlist metrics | Play |
| customer discovery/TraceDee metrics | Go/TraceDee domain |
| application health/probe metrics | Worker/Core |
| billing/entitlement metrics | Billing/Core |
| platform operations/audit metrics | Core/Admin |

## Gaps

- Define event envelope and tenant boundary for every producer.
- Define retention, PII classification, deletion, and aggregation rules.
- Add freshness indicators to Hub dashboard data.
- Avoid synchronous fan-out from Hub to all app APIs for a page render.
- Prove worker acknowledgement/retry/dead-letter behavior before treating eventing infrastructure as live.

