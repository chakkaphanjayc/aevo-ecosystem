# Community Place submissions and edits

Status: typed submission contract and static/live validation implemented; no
user write path or approval command authorized

## Purpose

Community data should improve coverage and freshness without allowing
untrusted clients to mutate canonical Places. The system should accept
structured, reviewable proposals and publish only approved revisions.

The existing TraceDee community and moderation migrations provide useful
concepts such as moderation status, reports, audit records, and content
contributions. They should be reused where compatible, but TraceDee's
place-like table must not silently become the universal Place authority.

## Submission types

1. New Place candidate.
2. Correction to an existing Place.
3. Duplicate/merge suggestion.
4. Closure or moved-place report.
5. Category/name/address correction.
6. Unsafe or inappropriate content report.
7. Business relationship/claim request.
8. Capability/booking link issue.

Each type has a different evidence and moderation policy. A generic “edit
anything” payload is too permissive.

## Submission lifecycle

~~~text
DRAFT (client only)
  -> SUBMITTED
  -> TRIAGED
  -> NEEDS_INFO
  -> APPROVED / PARTIALLY_APPROVED
  -> REJECTED / DUPLICATE / WITHDRAWN
  -> APPEALED
~~~

The canonical Place changes only when a trusted command handler applies an
approved decision and creates a revision.

## Submission payload

The server should store:

- submission ID;
- app-scoped actor ID;
- target Place ID, or null for a new candidate;
- typed proposed fields/diff;
- source/evidence references;
- optional duplicate candidates;
- client locale and app version;
- creation and resolution timestamps;
- moderation state and reason;
- reviewer/audit information;
- abuse/risk flags;
- revision applied, if any.

Do not store arbitrary client JSON as the only source of truth. Validate
field names, types, lengths, coordinates, category IDs, URLs, and media
references server-side.

## UX flow

Customer flow:

1. start from a Place detail or map action;
2. choose a specific correction type;
3. show the current value and proposed value;
4. optionally add evidence or explanation;
5. show privacy/attribution expectations;
6. submit and receive a submission ID/status;
7. show pending state without pretending the change is live;
8. notify when approved/rejected where product policy allows.

New Place flow should ask for enough information to prevent duplicates:

- name and category;
- approximate/public point;
- area/address;
- alternate language name;
- source or evidence;
- whether the place is a business, venue, landmark, or other type.

The UI should offer likely existing Places before accepting a new candidate.

## Moderation policy

Automatic checks may:

- reject invalid coordinates or malicious URLs;
- detect spam/repeated submissions;
- find likely duplicates;
- flag sensitive/private locations;
- detect forbidden content/media;
- rate-limit abusive actors.

Automatic checks may not:

- approve a disputed merge solely by name/distance;
- mark a business verified;
- overwrite verified fields;
- disclose private reviewer evidence;
- bypass the audit trail.

## Duplicate handling

If a candidate resembles an existing Place:

- attach candidate IDs and matching evidence;
- let the reviewer choose duplicate, separate, or merge review;
- do not hide the submission as “successful” until the decision;
- preserve the submitter's attribution/history;
- use the canonical merge redirect if approved.

## Abuse, privacy, and safety

- apply per-user, per-IP/device, and risk-based rate limits;
- use app-scoped sessions and CSRF for writes;
- moderate addresses that could expose private residences;
- do not accept a precise home location as a public Place without policy;
- sanitize HTML/URLs/media metadata;
- keep reporter identity private from the reported party when required;
- support withdrawal and takedown;
- retain only evidence necessary for the decision;
- audit moderator access to private evidence.

## Admin review queue

The queue should support:

- filters by type, status, source, area, age, risk, and assigned reviewer;
- duplicate candidate preview;
- before/after diff;
- source/claim/verification context;
- moderation history and prior decisions;
- bulk triage only for low-risk classifications;
- explicit publish/reject/merge/needs-info actions;
- reason and ticket fields;
- audit and rollback links.

The query behavior should use an allowlisted typed query contract, not raw SQL
from the browser. Tenant and platform scopes must be derived from the
authenticated Admin context.

## Rejected and withdrawn submissions

Rejection should be explainable internally, but public explanation should be
bounded to avoid abuse signals or private evidence disclosure. A withdrawn
submission remains auditable and can be excluded from future duplicate
scoring only under a documented policy.

## Migration/compatibility

Existing TraceDee contributions and reports can map to this workflow where
they target a place-like record. Preserve the old entity ID and moderation
history during any mapping. Do not make existing client demo actions appear
to submit a canonical Place before the server command exists.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

Community submissions and business claims are parallel tracks after the
canonical Place contracts and public API foundations are stable. Community
editing must not be unnecessarily blocked by business verification, and
business linking must not imply community approval.

The dependency rule is:

~~~text
MAP-001 + MAP-003
       -> business links/claims
       -> community submissions/edits
~~~

Both tracks converge on the same canonical revision, provenance, moderation,
and audit boundaries. A submission can propose a Place polygon or parent/child
relation in the future, but V1 should accept only the approved public geometry
types and must not expose indoor mapping.
