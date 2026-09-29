# Settings and Configuration Ownership

## Ownership rule

Configuration belongs to the narrowest domain that can enforce it, while Core owns cross-domain identity, access, lifecycle, and reference metadata.

| Configuration | Owner | Hub behavior |
| --- | --- | --- |
| Organization name, locale, legal profile | Core control plane | Edit through Core API. |
| Business/brand identity | Core if shared; app projection if app-specific | Do not duplicate silently. |
| Store address, timezone, currency, status | Core control plane | Store workspace editor. |
| Store app enabled/disabled | Core | Hub toggle; Core checks installation/entitlement. |
| App feature configuration | Owning app schema with Core scope | Hub invokes typed app config contract. |
| Catalog/products | POS/owning catalog app | Hub may provide an orchestrated view, not a second catalog authority. |
| Booking/court/venue settings | Play | Hub deep-links or calls Play contract. |
| Billing plan/subscription | Billing/Core projection | Hub displays status; never writes webhook truth. |
| Secrets/integration credentials | Secret Manager + owning app adapter | Hub sends setup command; never reads plaintext secret. |
| Platform feature flags | Core/Admin | Separate from tenant feature availability. |
| Customer profile | Core/shared identity projection | App-specific customer data remains app-owned. |

## Current risks

- Hub store UI presents catalog operations directly through Core routes even though product/catalog ownership may belong to POS or another app.
- Feature lists are hard-coded in Hub and can drift from app capability definitions.
- Environment variables and registry rows can disagree about launch origins.
- App settings are not yet represented as a consistent versioned schema with validation and migration semantics.

## Target configuration contract

Every app configuration section should declare:

- app code and scope (`organization` or `store`);
- schema version;
- read capability and write capability;
- validation result and user-safe error codes;
- secret references, not values;
- migration strategy for schema changes;
- audit event type;
- rollback/default behavior.

