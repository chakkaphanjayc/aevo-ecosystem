# Business verification and Place claims

Status: typed claim/evidence contract and fail-closed validation implemented;
no claim or verification write path authorized

## Current business foundation

The current domain has:

- organizations, brands, stores, memberships, and store assignments in the
  foundation migration;
- an opt-in customer_store_profiles public projection;
- venues, bookable resources, operating hours, and bookings in the booking
  migration;
- separate Play venue/court structures in aevo-play;
- store/queue/catalog structures in aevo-pos.

The inspected schemas do not provide one canonical Place link or a claim and
verification lifecycle. Public Store metadata is therefore not evidence that
the organization owns or operates the corresponding real-world Place.

## Separate concepts

### Business identity

The organization/brand/store/branch that operates a service. Its identity and
permissions come from the existing business domain.

### Place

The physical/public location. It can exist without a verified business link.

### Claim

An assertion by an authorized organization or representative that a
Business/Branch operates at a Place. A claim is reviewable and can be
withdrawn.

### Verification

An Admin decision about a claim and selected fields. Verification is scoped:

- organization-to-Place relationship;
- branch/store-to-Place relationship;
- selected business fields;
- address/phone/website evidence;
- booking capability relationship.

Verification must not mean that every external or user field is endorsed.

## Proposed claim lifecycle

~~~text
NOT_CLAIMED
  -> REQUESTED
  -> EVIDENCE_REQUIRED
  -> UNDER_REVIEW
  -> VERIFIED
  -> EXPIRED / REVOKED / REJECTED
~~~

Competing claims should enter an explicit conflict state rather than allowing
the latest request to win. A claim can be verified, but a later change of
ownership or closure should revoke/expire the relationship without deleting
the Place.

## Evidence policy

Evidence types may include:

- authenticated organization/store assignment;
- business registry or license document;
- domain-controlled email or website;
- official business page;
- venue/booking configuration owned by the organization;
- Admin contact workflow;
- customer report with corroborating evidence.

Evidence must have:

- type and source;
- submitted by and scope;
- collected/expiry time;
- private visibility;
- reviewer decision;
- retention/deletion policy.

Sensitive documents should not be placed in public Place payloads or browser
logs. The plan does not choose a storage provider for evidence until privacy
and retention requirements are approved.

## Field ownership

| Field | Default owner | External import behavior |
| --- | --- | --- |
| Place identity/merge | Canonical Place/Admin | Never overwritten automatically |
| Public display name | Canonical/verified business, depending on field | Propose only if verified/protected |
| Address/point | Place + business evidence | Source change becomes candidate revision |
| Business hours | Business/venue domain | Projection with freshness, not Place identity |
| Rating/review count | Rating/feed domain | Never imported from generic source into Aevo rating |
| Booking route/capability | Booking/venue domain | Read projection only |
| OSM/Overture names/tags | Source link | Remain source-specific |
| Community description | Moderated community field | Requires moderation/license policy |

Protected or verified fields need a lock/provenance marker so ingestion cannot
blindly overwrite them.

## Public result behavior

The public Place response may display:

- verified business label and scope;
- business display name;
- booking/capability badge;
- source/attribution hint;
- verification freshness or “verified by Aevo” explanation.

It must not imply:

- that Aevo guarantees the business is currently open;
- that all source data is verified;
- that availability is live if only a stale capability projection exists;
- that a claim grants ownership of user reviews or community content.

## Admin workflow

The long-term workflow belongs in aevo-admin and Core API:

1. inspect claim and Place candidates;
2. inspect organization/branch scope and permissions;
3. inspect evidence in a protected viewer;
4. detect competing claims;
5. approve selected scope, reject, request more evidence, or revoke;
6. record reason, reviewer, expiry, and audit diff;
7. refresh capability/public projections;
8. notify affected business/user surfaces where policy requires.

The transitional Hub admin can inform discovery but must not become a second
privileged authority after aevo-admin is connected.

## Security requirements

- require an app-scoped authenticated session for claim submission;
- derive organization/branch scope server-side;
- do not trust client-provided organization IDs;
- separate organization permissions from platform/Admin permissions;
- apply RLS/authorization to claim/evidence reads and writes;
- keep service-role/database credentials server-only;
- rate limit claim attempts and evidence uploads;
- audit approval, rejection, revocation, and conflict resolution;
- require CSRF and idempotency for browser mutations;
- avoid exposing private evidence in public error messages.

## Revocation and closure

Revocation is a first-class event. It should:

- mark the relationship unverified/revoked;
- remove verification badges from the public projection;
- retain history and reason;
- keep unrelated Place data available;
- refresh business capability flags;
- preserve bookings and historical Trace references;
- trigger an audit/notification path.

A Place closure and a business claim revocation are different events. One
does not automatically imply the other.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

### Cardinality and capability boundary

The verification model follows these semantics:

- one Place may contain multiple Businesses/Branches;
- one Business may operate many Branches;
- a Branch has one primary Place for public identity, with optional secondary
  typed location/service links;
- Venue remains a booking-domain identity and may link to one primary Place;
- BookableResource remains under Venue and never becomes a Place;
- Organization/Store IDs remain tenant/operational IDs.

Capability badges such as booking supported, queue supported, Play enabled,
and POS connected are cached projections with source and freshness. Live
availability, slot inventory, current queue, and estimated wait are fetched
from the owning service and are excluded from the map overlay and static tiles.

The claim flow may begin after MAP-001 and MAP-003 establish stable contracts;
it must not wait for all community-edit behavior. Verification decisions
remain protected by server-side organization scope, platform/Admin RBAC, and
field-level provenance.
