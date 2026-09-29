# Aevo Go and Admin discovery UI change plan

Audit date: 2026-09-26
Status: screen-level plan only; no UI code was changed in this audit

## Experience principle

The UI should make the discovery decision visible:

```text
What are you looking for?
  -> where / what / when / mood / availability
  -> recommended Place or Trace
  -> why it fits
  -> evidence and trust
  -> map / plan / book / start Trace
```

Contribution remains available, but it appears where its context is clear:
Place detail, Trace detail, completed Journey, activity/profile, or a dedicated
Contribute action. The main Explore surface should not imply that publishing a
generic Post is the product’s primary action.

## Current screen map

| Screen/surface | Actual local component | Current role |
| --- | --- | --- |
| Explore route | `aevo-go/src/pages.tsx` -> `features/discovery/explore-page.tsx` | master/detail discovery page |
| top plan card | `ExploreBookingPortal` | area/date/party/category/query and booking entry |
| central feed | `DiscoveryCard` rendered by `ExplorePage` | For You/Following/Nearby list; authenticated hide/unhide, reason selection, and private history read panel |
| composer | `DiscoveryComposer` | demo-only Post/Trace creation path |
| context sidebar | `ExploreContextSidebar` | area, vibe, shortcuts |
| insight sidebar | `ExploreInsightsSidebar` | map preview, bookable places, Trending Tracers, Community Pulse |
| map | `features/map/map-page.tsx` | Places/Traces with filters and map viewport |
| Trace detail | `ExploreTraceDetail` plus TraceDee detail page | route detail and community |
| post detail | `PostInlineDetail` | demo/client Post detail |
| booking | `public-api.ts`, `pages.tsx`, booking routes | availability, hold, confirm, order/tracking |
| Admin Feed | `aevo-admin/.../go-feed.tsx` | typed Feed config lifecycle |
| Admin moderation | `go-feed-moderation.tsx` | queue, evidence, action boundary |

## Screen-level change plan

### 1. Top intent surface

Current: `ExploreBookingPortal` leads with “ค้นหาแล้วจองได้ในที่เดียว” and
booking-oriented fields.

Target:

- lead with “วันนี้อยากค้นพบอะไร?” / “What do you want to discover today?”;
- preserve URL-owned query, area, category, date, party, and availability
  controls;
- add canonical Vibe/intent facets only after the server contract supports
  them;
- make “near me” and selected destination visibly different;
- offer an explicit “save this preference” action rather than silently writing
  profile taste;
- retain a clear Plan/Book action but never show an availability claim that did
  not come from the canonical booking service;
- on mobile, collapse low-priority facets behind a keyboard-accessible filter
  sheet, keeping search and current area prominent.

States:

- anonymous: intent and local discovery work without onboarding; entity hide/unhide stays mounted-session-local and never creates a durable preference;
- authenticated/no profile: intent + session + quality/diversity;
- personalized: show a safe reason only when evidence/confidence threshold is
  met;
- offline/gateway unavailable: show last-known-safe discovery/demo notice per
  existing explicit mode, never fabricate availability;
- no results: suggest relaxing one filter at a time and offer Trace Map.

### 2. Central Feed

Current: one mixed-looking list with three tabs; live Core items are TRACE/PLACE
but demo can show POST/TRACER.

Target:

- central For You renders only discovery entities in the first production
  direction: Place and Trace cards;
- cards contain concise evidence: rating/confidence, selected useful review,
  completion/save signal, creator provenance, or booking state only when safe;
- actions prioritize `Open`, `Save`, `Map/Directions`, `Start Trace`, and
  `Book`; remove social action prominence from the discovery card;
- “Following” is retained as a secondary source view for followed Tracers/
  Traces, not the primary product promise;
- “Nearby” uses current map/area context and does not imply a permanent taste;
- module/shelf headers explain intent (`Near Ari`, `Because you saved …`,
  `Bookable now`) rather than generic engagement labels;
