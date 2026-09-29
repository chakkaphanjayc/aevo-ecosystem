# API and Contract Ownership

## Current state

`aevo-contracts` provides the versioned package, OpenAPI document, application codes, access/meta routes, and Hub domain transport types. Hub server code uses the versioned client. Admin, POS, and Play also contain local contract packages, which is reasonable for app-domain contracts but risky when they redefine Core control-plane objects.

## Contract boundary

| Contract | Canonical owner | Consumer |
| --- | --- | --- |
| Identity broker/SSO | Accounts + Core internal contract | Hub/Admin/apps |
| App session/access | Core | all first-party apps |
| Hub organizations/stores/members/apps | Core | Hub/Admin projections |
| App manifest/installation/entitlement | Core + `aevo-contracts` | Hub/Admin/apps |
| POS domain | POS | POS/Hub orchestration where explicitly needed |
| Booking domain | Play | Play/Hub orchestration where explicitly needed |
| Customer surface | Go/domain | Go and customer-safe consumers |
| Digital Sign | Digital Sign | Digital Sign only |

## Required contract practices

- every breaking change receives a new API version or an expand/migrate/contract release;
- OpenAPI, runtime route inventory, generated TypeScript, and integration fixtures are updated together;
- request/response types distinguish user-safe denial from internal errors;
- pagination, idempotency keys, request IDs, and concurrency/version fields are explicit;
- tenant scope is server-derived and never a client authorization field;
- deprecated fields have an owner and removal condition;
- contract tests run against a real Core/Edge process, not only type-checking.

## Known drift

- Core implementation metadata is stale relative to route code.
- Hub application lists/features are partly hard-coded.
- Admin and app-local contracts can duplicate control-plane shapes.
- Old “canonical gateway” terminology remains in some app tests/docs and should be removed after route ownership is verified.

