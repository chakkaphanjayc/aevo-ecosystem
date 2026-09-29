# Workforce and Permissions

## Current model

The schema and Core data stores distinguish organization memberships, store memberships, roles, permissions, app assignments, app scopes, and app roles. This is the right separation for a multi-application organization workspace.

Hub UI currently exposes member management and application assignments. POS/Play also read app assignment-related tables locally. Admin is a separate privileged plane.

## Permission planes

| Plane | Example | Authority |
| --- | --- | --- |
| Platform | manage application registry, impersonation, system audit | Core/Admin |
| Organization | manage organization profile, stores, members, billing | Core/Hub |
| Store | access a particular location, configure local app | Core/Hub + app API |
| Application | use POS, Play, Queue, Kiosk | Core assignment + app API |
| Domain | refund sale, edit booking, close register | Owning app |

Do not flatten these into one global role. A platform administrator must not become an organization employee merely by using an Admin session, and a store operator must not gain Hub organization-management permissions.

## Current gaps

- The shared assignment tables have multiple app readers, so schema changes need a compatibility contract.
- Permission names and app-specific scopes need a published registry and deprecation rules.
- Member invitation, acceptance, suspension, and removal lifecycle is not fully documented as an event/state machine.
- Bulk assignment and audit behavior need explicit idempotency and rate-limit tests.

## Required security behavior

- deny by default when assignment is absent, expired, suspended, or app code mismatches;
- do not trust client-selected app/store headers;
- do not copy member assignments or sessions during store duplication/template creation;
- audit grants, revocations, role changes, invitation acceptance, and privileged overrides;
- provide a safe session revocation path after a role or assignment downgrade.