- no standalone review/photo/comment/creator card in For You V1;
- show one bounded evidence highlight instead of a comment thread in a card.

Card contracts should continue to use discriminated item types and tracking
tokens. They should never rely on client-generated ranking or private feature
fields.

### 3. Recommendation reasons

Replace generic or follower-centric language with safe localized reasons:

- `BECAUSE_VIBE` — “เพราะคุณเลือก Quiet Space”;
- `BECAUSE_CATEGORY` — “ตรงกับ Japanese”;
- `NEAR_SELECTED_AREA` — “ใน Ari ที่คุณเลือก”;
- `SIMILAR_TO_SAVED` — “คล้ายสิ่งที่คุณบันทึกไว้”;
- `POPULAR_IN_AREA` — “คนในย่านนี้บันทึกไว้บ่อย” only if popularity is
  confidence/anti-abuse checked;
- `AVAILABLE_NOW` — “มีเวลาว่างตามระบบจอง” only from fresh canonical data;
- `BASED_ON_COMPLETED_TRACE` — “ต่อจาก Trace ที่คุณทำจบ”;
- `COMMUNITY_CONFIDENCE` — “มีประสบการณ์จากผู้ไปจริง” only when verification
  and privacy policy allow it.

Never show raw score, exact distance/location, private taste vector, report/
moderation state, or “trending because everyone clicked”.

### 4. Discovery Context and Vibe & Mood

Current sidebar controls already express useful explicit intent. Change their
semantic contract:

- area and vibe changes update the URL/request and invalidate the relevant
  Feed session/cursor;
- selected values are not durable profile writes unless the user chooses Save;
- canonical taxonomy keys replace free-form UI-only terms over time;
- current intent takes precedence over long-term profile in both UI copy and
  server scoring;
- show clear selected/clear states and preserve keyboard/44px/reduced-motion
  accessibility contracts from the existing UX system.

### 5. Right sidebar

Current order: map preview, bookable Places, Trending Tracers, Community Pulse.

Target priority:

1. `Near your selected area` or map context;
2. `Available to book` when canonical availability is healthy;
3. `Because you saved …` or `Continue your Trace`;
4. `Community evidence` summary with confidence;
5. creator provenance only where it helps evaluate a Trace.

`Trending Tracers` should be replaced or relabeled as a secondary
`Local contributors`/`Trace authors` module. Follow remains available, but the
visual hierarchy should not optimize creator follower growth.

### 6. Trace Map

Keep the current Places/Traces map, URL-owned filters, map viewport commit, and
explicit stale-results state. Add the following contract later:

- map viewport is request/session intent, not a durable exact-location profile;
- map open, viewport commit, Place open, and directions are distinct events;
- a Feed card opened from the map preserves the same canonical entity and
  tracking token when possible;
- map results and Feed modules use the same public Gateway/Core authority;
- a map dependency failure degrades the map, not the basic Feed.

### 7. Booking surface

Keep the current live/demonstration distinction and server-authoritative
availability -> hold -> confirm -> order/tracking flow. The Feed integration
must:

- use a bounded availability feature/module projection;
- never call availability once per card in the Feed request;
- never show demo availability as real;
- preserve idempotency and server-side price/slot confirmation;
- fall back to a Place/Trace card without a booking CTA when availability is
  stale/unavailable;
- send booking outcome events asynchronously after canonical confirmation.

### 8. Contribution entry points

Target entry points:

| Context | Contribution action |
| --- | --- |
| Place detail | Rate/review, add approved photo, useful tip, report, suggest correction, place question |
| Trace detail | Rate/review after experience, field note, bounded comment/reply, report |
| completed Journey | “Share what helped” with Trace/stop context |
| Activity/Profile | edit/delete own contribution, status/appeal where approved |
| Explore | “Contribute” link that asks the user to select a Place/Trace first |

Do not delete the current composer in this audit. During migration, keep it
behind explicit demo/test mode and preserve any live API that already requires
a journey and target. Change wording and entry-point priority only in a later
approved UI batch.

