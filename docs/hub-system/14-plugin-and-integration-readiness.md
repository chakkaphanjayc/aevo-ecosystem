# Plugin and Integration Readiness

## Current state

App-specific integration concepts exist in the app repositories (for example external service/integration configuration and provider adapters), but there is no demonstrated canonical cross-app plugin registry and lifecycle. Core application registry and connection tables are a suitable foundation for first-party app integrations; they are not yet a generic plugin runtime.

## Recommended scope

Build only the control-plane boundary first:

- integration/plugin identity and lifecycle;
- supported app and scope;
- installation and consent state;
- required permissions and data classification;
- secret reference in Secret Manager;
- health/handshake status;
- install, rotate, revoke, and uninstall audit events.

Keep runtime adapters in the owning app or a dedicated integration service. Do not load arbitrary remote code in Hub and do not store third-party secrets in Hub/Core business tables.

## Capability matrix

| Capability | Current rating | Recommendation |
| --- | --- | --- |
| First-party app registry | PARTIAL | Extend Core registry/manifest. |
| Generic plugin catalog | MISSING | Defer until a concrete integration needs it. |
| Credential storage | PARTIAL | Secret Manager references and rotation workflow. |
| OAuth consent/callback | APP-SPECIFIC | Accounts/Core allowlists plus app adapter. |
| Tenant-scoped installation | PARTIAL | Reuse installation/entitlement model. |
| Runtime execution | APP-SPECIFIC | Keep out of Hub. |
| Audit/revocation | PARTIAL | Core lifecycle and audit events. |

