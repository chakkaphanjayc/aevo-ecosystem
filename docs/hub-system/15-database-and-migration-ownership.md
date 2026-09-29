# Database and Migration Ownership

## Current state

The launcher and Core documentation now place migration execution in Core/Infrastructure. The Hub repository still contains a large historical Supabase migration tree, and POS/Play also contain migrations for app and shared control-plane-shaped tables. Core migrations `0001`–`0010` add the new authority tables and compatibility objects, but the complete organization/store/app domain schema remains transitional.

## Ownership decision

| Data class | Migration owner | Runtime writer |
| --- | --- | --- |
| Core sessions, identity projection, app registry, audit, outbox | Core/Infrastructure | Core/worker |
| Organization/business/store control plane | Core/Infrastructure | Core |
| Membership/app assignment control plane | Core/Infrastructure | Core |
| Billing/entitlement projection | Core/Infrastructure | verified billing consumer/Core |
| POS domain | POS app owner, under shared migration policy | POS |
| Booking/venue domain | Play app owner, under shared migration policy | Play |
| Customer/TraceDee domain | Go/TraceDee owner | Go/domain services |
| Digital Sign data | Digital Sign owner | Digital Sign |

## Required migration controls

- one ledger and one lock per database/environment;
- migration service account separate from runtime accounts;
- forward-only, reviewed, idempotent migrations;
- preflight and dry-run against a representative copy;
- schema/table writer inventory;
- rollback or compensating migration strategy;
- backup/restore evidence;
- row-count/checksum reconciliation for shared tables;
- explicit compatibility window and exit date;
- no Hub-startup migration side effect.

## Shared-table transition

The historical Hub migration tree should be treated as a read-only compatibility source until all rows/constraints/policies are represented in the Core-owned migration path. “No Hub migration runner” is necessary but not sufficient: ownership is only complete when other app migration pipelines stop creating or altering the same control-plane tables.

## Development policy

The current local development policy allows destructive reset/creation within the explicitly scoped development databases and excludes `aevo-digital-sing`. That policy must never be copied to staging or production credentials. Every destructive command should print the selected environment/database before executing.

