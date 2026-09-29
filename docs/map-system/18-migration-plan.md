# Map and Place migration plan

Status: accepted phased sequence; implementation is in progress with external
deployment and data gates preserved

## Migration principles

- no big-bang rewrite;
- no new migration until data/migration ownership is approved;
- preserve existing Store, TraceDee, booking, Feed, and user history;
- introduce stable canonical IDs before changing consumer references;
- use adapters/read projections before destructive normalization;
- dual-read or compatibility resolution before cutover;
- every phase has an acceptance gate and rollback;
- no external source becomes authoritative by default.

## Phase sequence

### MAP-000 — ownership and route decision

Resolve the canonical data owner, migration owner, public route owner, and
transition status of Hub/TraceDee schemas. Output is an accepted decision
record, not code.

Gate: named owners, route matrix, source of truth, security sign-off,
rollback policy.

### MAP-001 — canonical Place contract

Publish versioned geometry-safe PlaceSummary, PlaceDetail, Map overlay,
Search/Nearby, capability, source/provenance, redirect, address, and error
vocabulary. Define legacy ID namespaces, field-level authority, and
Thailand-first localized address semantics.

Gate: aevo-contracts/Core/Go compatibility fixtures pass.

### MAP-002 — compatibility mapping and read projection

Map existing customer_store_profiles and tracedee_places to canonical Place
candidates without deleting source rows. Build a read projection/adapter only
after MAP-000 permits the schema owner to do so.

Gate: every mapped reference has provenance and unresolved records are visible.

### MAP-003 — separate bounded Place read paths

Expose the approved Core/Edge public boundary for a lightweight Map overlay,
ranked Search/Nearby, Detail, and separately fetched capability/live state.
Reuse PostGIS; use stable keyset cursor for ranked paths and public field
allowlists.

Gate: route implementation is real and deployed in the target topology; no
client direct Supabase/Overpass dependency is required for canonical data.

### MAP-004 — basemap and geocoder abstraction

Keep MapLibre, formalize provider/style/attribution/fallback configuration,
add a forward/reverse geocoder boundary with temporary results, and connect
the canonical Place overlay. Preserve list fallback and URL state.

Gate: provider/license/attribution and WebGL/error/accessibility tests pass.

### MAP-005 — external ingestion and source links

Add governed adapters, raw snapshot/import run, provenance, license, retry,
disappearance, review, and rollback flow. Start with one approved source.

Gate: replayable dry-run and source rollback are demonstrated.

### MAP-006 — Business/Branch/Venue to Place links

Link existing Store/Branch/Venue domains to canonical Places through explicit
relationships and compact capability projections. Do not replace business IDs.

Gate: business permission/RLS/capability freshness and booking deep-link tests
pass.

### MAP-007 — claims and verification

Add authenticated business claims, evidence review, field-level verification,
conflict/revocation/expiry, and public badge projection.

This track can progress in parallel with MAP-008 after MAP-001 and MAP-003;
business verification is not a prerequisite for community submissions.

Gate: competing claim and verified-field protection tests pass.

### MAP-008 — community submissions and edits

Add typed submission/edit/report commands, duplicate suggestions, moderation
states, appeals, and approved revision application.

This track can progress in parallel with MAP-007 after the canonical contract,
public API, security, moderation, provenance, and revision boundaries exist.

Gate: users cannot mutate canonical Place directly and all approvals audit.

### MAP-009 — aevo-admin control plane

Start with a read-only registry/review shell as soon as stable Admin contracts
and permission metadata exist. Add standalone Admin BFF routes and privileged
mutation screens only as the corresponding Core commands become available.

Gate: Core API permission/audit/idempotency contract is used; no direct
Supabase/browser writes.

### MAP-010 — conflation and merge redirects

Calibrate multilingual matching, human review, merge/split, redirect
resolution, downstream reference preservation, and rollback.

Gate: labelled corpus and Feed/Trace/Save/booking merge tests pass.

### MAP-011 — caching/clustering/vector-tile scale path

Tune public projection, Edge/cache invalidation, client clustering, and only
then add vector tiles if measured payload/latency requires them.

Gate: load targets and attribution/cache invalidation evidence pass.

### MAP-012 — production rollout and operations

Use feature flags, staged geography, shadow reads, dashboards, alerts,
rollback, and ownership handoff. Retire compatibility paths only after
measured cutover.

Gate: operational readiness, security, license, data integrity, and support
sign-off.

## Dependency graph

~~~text
MAP-000
  -> MAP-001 -> MAP-002 -> MAP-003 -> MAP-004
                         |       |       |
                         |       |       +-> MAP-005
                         |       +---------> MAP-006 -> MAP-007
                         +------------------> MAP-008
                         +------------------> MAP-009 read-only
MAP-005 + MAP-006 + MAP-007 + MAP-008 -> MAP-009 privileged mutations
MAP-002 + MAP-005 + MAP-009 -> MAP-010
MAP-003 + MAP-004 + MAP-010 -> MAP-011 -> MAP-012
~~~

MAP-005 may begin source/legal preparation after MAP-000, but it must not
publish canonical data before the canonical contract and projection/conflation
policy are accepted. MAP-008 is not blocked by MAP-007. MAP-009 read-only
work can begin before privileged mutation commands.

## Rollout and rollback strategy

For each phase:

1. read-only/shadow behavior;
2. fixture and integration verification;
3. feature-flagged limited geography;
4. dual-read comparison against current behavior;
5. staged write/publication enablement;
6. monitor freshness/errors/audit;
7. expand only after gate acceptance.

Rollback means disabling the new read/write path, returning to the last
known-valid projection/adapter, and preserving new records for replay. It does
not mean destructive deletion or resetting a shared database.

## ARCHITECTURE REVIEW REVISION (2026-09-24)

### Revised dependency graph

The final review permits business and community work to progress in parallel:

~~~text
MAP-000
  -> MAP-001
     -> MAP-002
        -> MAP-003
           -> MAP-004
           -> MAP-005
           -> MAP-006 -> MAP-007
           -> MAP-008
        -> MAP-009 read-only shell
MAP-005 + MAP-006 + MAP-007 + MAP-008
  -> MAP-009 privileged mutations
MAP-002 + MAP-005 + MAP-009 -> MAP-010
MAP-003 + MAP-004 + MAP-010 -> MAP-011 -> MAP-012
~~~

MAP-008 is not blocked by MAP-007; both require the canonical contracts,
public API foundations, moderation/security rules, and revision/provenance
boundary. MAP-009 can start as a read-only registry/review shell when Admin
contracts exist, while mutation controls wait for the corresponding backend
commands.

### Revised phase requirements

- MAP-001 defines point-capable but polygon-safe geometry, Thailand-first
  address semantics, field provenance, capability freshness, and resolver
  contracts.
- MAP-003 implements separate conceptual Map overlay, Search/Nearby, and
  Detail paths, with exact route names reconciled to Core conventions.
- MAP-004 adds provider-neutral basemap and geocoder boundaries.
- MAP-006/007/008 can be developed as parallel business/community tracks after
  MAP-001 and MAP-003.
- MAP-010 must implement redirect-first merge/split semantics before
  distributed reference compaction.
