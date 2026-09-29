# Current Hub Architecture

## Current request path

The supported Hub path is:

```text
Hub Modern :4330
  → Edge Gateway :4000
    → Core API :5099
      → Accounts :8787 for identity operations when needed
      → PostgreSQL / transitional public control-plane tables
```

`aevo-hub/apps/hub/app/routes/hub-layout.tsx` loads the Hub principal and access decision on the server. `apps/hub/app/lib/auth.server.ts` uses the versioned API client and forwards the app-scoped browser session through Edge/Core. Internal navigation uses a route revalidation policy to avoid re-running the full shell authorization request unnecessarily.

## UI responsibilities currently present

- Home/workspace overview.
- Organization settings and profile.
- Stores and branches list.
- Store workspace with overview, settings, applications, and catalog sections.
- Store creation, template instantiation, and duplication.
- Store application access and feature availability configuration.
- Members, application assignments, and account security.
- App launch and connection-test actions.

These are appropriate Hub responsibilities, provided that all mutations remain Core API operations and no browser path obtains database credentials.

## Current route boundary

The modern router defines `/modern/login`, password recovery/reset, onboarding, the Hub layout, `/settings`, `/stores`, `/stores/:storeId`, and `/security`. The former `/organize`, `/workspace`, and `/setup` routes are not part of the modern route table.

This creates one confirmed compatibility defect: Core onboarding registration still returns `/modern/organize` in `aevo-core-api/src/Aevo.CoreApi/HubApiEndpoints.cs`. That response must be updated as part of a later implementation task; this audit does not change it.

## Positive decisions to preserve

1. Hub does not start `aevo-hub/apps/gateway` in the current launcher.
2. Hub does not run a database migration runner.
3. Server-side loaders/actions call Core through a typed client.
4. Access decisions are made from Core membership and app assignment rather than client-provided organization/store headers.
5. Store app access and feature configuration are modeled as explicit actions rather than inferred from navigation visibility.

## Current weaknesses

- The Core route inventory, OpenAPI contract, README status, and UI assumptions are not yet one synchronized release artifact.
- The Edge CORS compatibility set still includes removed Hub port `4321`.
- App connection testing is a health check, not a protocol or tenant-isolation handshake.
- Development-only unlimited entitlements are visible in a route and must be guarded by environment and test policy.
- Some UI labels and old documentation still refer to the former gateway or organize surface.

## Architectural conclusion

The Hub runtime shape is close to the target shape. Remaining work is primarily contract synchronization, data/migration ownership convergence, security hardening, and removal of stale compatibility assumptions—not another Hub gateway implementation.

