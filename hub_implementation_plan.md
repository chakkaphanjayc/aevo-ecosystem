You are continuing the Aevocado Hub architecture work after the completed
Hub architecture audit.

The following documents are now the source planning artifacts:

- docs/hub-system/00-executive-summary.md
- hub-implementation-plan.md
- all sibling docs/hub-system/\*.md architecture audit documents

This invocation is:

BATCH-HUB-000
Baseline, Ownership Ledger, Route/Data Authority Inventory

This is a CONTROLLED IMPLEMENTATION batch, but it is primarily an evidence,
architecture-boundary, and CI-guard batch.

DO NOT start HUB-001 or any later HUB task in this invocation.

==================================================
CURRENT AUDIT CONCLUSIONS
==================================================

The audit currently recommends the following target boundaries:

Aevo Accounts

- identity-provider broker
- PKCE / redirect policy
- credential/recovery operations
- SSO identity handoff
- NOT organization/application permission authority

Aevo Core API

- app-scoped sessions
- authorization
- organization control plane
- store/location control plane
- workforce/access orchestration
- app registry
- application installation
- entitlements
- audit
- canonical cross-app contracts
- Core-owned control-plane migrations

Aevo Edge Gateway

- public ingress
- CORS
- request IDs
- origin protection
- signature forwarding
- rate/WAF integration
- NOT business authorization authority

Aevo Hub

- Owner/Manager management UI
- Core API consumer
- NOT canonical control-plane database
- NOT another public gateway
- NOT operational domain owner for POS/Play/etc.

Aevo Admin

- privileged platform operator UI
- separate from organization Hub users

Aevo POS / Play / Go

- own their application-specific domains

Aevo Background Worker

- async/probe/task/event responsibilities only where actually needed

Aevo Contracts

- versioned inter-repository contracts

Aevo Infrastructure

- runtime resources
- IAM
- secrets
- deployment
- migration execution infrastructure

These are audit recommendations.

Verify all of them against the current repository state again where this batch
depends on them.

==================================================
PRIMARY OBJECTIVE
==================================================

Create an authoritative baseline of the current Aevocado control-plane
architecture so all later HUB migrations and removals can be done without
guessing.

At the end of this batch we must know:

1. Which repository owns every relevant runtime route.
2. Which repository owns every relevant database migration.
3. Which runtime writes every shared table.
4. Which services read every shared table.
5. Which API is canonical versus compatibility/transitional.
6. Which ports/origins/routes are current versus stale.
7. Which identity/session authority owns each application.
8. Which service evaluates organization/store/app access.
9. Which configuration/feature stores are canonical versus duplicate.
10. Which backend components are actually used.
11. Which components appear redundant but cannot yet be safely removed.
12. What exactly "store", "location", "business", and "organization" mean today.
13. Which architectural decisions must be resolved before HUB-005 or HUB-007.

This batch must NOT migrate production data.

==================================================
MANDATORY REPOSITORY PREFLIGHT
==================================================

Discover the actual workspace again.

At minimum inspect, if present:

aevo-hub
aevo-core-api
aevo-edge-gateway
aevo-accounts
aevo-admin
aevo-contracts
aevo-background-worker
aevo-infrastructure
aevo-pos
aevo-play
aevo-go

Do not assume these repositories are all canonical merely because they exist.

Explicitly keep aevo-digital-sing OUT OF SCOPE unless a shared platform
dependency references it and that reference is necessary to understand
ownership.

Before changing anything:

- inspect git status in every touched repository
- preserve dirty/untracked developer work
- do not reset
- do not clean
- do not stash
- do not overwrite unrelated work

Record the pre-existing state.

==================================================
PART 1 — RUNTIME ROUTE INVENTORY
==================================================

Inventory all relevant API/runtime routes.

Include:

Hub routes
Core public routes
Core Hub routes
Core Admin routes
Core internal routes
Accounts routes
Edge forwarded routes
POS backend routes
Play backend routes
Go-related Core routes where cross-app infrastructure is relevant
Worker internal routes
health/readiness routes

