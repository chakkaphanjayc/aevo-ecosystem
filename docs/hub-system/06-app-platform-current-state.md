# App Platform Current State

## Current registry and app boundaries

Core migration `0002_admin_control_plane.sql` seeds an application registry for Hub, Admin, Go, Play, POS, Kiosk, Queue, and Digital Sign. The Hub UI also exposes a catalog of store applications (`PLAY`, `POS`, `KIOSK`, `QUEUE`) and feature metadata for store configuration.

The historical Hub schema contains a separate public `apps` table, app subscriptions, app access, and feature/entitlement helpers. This means two representations currently exist:

1. Core `aevo_application_registry` and connection tables.
2. Transitional public `apps`, `app_subscriptions`, assignment, and store-access tables.

## Capability matrix

| Capability | Current state | Rating | Target |
| --- | --- | --- | --- |
| App registry | Core registry seeded; UI catalog partly hard-coded | PARTIAL | Core registry + versioned manifest contract. |
| App launch URL | Hub action uses configured app URLs | PARTIAL | Registry-managed URL, app code, audience, health/handshake metadata. |
| Organization installation | subscriptions/entitlements exist in transitional schema | PARTIAL/DUPLICATED | Core installation projection from billing/admin command. |
| Store app enablement | Core store-application routes and Hub UI | PARTIAL | Core app binding with entitlement and store scope checks. |
| Feature availability | Hub action and transitional store availability data | PARTIAL | App-owned feature schema exposed via manifest/contract. |
| Connection probe | Core `/health` probe plus worker persistence | PARTIAL | Signed compatibility handshake. |
| App-specific domain | POS/Play/Go own domain runtime | GOOD | Preserve ownership. |
| Generic plugin runtime | No canonical cross-app runtime | MISSING | Defer; build only registry/credential boundary first. |

## Manifest recommendation

The manifest should be declarative and versioned. Minimum fields:

- immutable `applicationCode`;
- display name, owner repository, lifecycle status;
- contract/API version and supported protocol versions;
- launch origin and allowed callback origins;
- required entitlements and install scope (`organization`, `store`, or `user`);
- declared capabilities/features and configuration schema references;
- health URL plus signed compatibility handshake endpoint;
- event types emitted/consumed;
- data classification and required permissions;
- rollout/deprecation metadata.

The manifest must not contain secrets, executable arbitrary UI, or an authorization bypass. Feature display in Hub is advisory; Core evaluates actual access.

## App registry migration approach

1. Treat Core `aevo_application_registry` as the canonical identifier source.
2. Reconcile legacy public `apps` rows by immutable app code.
3. Record aliases and legacy IDs in a migration map.
4. Move connection metadata and lifecycle state to Core.
5. Keep app-specific feature definitions in app-owned code/contracts, projected into the manifest.
6. Delete duplicated registry writes only after read parity and deployment evidence.

