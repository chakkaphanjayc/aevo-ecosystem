# Installation, Entitlement, and Location Binding

## Terms

- **Installation:** an organization-level decision that an app is enabled for the organization.
- **Entitlement:** a plan/billing-derived right to use an app or capability.
- **Location binding:** a store/location-level decision that an installed app is active there.
- **Assignment:** a user/member-level permission or role to use the app.
- **Feature availability:** an app/location configuration, not a replacement for authorization.

These must remain separate. A user identity, store membership, or UI toggle must not by itself create a billing entitlement.

## Current evidence

Core exposes subscriptions, entitlements, app catalog, store application access, store availability, and member app assignment routes. The historical Hub migrations contain `app_subscriptions`, entitlement helpers, store application access, and membership assignment tables. The Hub UI can configure store applications and feature availability.

## Current risks

1. Core and historical public schema contain overlapping concepts.
2. The development entitlement check can return `allowed = true` unconditionally.
3. The store UI’s hard-coded application list can drift from the Core registry.
4. The application connection test does not validate the entitlement or location-binding protocol.

## Target evaluation order

```text
Core identity
  → organization membership
    → organization installation
      → current entitlement / plan
        → store membership
          → store application binding
            → member application assignment
              → app role/scope
                → app feature configuration
```

Every step should return a reason code that is safe to show to the user without disclosing privileged data. The final decision should be evaluated by Core for cross-app control-plane actions and by the app domain API for app-specific records.

## Migration recommendation

- Pick one canonical row identity for app code, organization, and store.
- Build a reconciliation view comparing legacy subscriptions/access/assignments to Core projections.
- Backfill Core installation and binding projections without deleting source rows.
- Run dual-read comparison in development and test environments.
- Make writes Core-only; app runtimes may consume read projections and emit app-domain events.
- Remove compatibility writers only after a release window with zero divergence.