For every route record:

route
HTTP method
repository
handler/source file
runtime owner
authentication model
authorization model
application scope
tenant/location scope
caller(s)
Edge exposure
contract/OpenAPI status
canonical/transitional/legacy/unknown

Specifically search for stale references including:

:4321
:4330
/modern/organize
legacy Hub routes
legacy Hub gateway
localhost-only assumptions
old callback URLs

Do not change them in HUB-000.

Inventory only.

==================================================
PART 2 — ORIGIN / PORT / CALLBACK INVENTORY
==================================================

Inventory:

development ports
production origins
preview origins
Edge origin allowlists
CORS allowlists
OAuth redirect URIs
SSO callbacks
application launch URLs
Accounts callback URLs

For each value determine:

current
compatibility
stale
unknown

Provide evidence.

Do not remove :4321 or old routes yet.
That belongs to HUB-001.

==================================================
PART 3 — DATABASE TABLE OWNERSHIP INVENTORY
==================================================

Build a table-level ownership ledger.

Inspect:

Core migrations
Hub Supabase migrations
POS migrations
Play migrations
other app migrations
worker persistence
infrastructure database definitions

For every shared/control-plane table record:

table/schema

semantic domain

created by migration in repo(s)

current migration owner(s)

runtime writer(s)

runtime reader(s)

RLS enabled?

service-role access?

Core access?

app access?

direct browser access?

canonical source of truth?

transition status?

conflict?

At minimum trace concepts representing:

users / identities

sessions

organizations

businesses

stores

locations

memberships

store memberships

workforce

app assignments

roles

permissions

applications/apps

app subscriptions

entitlements

plans

billing/subscription projection

devices

feature flags

config

audit

outbox

events

analytics/control-plane projections

Do NOT mutate schemas.

==================================================
PART 4 — WRITER INVENTORY
==================================================

This is one of the most important deliverables.

For every shared table identify ALL write paths.

Examples:

Core API
Hub server
Supabase RPC
POS backend
Play backend
Admin
worker
billing webhook
migration/seed
browser

Identify:

INSERT
UPDATE
DELETE
RPC/function writes

A table with more than one domain authority must be flagged.

Classification:

SINGLE AUTHORITY

INTENTIONAL MULTI-WRITER

TRANSITIONAL MULTI-WRITER

UNSAFE MULTI-WRITER

UNKNOWN

Do not call something unsafe without evidence.

==================================================
PART 5 — DOMAIN SEMANTICS GATE
==================================================

Do NOT introduce a new Organization → Business → Location schema yet.

First document what the current terms mean.

For each actual concept:

Organization
Workspace
Business
Brand
Store
Branch
Location
Venue

answer:

Does it currently exist?

Table/type name?

What does it represent?

Logical business?

Physical site?

Billing scope?

Authorization scope?

App scope?

Can one organization contain many?

Can one parent entity contain many stores?

Does a store have a physical address?

Do POS and Play use the same Store ID?

Can the same physical site be represented twice?

Is "store" currently effectively a location?

Determine whether the future model should:

KEEP STORE AS LOCATION

RENAME STORE TO LOCATION

INTRODUCE BUSINESS ABOVE STORE

MAP BUSINESS FROM AN EXISTING ENTITY

or

REQUIRE PRODUCT DECISION

Do NOT perform a rename or schema migration.

==================================================
PART 6 — IDENTITY AND SESSION AUTHORITY
==================================================

Build the actual identity/session matrix.

Applications:

HUB
ADMIN
GO
POS
PLAY
others found in the registry

For each determine:

login entry
identity provider
Accounts involvement
Core involvement
cookie/session name
session storage
app code/audience
lifetime
refresh
revocation
SSO exchange
logout
cross-app isolation

Verify whether:

Accounts proves identity

Core issues/evaluates app-scoped sessions

or whether actual code differs.

Record discrepancies.