### 9. Review and evidence display

Feed cards show at most one concise highlight plus aggregate confidence. Detail
surfaces carry full review list, photos, helpful/report actions, business
response (if canonical), Q&A, and comments. The UI must distinguish:

- submitted/under review;
- approved/public;
- limited/hidden from public;
- deleted by owner;
- removed/rejected with private reason only in the owner/admin surface.

No moderation state or private evidence leaks into public reason copy.

### 10. Loading, empty, cold-start, and degraded states

Use explicit states already present in the Go client and extend them by
meaning:

- loading: skeleton cards with “กำลังหา Place และ Trace ที่เหมาะกับคุณ”;
- empty intent: suggest fewer filters, map, or a broad local module;
- cold start: selected area/category/vibe + local quality + diversity, no
  onboarding wall;
- profile unavailable: intent/session/local quality, no false taste copy;
- evidence unavailable: Place/Trace card without evidence and no fabricated
  rating;
- availability unavailable: remove bookable module/CTA, keep discovery;
- moderation/eligibility stale: omit affected UGC, retain safe canonical
  entities;
- network/offline: existing explicit demo/offline state, never fake public
  status or booking success.

## Admin control-plane plan

All additions belong in `aevo-admin` through the existing Core BFF and typed
config lifecycle. Do not add a second new Feed control surface to
`aevo-hub/apps/admin`.

### Personalization

- mode: OFF/SHADOW/LIVE;
- active profile/calibration version;
- minimum evidence/confidence;
- decay policy version;
- explicit-intent precedence;
- geo influence bounds;
- cold-start policy;
- safe reason-code enablement.

### Candidate Sources

- Place: nearby, intent, taste, saved-related, new, evidence, bookable;
- Trace: nearby, intent, taste, saved-related, new, completed-related,
  evidence;
- per-source budget, timeout, quality/evidence floor, degraded status;
- source enable/disable and rollback;
- no Post/ViralPost/TrendingCreator source toggle as a V1 discovery source.

### Ranking and calibration

- typed bounded feature weights;
- TRACE and PLACE calibration version/health;
- freshness/novelty bounds;
- negative-feedback policy;
- public reason mapping version;
- evaluation cohort/shadow comparison ID.

### Modules

- module order and enablement;
- fill minimum/maximum;
- module-specific source mix and quotas;
- `BOOKABLE_NOW` dependency health;
- empty/merge fallback;
- experiment/canary percentage;
- no arbitrary module SQL or code expressions.

### Diversity and exploration

- same entity/seen suppression;
- category, area, business group, Trace lineage caps;
- Place/Trace mix;
- exploration quota and freshness floor;
- source domination alerts;
- deterministic tie-break/seed version.

### Community Evidence

- evidence confidence/quality floor;
- verified-experience policy version;
- selected-highlight limits;
- freshness bounds;
- anomaly/suppression mode;
- public evidence field allowlist.

### Safety

- UGC policy version and emergency suppression;
- moderation eligibility freshness/stale bound;
- text/image pipeline health;
- media public-variant kill switch;
- place/category/region posting mode;
- appeals/reinstatement policy version;
- content.moderate permission and audit links.

High-impact config and safety changes retain reason, CSRF, idempotency,
expected-active-version, audit, and accessible hold-to-confirm controls.

## UI/Admin acceptance checks for a later batch

- For You live response cannot render POST/TRACER as a discovery candidate;
- demo-only Post/Trace mode is visibly labeled and cannot imply live publish;
- explicit query/area/vibe overrides a conflicting historical taste;
- each card’s primary action is discovery progression, not social engagement;
- creator identity is provenance, not a ranking headline;
- booking state is canonical and degraded safely;
- community evidence is bounded and private moderation fields never render;
- anonymous/cold-start paths are useful without a profile;
- browser has no Supabase service credential or direct ranking/config access;
- Web/PWA/Capacitor interactions preserve the same URL and event semantics;
- Admin denied/offline/rollback states are explicit and non-fabricating.
