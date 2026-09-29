# Target Architecture

## Target topology

```text
                         ┌──────────────────────────┐
                         │ Accounts / Identity      │
                         │ IdP, PKCE, recovery, SSO │
                         └────────────┬─────────────┘
                                      │ internal identity/session calls
┌──────────────┐       ┌──────────────▼──────────────┐       ┌───────────────┐
│ Hub :4330    │──────▶│ Edge :4000                  │──────▶│ Core API       │
│ Admin :4335  │       │ ingress, CORS, HMAC, limits │       │ auth/control   │
└──────────────┘       └─────────────────────────────┘       │ plane + audit  │
                                                            └──────┬────────┘
                                                                   │
                ┌──────────────────────────────────────────────────┼────────────┐
                │                                                  │            │
          ┌─────▼─────┐                                      ┌─────▼─────┐ ┌───▼───┐
          │ POS       │                                      │ Play      │ │ Go    │
          │ domain    │                                      │ domain    │ │customer│
          └───────────┘                                      └───────────┘ └───────┘

              Core-owned control-plane DB / projections / outbox
              App-owned domain DBs and app-specific RLS
              Worker probes, events, tasks; Infrastructure provisions all runtime
```

## Authority rules

1. Hub is a UI and orchestration surface, not a database owner.
2. Edge is transport/security ingress, not a business gateway.
3. Accounts proves identity and brokers credentials; Core decides application access.
4. Core owns the control-plane model and migration lifecycle.
5. Apps own their operational domain data and business rules.
6. Admin uses a separate privileged app session and UI.
7. Contracts are versioned and released; app manifests are declarative.
8. Background work is asynchronous and idempotent.
9. Digital Sign remains an independent product boundary.

## Control-plane data model target

```text
IdentityUser
  └─ OrganizationMembership ── Organization ── Business/Brand (optional)
                                  └─ Store/Location
AppRegistry ── Installation ── Entitlement
      └─ StoreApplicationBinding ── FeatureConfiguration
Membership ── AppAssignment ── AppRole/Scope
Device ── StoreBinding
AuditEvent / OutboxEvent / ConnectionStatus
```

## Target consistency model

- Core writes control-plane state transactionally.
- Outbox events notify apps/workers after commit.
- App provisioning is retryable and reports status.
- Hub reads Core projections with explicit freshness metadata.
- App domain writes remain in app-owned transactions.
- Cross-system workflows use idempotency keys and compensating actions, not distributed database transactions.