==================================================
PART 7 — AUTHORIZATION MATRIX
==================================================

Document the current authorization decision chain.

For protected Hub/App actions determine where these are evaluated:

identity valid

application session valid

organization membership

owner/manager role

store/location access

app assignment

app entitlement

application-specific role

domain permission

RLS

Important:

Do not conflate:

ENTITLEMENT

with

USER PERMISSION.

Explicitly model the current difference.

Find every shortcut/bypass.

The audit identified an entitlement path that may return:

allowed = true

under development behavior.

Locate the exact implementation.

Record:

file
symbol
environment condition
callers
production reachability
test coverage

Do NOT fix it in HUB-000.

HUB-002 owns the behavior change.

==================================================
PART 8 — APP REGISTRY CURRENT STATE
==================================================

Find every representation of first-party applications.

Search for:

apps
applications
products
modules
capabilities
catalog
app codes
POS
PLAY
GO
HUB
ADMIN
KIOSK

Determine whether app metadata exists in:

database
Core constants
Hub frontend constants
Admin
contracts
environment variables
infrastructure
POS/Play
feature flags

Create one cross-reference:

App Code
Display Name
Registry Source
Launch URL Source
SSO Audience Source
Entitlement Source
Location Enablement Source
UI Hard-code Locations

Do not implement the manifest yet.

==================================================
PART 9 — NEW APP CHANGE-SURFACE INVENTORY
==================================================

Answer this concrete question:

"If we add Aevo Inventory tomorrow, what code/config/schema currently must
change?"

Trace all changes currently required.

Possible categories:

Core

Hub

Accounts

Edge

Contracts

Admin

Infrastructure

database

billing

navigation

dashboard

launch URL

permissions

SSO

location assignment

worker

analytics

For every change identify whether it is:

fundamentally necessary

or

an artifact of hard-coding.

This output will define HUB-007.

==================================================
PART 10 — ENTITLEMENT / INSTALLATION / LOCATION BINDING
==================================================

Document what currently represents:

organization is allowed to use app

organization installed app

store/location has app enabled

user assigned to app

user assigned to store

subscription permits app

Do not assume these are different existing tables.

Map the real implementation.

Explicitly highlight where one field/table currently carries multiple meanings.

Do not create AppInstallation or AppLocationBinding yet.

==================================================
PART 11 — SETTINGS OWNERSHIP
==================================================

Inventory current configuration/settings.

Classify real settings into:

PLATFORM

ORGANIZATION

STORE/LOCATION

APP

DEVICE

For each record:

owner
storage
writer
reader
API
scope
inheritance if any

Specifically identify POS settings currently displayed/edited in Hub.

Specifically identify Play settings currently displayed/edited in Hub.

Recommend, documentation-only, whether each setting should remain:

Core/Hub owned

or

app owned

No migration yet.

==================================================
PART 12 — DEVICE OWNERSHIP
==================================================

Inventory device/terminal concepts.

Determine:

device identity owner

pairing owner

organization binding

store binding

app binding

credential owner

revocation owner

device health owner

POS-specific configuration owner

Kiosk-specific configuration owner

Separate:

shared device identity

from

application-specific device behavior.

==================================================
PART 13 — BILLING PATH
==================================================

Inventory the actual billing path.

Document:

provider

webhook receiver

signature verification

event idempotency

subscription storage

plan mapping

entitlement calculation

trial

cancellation

downgrade

grace state

Hub/API readers

Admin writers

Locate all paths where UI or development configuration can grant app access.

No billing changes in this batch.

==================================================
PART 14 — EDGE TRUST BOUNDARY
==================================================

Inspect Edge again.

For every Hub/Core route determine:

Edge authentication?
Edge request signing?
Core authentication?
Core authorization?
tenant header?
organization header?
store header?
request ID?
CORS?
origin?

Edge should not accidentally become the organization authorization authority.

Record actual behavior, not intended behavior.

==================================================
PART 15 — CONTRACT COVERAGE
==================================================

Compare:

