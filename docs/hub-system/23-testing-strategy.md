# Testing Strategy

## Test layers

| Layer | Purpose | Required scope |
| --- | --- | --- |
| Static/contract | route and schema compatibility | OpenAPI, generated types, deprecated route search |
| Unit | local authorization/mapper/state rules | Core, Accounts, Edge, worker, Hub actions |
| Component | UI loader/action and error states | Hub modern routes and Admin boundary |
| Integration | real Edge→Core→DB and Accounts handoff | auth, org/store/app/billing flows |
| Tenant-security | isolation and denial | two organizations, stores, roles, apps, sessions |
| Migration | upgrade/backfill/restore | clean DB and representative legacy snapshot |
| E2E | browser journeys | owner onboarding, store setup, app launch, revoke |
| Resilience | retries/timeouts/degradation | worker, connection probes, Core dependency failures |

## Minimum end-to-end scenarios

1. Register owner → create organization → create store → open Hub workspace.
2. Owner creates a store from a template and duplicates it; no credentials/sessions/devices are copied.
3. Owner installs an app, enables it for one store, and assigns a member; another store remains denied.
4. Member signs into POS and Play with app-scoped sessions; Hub permissions are not inherited accidentally.
5. Billing webhook activates, downgrades, cancels, and retries; Core entitlement projection is idempotent.
6. App launch succeeds with valid assignment/entitlement and fails with safe reason otherwise.
7. Connection test distinguishes healthy, incompatible, unauthorized, unavailable, and misconfigured.
8. A cross-tenant identifier/header cannot bypass Core scope.
9. Session logout/revocation immediately blocks protected Core and app routes.
10. Onboarding and password reset use only current routes and allowed origins.

## Migration gates

- no data-loss diff in reconciliation;
- all shared-table writers are known;
- RLS and service-account tests pass;
- migration lock behavior is tested;
- backup restore is verified;
- old and new read models agree for the observation window;
- production rollout has a measurable rollback trigger.

## Forbidden test shortcuts

- treating `allowed=true` development mode as proof of authorization;
- testing only a same-tenant happy path;
- mocking Core while claiming an integration test;
- copying production secrets to local fixtures;
- including `aevo-digital-sing` in a destructive Hub reset.

