# App Registry and Manifest Audit

## Current state

The Core registry is the correct direction, but the Hub UI still carries hard-coded application lists and labels. The historical Supabase schema also contains a public `apps` table and app metadata. Admin has application-registry UI and local contract definitions. This creates a discovery and ownership gap.

## Current versus target

| Concern | Current | Target owner | Action |
| --- | --- | --- | --- |
| Immutable app code | Core registry seeds codes | Core | KEEP |
| Display metadata | Core plus Hub/Admin hard-coded values | Core manifest projection | CONSOLIDATE |
| Launch URL | Environment/UI configuration | Core registry, environment-specific | MOVE |
| API contract version | Package/OpenAPI plus app-local definitions | `aevo-contracts` release | CONSOLIDATE |
| Supported capabilities | Hub static labels and app code | App manifest + typed capability schema | EXTEND |
| Lifecycle | Registry/status fields | Core + Admin approval workflow | EXTEND |
| Secret credentials | Not part of UI registry | Secret Manager/app-owned adapter | KEEP OUT OF REGISTRY |

## Manifest rules

- An app code is immutable and never reused after retirement.
- Manifest changes are versioned and backward-compatible by default.
- A manifest declares capabilities; it does not grant entitlements.
- The registry stores references to secrets, never secret values.
- A manifest can declare required organization/store/user scope and required permissions.
- Launch and callback origins are allowlisted server-side.
- A disabled or deprecated app remains readable for audit/history but cannot be newly installed.

## Acceptance evidence for a future implementation

- Hub, Admin, Core, and every first-party app resolve the same registry record for the same code.
- A registry update invalidates cached app catalogs without a browser deploy.
- An unsupported contract version is shown as incompatible, not merely “healthy”.
- A store cannot enable an app that is not installed/entitled at the organization level.
- A retired app cannot be installed but existing data remains accessible according to retention policy.