actual Core routes

against

OpenAPI

aevo-contracts

Hub API client

Admin API client

other app clients where relevant

Generate:

implemented route count

documented route count

typed-client coverage

routes missing from contract

contract routes missing from runtime

Do not update contracts in HUB-000 except tooling required to generate/report
the comparison.

HUB-006 owns contract synchronization.

==================================================
PART 16 — WORKER / EVENT / TASK INVENTORY
==================================================

Inventory:

Pub/Sub topics

subscriptions

DLQs

Cloud Tasks

cron/scheduler

Core outbox

workers

event endpoints

probe endpoints

For each determine:

producer exists?

consumer exists?

enabled?

deployed?

dead code?

planned only?

Do not activate disabled consumers.

HUB-014 owns worker/event implementation.

==================================================
PART 17 — INFRASTRUCTURE USAGE
==================================================

For every major backend infrastructure component document the actual consumer.

Include when present:

Cloudflare Worker

Cloud Run

Cloud SQL/PostgreSQL

Supabase

Pub/Sub

Cloud Tasks

R2

Secret Manager

IAM/service accounts

observability

For each classify:

ACTIVE_REQUIRED

ACTIVE_TRANSITIONAL

PROVISIONED_NOT_USED

PLANNED

UNKNOWN

Do not remove resources.

==================================================
PART 18 — REDUNDANCY LEDGER
==================================================

Produce an explicit redundancy table.

Potential categories:

multiple gateways

multiple migration authorities

multiple config stores

multiple app catalogs

multiple organization/store writers

multiple entitlement stores

multiple auth authorities

duplicate analytics systems

dead routes

dead ports

unused worker infrastructure

compatibility RPCs

For each include:

evidence

current consumer

replacement candidate

risk

recommended lifecycle

Classification:

KEEP

KEEP BUT NARROW

CONSOLIDATE

DEPRECATE AFTER MIGRATION

REMOVE ONLY AFTER EVIDENCE

INVESTIGATE

No deletion in HUB-000.

==================================================
MACHINE-READABLE OUTPUT
==================================================

In addition to Markdown documentation, create machine-readable inventories.

Prefer a directory such as:

docs/hub-system/inventory/

with files such as:

repositories.json

routes.json

origins.json

tables.json

writers.json

sessions.json

applications.json

contracts.json

events.json

infrastructure.json

redundancy.json

Use JSON unless the existing project convention strongly favors another format.

Every inventory should contain a schema/version field.

Example:

{
"inventoryVersion": 1,
"generatedAt": "...",
"entries": [...]
}

Do NOT include secrets.

These inventories will later be usable by CI drift checks.

==================================================
OWNERSHIP LEDGER
==================================================

Create or update:

docs/hub-system/ownership-ledger.md

It must include:

Repository Ownership

API Ownership

Data Ownership

Migration Ownership

Identity Ownership

Session Ownership

Authorization Ownership

App Registry Ownership

Billing/Entitlement Ownership

Device Ownership

Audit Ownership

Worker/Event Ownership

For every row distinguish:

CURRENT

TARGET

TRANSITION

==================================================
DECISION LOG
==================================================

Create:

docs/hub-system/HUB-000-decisions.md

Record decisions that can safely be made from evidence.

Do NOT pretend unresolved product/domain decisions are resolved.

Especially flag:

Organization / Business / Store / Location semantics

canonical migration authority per existing table

billing source of truth if not evidenced

app-registry canonical record

workforce model

settings ownership

Use:

DECIDED

PROVISIONAL

BLOCKED

NEEDS PRODUCT DECISION

NEEDS SECURITY DECISION

NEEDS DATA/MIGRATION DECISION

==================================================
ARCHITECTURE DRIFT GUARD
==================================================

Add only lightweight non-invasive validation if suitable.

Examples:

script that detects stale forbidden runtime references

script that checks duplicate migration ownership registry

script that compares Core route inventory with contract inventory

But:

do NOT make broad CI-breaking changes if the repository does not currently
have stable baselines.

It is acceptable in HUB-000 to create the script in report-only mode.

Do NOT start HUB-001 cleanup.

==================================================
HUB-005 SAFETY REQUIREMENT
==================================================

Prepare HUB-005 for later work, but do not execute it.

Explicitly revise/document that migration-authority convergence MUST be:

table-by-table

expand-first

backfill/reconcile

switch writer

observe

make old writer read-only

remove later

HUB-005 MUST NOT be implemented as a big-bang shared-schema rewrite.

==================================================
APP MANIFEST SAFETY REQUIREMENT
==================================================

Prepare HUB-007 boundaries.

The future App Manifest should default to declarative metadata.

HUB-000 should document that the initial registry must NOT permit arbitrary
remote executable code inside Hub.

Potential future declarative contributions may include:

display metadata

launch metadata

supported scopes

permissions

quick actions

dashboard metric descriptors

settings schema references

analytics links

health/compatibility metadata

But HUB-000 must not implement these.

==================================================
TESTS FOR THIS BATCH
==================================================

Because this is mostly an evidence/inventory batch, required tests are:

repository inventory self-check

route inventory self-check

table inventory self-check

writer inventory self-check

no-secret scan

JSON schema/parse checks for machine-readable inventories

broken-file/reference check for generated documentation

git diff --check in every touched repository

existing builds/tests only if executable code/tooling is changed

Do not claim tenant isolation is verified in HUB-000.

That belongs to HUB-004.

==================================================
ALLOWED CHANGES
==================================================

Allowed:

documentation

inventory files

read-only inspection scripts

report-only drift scripts

small test helpers for inventory validation

phase notes

implementation plan corrections where audit evidence proves them wrong

Not allowed:

production database migrations

production data changes

route removal

origin removal

entitlement behavior changes

authorization changes

RLS changes

new App Registry tables

new Installation tables

new Location Binding tables

billing changes

new worker consumer

UI redesign

new plugin system

schema rename

Store → Location migration

==================================================
PHASE NOTE
==================================================

Create or update:

docs/hub-system/phase-notes.md

Add:

## BATCH-HUB-000 — Baseline and ownership ledger

Record:

Status

Date/operator

Prompt

Repositories inspected

Repositories changed

Pre-existing dirty/untracked work

Route inventory result

Origin/port inventory result

Data ownership result

Migration-owner result

Shared-table writers

Identity/session result

Authorization result

App registry result

Billing result

Worker/event result

Infrastructure result

Redundancy result

Contract coverage

Machine-readable inventory paths

Security observations

Open blockers

Files changed

Commands/tests executed

Next gate

==================================================
STATUS RULES
==================================================

VERIFIED

only if:

the required inventories are complete enough that every known shared
control-plane table, route, session boundary, app registry representation,
and migration owner has an accountable classification.

VERIFIED WITH FOLLOW-UP

if only clearly identified non-blocking external environment evidence is
missing.

BLOCKED

if:

migration ownership cannot be determined

identity/session authority materially conflicts between implementations

a shared table has unknown writers

an unknown active gateway/API is discovered

or the inventories are incomplete enough that starting irreversible migration
would require guessing.

==================================================
FINAL RESPONSE
==================================================

At completion provide:

1. HUB-000 status

2. Repository ownership summary

3. Number of canonical/transitional/legacy backend components found

4. Route ownership conflicts

5. Shared-table writer conflicts

6. Migration ownership conflicts

7. Identity/session authority result

8. Organization/Store/Location semantic result

9. App Registry current-state result

10. Entitlement/permission result

11. Billing source result

12. Infrastructure actually used versus provisioned-only

13. Redundant components found

14. Open decisions blocking later phases

15. Exact tasks now unblocked

16. Exact tasks still blocked

17. Recommended next batch

Then STOP.

Do NOT start HUB-001, HUB-002, HUB-004, HUB-005, HUB-006,
or any other implementation task in the same invocation.
