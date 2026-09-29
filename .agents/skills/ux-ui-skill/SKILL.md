---
name: b2b-workspace-ux-ui
description: Design, review, and implement Aevo Hub workspace interfaces and Aevo Go customer Web/Capacitor interfaces, including Aevo Go's Dark Flat + Optical Colorless Liquid Glass contract, accessible responsive states, and restrained tactile interactions.
metadata:
  short-description: Aevo Hub liquid glass + Aevo Go dark flat optical glass UX/UI system
---

# Workspace UX/UI (Tactile Liquid Glass & Micro-Interactions Edition)

Build calm, usable interfaces whose appearance and behavior form one cohesive design language. Replace stark flat outlines with multi-layered Gaussian blur, tactile liquid glass surfaces, and purposeful micro-interactions. Complete the requested feature including recovery paths while matching existing frameworks and product conventions; do not replace the stack or redesign unrelated pages.

## Workflow

1. **Inspect Architecture & Requirements:** Review target routes, component structure, tokens, dependencies, and state lifecycles. Identify the core user goal and primary action.
2. **Component & Micro-Interaction Research:**
   - Explore and evaluate subtle interaction patterns from `https://reactbits.dev/c/micro` (e.g., tactile button tilts, organic status indicators, micro-sheen transitions, fluid hover states, and smooth ripple/scale taps).
   - Select only lightweight micro-interactions that communicate state or reinforce the 3D liquid glass tactile depth without adding heavy runtime dependencies or visual clutter.
3. **Surface Foundations:** Establish or reuse centralized surface tokens;
   apply Gaussian blur, specular rims, and translucent fills only where the
   product-specific visual contract allows them.
4. **State & Ergonomics Design:** Define interaction states (hover, active, focus, disabled, pending), async recovery, mobile responsiveness, and keyboard accessibility prior to code implementation.
5. **Implementation:** Build shared primitives and feature logic together, keeping business logic strictly decoupled from visual presentation.
6. **Verification & Audit:** Verify dynamic rendering, contrast (WCAG AA), responsive breakpoints, and failure recoveries.

## Aevo Go Theme: Dark Obsidian Canvas + Laura Mercier "Light Struck" Iridescent Pearlescent Glow System

When the target application is `aevo-go`, implement the customer UI with a matte dark obsidian canvas and the **Laura Mercier "Light Struck" Holographic Iridescent Glow & Motion System** as the authoritative visual language.

### Core Visual Contract
- **Default Theme:** Solid matte obsidian surfaces (`#090b0e`, `#12161c`, `#191f27`, `#232b36`); `color-scheme: dark` by default.
- **Base Typography & Polarity:** Crisp `#ffffff` primary text, `#94a3b8` secondary text, and `#64748b` subtle metadata. High-contrast, clean, and legible.
- **Negative Constraint (No Crude Rainbows):** Strictly **NO** primary saturated rainbow arcs, neon candy rings, or multi-color circular blur clouds (no green/yellow/hot pink donut halos). The perceived body color is always **Luminous White & Silver**.
- **Pearlescent Foil Palette (Decoded from Laura Mercier "Light Struck"):**
  - **Luminous White Core:** `#ffffff` (primary specular brilliance, 90%+ of perceived light)
  - **Ice Aqua Pearl:** `#cfe1fd` / `rgb(207, 225, 253)` (cool crystalline diamond reflection)
  - **Champagne Gold:** `#f7e6cc` / `rgb(247, 230, 204)` (warm solar shimmer)
  - **Peach Rose:** `#f3d1c5` / `rgb(243, 209, 197)` (delicate warm blush)
  - **Lavender Lilac:** `#dab9da` / `rgb(218, 185, 218)` (ethereal violet pearl)
  - **Periwinkle Pearl:** `#cbafd6` / `rgb(203, 175, 214)` (subtle deep opalescence)

### Highlight Motion Contract ("Motion เมื่อเกิด Highlight")
When interactive elements, profile avatars, hero cards, or selection controls are highlighted (`:hover`, `:focus-visible`, or active state), they exhibit a subtle, hypnotic shift in glow position and specular angles:
1. **Multi-Point Glow Shift (`lightstruck-glow-motion`):**
   - The outer glow smoothly cycles between Ice Aqua, Champagne Gold, Peach Rose, and Lavender at staggered angles over a gentle 4s–4.5s `ease-in-out` loop, simulating light dancing across a tilted cosmetic compact.
2. **Rotating Specular Foil Rim (`lightstruck-foil-rotate`):**
   - A razor-thin 2px masked-composite conic gradient rim rotates slowly (8s `linear` loop) around avatars and key circular badges, providing authentic optical reflections without blurred color bleed.
3. **Diagonal Sheen Sweep (`lightstruck-sheen-sweep`):**
   - Surface reflections on dark titanium backgrounds sweep subtly along the diagonal specular axis.
4. **Primary CTA Highlight (`lightstruck-btn-glow`):**
   - High-contrast solid white buttons (`#ffffff`) emit an alternating pearlescent aura on hover.
5. **Reduced Motion:**
   - Under `@media (prefers-reduced-motion: reduce)`, all rotational, shifting, and sweeping keyframes are strictly disabled (`animation: none !important`), settling into the static resting pearl aura.

### Design Tokens (`index.css :root`)
- `--foil-sheen-line`: Multi-stop hairline gradient (Ice Aqua → Champagne → White Flash → Peach Rose → Lavender) for card top borders, modal dividers, and header refraction slits.
- `--prismatic-rainbow-halo-xs/sm/md/lg`: Layered box-shadow tokens with white core and subtle Ice Aqua / Champagne / Lavender orbital blooms.
- `--selection-bloom`: `0 0 15px rgba(255, 255, 255, 0.2)` for active selections.

### Discord-Inspired Profile Customization, Effects, and Scalable Data Architecture
Aevo Go user profiles incorporate Discord-style expressive personalization while preserving the obsidian liquid glass luxury aesthetic:
1. **Cover Banner System:**
   - The profile hero features a responsive cover banner (`140px–200px`) with optical glass gradient refractions and curated presets (`Obsidian Titanium`, `Light Struck Iridescent`, `Midnight Tokyo`, `Emerald Rainforest`, `Celestial Deep Cosmos`, `Golden Sunset Horizon`) or custom user-uploaded covers.
2. **Avatar Decorations (Discord-Inspired Frames):**
   - Renders animated decorative frames floating over the circular avatar (`AvatarDecoration`):
     - `Light Struck Halo`: Laura Mercier pearlescent rotating ring with pulsing diamond pearl specks.
     - `Sakura Orbit`: Orbiting pink sakura flower petals with a soft pink botanical glow.
     - `Cyber Glitch Matrix`: Neon cyan & magenta cyber-circuit brackets with flashing glitch ticks.
     - `Celestial Stardust`: Deep cosmic violet orbital rings with twinkling 4-point diamond stars.
     - `Mystic Flame Orb`: Swirling mystic violet and blue flame embers licking upwards.
     - `Emerald Bloom`: Botanical emerald leaves gently swaying around the rim.
3. **Profile Effects (Discord-Inspired Full-Card Ambient FX):**
   - Renders ambient particle and lighting sweeps across the entire hero card (`ProfileEffectLayer`):
     - `Prismatic Light Beam`: Diagonal iridescent light sweep simulating light reflecting across a cosmetic prism.
     - `Sakura Falling Breeze`: Floating cherry blossom petals drifting gracefully diagonally.
     - `Cyberpunk Holo Grid`: Subtle horizontal laser scanlines and drifting digital data nodes.
     - `Cosmic Galaxy Drift`: Twinkling starlight nodes and breathing nebula atmosphere.
     - `Champagne Starlight`: Elegant floating luxury gold champagne glitter particles.
4. **Showcase Badges & Identity:**
   - Multi-select collectible badge pills under the user display name (`Founding Tastemaker`, `Verified Curator`, `Coffee Specialist`, `Urban Flâneur`, `Trailblazer Lv.5`) with Lucide icons.
   - User pronouns pill tag and clean handle display (`@username`).
5. **Data Scalability & Media Architecture (Aligned with Ecosystem Docs):**
   - **Client-Side Media Processing:** Adhering to `docs/feed-system/07-media-pipeline.md`, arbitrary client uploads must be validated (MIME type whitelist: JPEG/PNG/WebP/GIF, byte limit <3MB) and proportionally downscaled via canvas before storage to prevent IndexedDB exhaustion and memory degradation.
   - **Versioned State & Auto-Migration:** Stored under versioned schema contracts (`UserProfileCustomization` v1) with automatic schema migration and fallback defaults for forward compatibility.
   - **Offline-First Persistence:** Persisted in `localRepository` IndexedDB (`aevo-go-local`, store `preferences`) with React Query caching, instantly ready for synchronization with Core/Hub user profile APIs.
   - **Strict Accessibility:** All decorative animations respect `@media (prefers-reduced-motion: reduce)` with `animation: none !important`.

### Gamification, Progression, and Rewards Shop System
Aevo Go integrates a customer motivation and retention engine that connects real-world urban exploration, social curation, and commerce with profile self-expression:
1. **EXP Progression & Level Tiers (`calculateLevelInfo`):**
   - 6 progression tiers (`Urban Novice` Lv.1 → `Neighborhood Scout` Lv.2 → `Taste Connoisseur` Lv.3 → `City Curator` Lv.4 → `Master Tastemaker` Lv.5 → `Urban Legend` Lv.6).
   - Dynamic Bento level card with tier badge, progress percentage bar, and remaining EXP requirement.
2. **Quests & City Missions Engine:**
   - **Daily Quests:** Low-friction habit loops (Check-in at cafe/spot, Save places/traces, Share photo or story).
   - **Exploration & Special Quests:** Real-world engagement (Walking curated traces from Ari to Talat Noi, Booking workshops/tables via Aevo Play, Writing authentic reviews).
   - **One-Tap Reward Claim:** Live progress bar with claim action adding points and EXP to user state.
3. **Aevo Rewards Shop (`/profile/shop` or `/shop`):**
   - **Points Wallet:** Displays current Aevo Points balance with `#fbbf24` gold coin iconography.
   - **Cosmetic Redemptions:** Unlocks Discord-style avatar decorations, ambient profile effects, and banner presets, immediately equipping them to the user's active profile customization.
   - **Partner Merchant Coupons:** Real merchant discounts and perks (North Star Coffee free drip bag, Ari Ceramic House 20% workshop discount, Talat Noi Roastery ฿50 cold brew voucher, Aevo Play VIP pass).
4. **My Coupons Bag (`/profile/coupons`):**
   - Ticket stub interface with partner branding, discount tag, and validity date.
   - **Store Redemption Modal:** Displays a simulated optical barcode with code (`AEVO-*`) for cashiers and barista verification, with a one-tap "ใช้สิทธิ์เรียบร้อยแล้ว" redemption flow.
5. **Durable Storage & Data Architecture:**
   - Client state persisted under `user_gamification_v1_${userId}` in `localRepository` IndexedDB (`aevo-go-local`, store `preferences`), versioned for automatic migrations and ledger-ready server synchronization.

### Aevo Go optical-glass interaction contract

- Use one shared gliding selection capsule behind the active tab, category, or
  segmented-control item. It must animate position and size with a short
  ease such as `350ms cubic-bezier(0.16, 1, 0.3, 1)` and never intercept input.
- Recalculate the capsule after selection and resize. Keep semantic state on
  the item (`aria-selected`, `aria-pressed`, or `aria-current`) and support
  keyboard focus/arrow navigation where the control uses tab semantics.
- Tabs and mutually exclusive modes use the single moving capsule. Multi-select
  filters, toggles, checkbox rows, and selected actions use a solid white
  surface (`#ffffff`), black bold text, a visible check/icon cue where useful,
  and a restrained `0 0 15px rgba(255,255,255,0.2)` selection bloom. They do
  not use low-opacity glass to communicate selection.
- Reduced motion disables the glide and leaves the indicator immediately in
  its measured destination.

### Aevo Go ZAYX-inspired profile contract

Use the interaction quality and information hierarchy of the ZAYX component
library as a reference for Aevo Go, especially
`https://www.zayx.dev/components/card-insight` and the surrounding product
language at `https://www.zayx.dev/`. This is a design adaptation, not a direct
runtime dependency: ZAYX's Card Insight is an Expo/React Native component,
while Aevo Go runs as Vite React Web/Capacitor.

- The profile hero should use a reusable Profile Insight Card with a clear
  identity face and a separate insight face. The front face owns account
  identity, session state, and the primary account action; the back face owns
  compact, explainable usage signals.
- Adapt the ZAYX drag-to-flip pattern with web-native Pointer Events and CSS
  `perspective`/`transform-style: preserve-3d`. Horizontal and vertical drag
  may tilt the card while dragging; release past a deliberate threshold flips
  the face and a short settle transition returns the card to rest. Do not add
  React Native, Skia, Reanimated, or gesture-handler dependencies to Aevo Go.
- Provide an explicit 44px flip control in addition to drag, keep the action
  keyboard reachable, announce the active face with a live region, and disable
  the 3D gesture/transition under `prefers-reduced-motion`.
- Profile insight values must come from typed Customer Gateway responses or
  durable local recovery records. If a contract is loading or absent, render
  an honest unavailable state such as `—`; never invent loyalty, XP, spending,
  reservations, order, or engagement values to fill the card.
- Keep the component neutral and optical: matte dark canvas, colorless glass,
  crisp inner rim, no gradients, exterior glow, neon tint, or decorative
  finance-card styling. Translate a reference component's domain content into
  Aevo concepts rather than copying finance labels or artwork.
- The profile card must remain fluid on the full desktop canvas and stack
  cleanly at mobile widths. Keep the front/back faces semantically hidden from
  assistive technology when inactive, and do not leave inactive controls
  keyboard-focusable.

## Aevo Go Web & Capacitor Refinement Contract

This contract is the product-specific source of truth for `aevo-go`. It takes
precedence over the generic B2B workspace examples below whenever they conflict.
The forest/cream/solid-white modal examples remain available for `aevo-hub`,
but must not be copied into Aevo Go unless the user explicitly requests a
cross-product variant. The full product plan lives in
`aevocado_web_refinement.md`.

### Product shape and composition

- Treat Aevo Go as one customer product, one route/data/domain layer, and one
  design system with adaptive Web/Capacitor compositions.
- Keep the discovery hierarchy search-first: global search, horizontal
  category/area discovery, map plus selected-place preview, store cards, and a
  clear availability action.
- On mobile, use the safe-area floating bottom navigation for Explore, Map,
  Saved, Activity, and My page. On desktop, use the global header navigation
  and search utility; do not render a floating desktop side dock or desktop
  bottom navigation.
- Preserve route and analytics semantics while changing composition at the
  breakpoint. Do not mount parallel mobile and desktop data trees that issue
  duplicate API requests.
- Use the same screen source for Web and Capacitor. Platform-only behavior
  belongs behind adapters for location, share, haptics, notifications,
  external links, storage, and secure session handling.

### State and trust boundaries

- URL state owns query, area, category, map viewport/search intent, date, party,
  and other shareable filters.
- TanStack Query owns server state, cache keys, background refresh, loading,
  empty, error, and retry behavior.
- React Hook Form plus Zod owns multi-field form state when the flow grows
  beyond a simple control. Zustand owns ephemeral UI state only; a repository
  abstraction owns durable local preferences, guest saves, and cart drafts.
- The server remains authoritative for identity, permissions, public profile
  visibility, price, availability, slot holds, booking/order/payment status,
  coupons, and idempotency. Never add optimistic booking, payment, or order
  confirmation without a server reconciliation path.
- Request location or push permission only after an explicit user action and
  always keep a manual/list fallback. A denied, unsupported, unavailable, or
  failed platform capability is a designed state, not an exceptional blank
  screen.

### Interaction and async contract

- Every action has visible feedback: pending controls expose `aria-busy`, are
  protected from duplicate submission, and preserve layout; success is shown
  in a nearby live region; errors remain visible with retry.
- Use skeletons that match the eventual layout for initial loading. Do not
  replace a usable layout with a generic spinner during background refresh.
- Map interactions follow idle → locating → map-ready → moved-by-user →
  search-area → loading-results. Keep marker selection and the selected-place
  preview synchronized, and keep the list fallback available while a provider
  adapter is absent or fails.
- Booking follows service/resource → date → party/duration → slot → details →
  review → confirm. Availability is server-read, holds expire against server
  time, confirmation uses an idempotency key, and unknown outcomes reconcile
  before the UI claims success.
- Cart and checkout use a recoverable local draft, then reprice/revalidate on
  the server before payment handoff. Never collect raw card data in Aevo Go.

### Aevo Go discovery and commerce implementation checklist

When implementing or refining `aevo-go`, keep these contracts together rather
than solving them as page-only styling:

- Search reads use the typed Customer Gateway adapters. Suggestions distinguish
  store, category, and area; filters remain in the URL; cursor pagination and
  server facet metadata drive larger result sets.
- Map reads use the URL viewport `bbox` and filter state as the query key. Near
  me converts an explicit user-approved location into a bounded radius query,
  never into an unbounded location history. Use MapLibre GL JS with one
  GeoJSON source and built-in clustering rather than a DOM marker tree. Keep
  camera bounds separate from committed search bounds, show a Search this area
  action after user movement, protect against obsolete responses, synchronize
  marker/list selection, and always keep an accessible list fallback when the
  provider or WebGL fails.
- The open-source map implementation follows
  `Aevocado Open Source Map — Implementation Plan & Coding Prompt.md`: keep the
  renderer provider-neutral, use OpenFreeMap only as a replaceable development
  style source, validate style/geocoder configuration at runtime, and keep
  geocoding/routing behind provider interfaces. The renderer must not call
  Supabase or business APIs directly; convert typed domain data to GeoJSON only
  at the map boundary.
- The public spatial authority is the Customer Gateway backed by a public
  projection and PostGIS. Viewport requests must validate bbox/antimeridian,
  cap area and result count, use stable ordering, and preserve stale results
  during background refresh. Never expose private tenant/org data or use public
  Nominatim as an implicit geocoder.
- Map composition is adaptive: use a roughly 40/60 list/map split on desktop;
  use a full-viewport map with safe-area controls and collapsed/preview/
  expanded bottom-sheet states on mobile. A provider, tile, WebGL, geolocation,
  or network failure must leave the list/search path usable with a retry state.
- Store detail renders only public projection fields that the Gateway sends:
  media, hours, timezone, facilities, address, and policy remain absent rather
  than invented when unavailable. Save/share/directions must retain a manual
  fallback.
- Booking uses availability → hold → details → confirm. Holds carry expiry and
  server time, party size is validated by the server, and public activity reads
  use an opaque tracking token. Never show confirmed success from a client
  snapshot alone.
- Checkout displays draft totals only until the server cart-pricing response is
  valid. Order creation, payment-session creation, webhook reconciliation, and
  retry behavior remain separate idempotent boundaries; provider absence is a
  visible pending state, not a fake payment success.
- Use live mode as the default. Demo fixtures are an explicit UI-shell mode and
  must never be presented as live availability, price, reservation, or payment
  evidence.

The implementation plan and API boundary references are
`implementation_plan-customer-app.md`, `aevocado_implementation.md`,
`Aevocado Open Source Map — Implementation Plan & Coding Prompt.md`, and
`aevo-go/docs/api-gap-list.md`. Update those records whenever a contract moves
from planned to delivered or becomes a production gate.

### TraceDee product-loop implementation contract

`TraceDee — Product Loop Implementation Plan.md` is the product source of truth
for Aevo Go's customer discovery loop:

`Discover → Trace It / Follow → Experience → Complete / Rate / Contribute → Expertise / Reputation → Better Traces → Rediscover`.

When implementing TraceDee features in `aevo-go`:

- Keep TraceDee in its own feature modules (`features/tracedee`, `features/map`,
  `features/journeys`, `features/community`, and `features/profiles`) while
  reusing the existing App Shell and optical-glass primitives. Do not put
  TraceDee business state into the legacy store-page components.
- Treat `Save`, `Follow Trace`, `Follow Tracer`, `Start Journey`, `Complete`,
  and `Remix` as different meanings and different server mutations. Never
  collapse them into one generic heart/toggle or infer success from local UI.
- Every feed item is a discriminated item with `itemType`, stable `itemId`,
  `trackingToken`, `reasonCode`, and `reasonParams`. The reason must be visible
  or available to assistive technology; do not present unexplained ranking.
- URL state owns feed tab, query, area, map bounds, selected item, and cursor.
  TanStack Query owns server state. Local component state is limited to sheets,
  focus, hover, draft text, and per-resource pending state.
- Feed impressions are emitted only after at least 50% viewport visibility;
  opens and mutations emit past-tense events. Mutations return authoritative
  state, `stateVersion`, `eventId` when applicable, and `eventCorrelationId`.
  Retryable mutations must send an `Idempotency-Key` and reconcile with the
  same key rather than generating a fake success.
- The browser never reads or writes `tracedee_*` tables directly. Use typed
  Customer Gateway adapters. The Gateway/RPC transaction is responsible for
  authorization, idempotency, domain mutation, activity event, and outbox
  insertion as one unit. No service-role key may enter Aevo Go.
- Phase 0 / first vertical slice uses deterministic ranking and explicit empty,
  loading, stale, error, sign-in-required, and schema-not-ready states. Do not
  introduce ML ranking, XP, or reputation UI until their versioned projections
  and replay tests exist. Do not invent places, ratings, availability, or
  completion evidence in live mode.
- Journey state follows `planned → active → paused/completed/abandoned`, and
  stop state follows `pending → completed/skipped`. Completion eligibility,
  rating eligibility, remix lineage, comment depth, moderation, block/mute, and
  rate limits are server rules, not client-only guards.
- TraceDee pages must preserve the Aevo Go visual contract: solid matte dark
  canvas/cards/controls, limited colorless optical glass, crisp inner rim, zero
  gradient, zero exterior glow, and one shared solid-white selection indicator
  for tabs. Use the existing `GlidingGroup` for For you / Following / Nearby
  and preserve reduced motion and keyboard arrow navigation.
- Customer preference controls must use solid obsidian surfaces with the
  documented white/black selected state, expose
  three-to-five onboarding interests when personalization is enabled, allow a
  full reset/opt-out, and announce save/error states in a live region. Render
  taste-match percentages only when the public contract returns an authoritative
  explainable score; demo-only fixtures may show an explicitly labelled sample
  score, but live mode must use `—` when the score is absent. Never imply that
  SHADOW ranking has changed the served order.
- Feed cards may expose “ไม่สนใจ Trace นี้” only as a server mutation with an
  idempotency key. On success remove the item from the local view; on failure
  keep it visible and provide a retry path. Reason copy must be derived from
  `reasonCode`, `matchedTopics`, and `matchedAreas`, never invented client data.
- The desktop customer surface uses the full viewport with fluid gutters and
  responsive result columns. Do not reintroduce a narrow centered shell that
  wastes the PC canvas; constrain only text/control groups that need readable
  measure.

Current implementation checkpoints:

- Phase 0 schema is `aevo-hub/supabase/migrations/*_tracedee_product_loop_foundation.sql`.
  It owns feature flags, traces/stops/places, journey/community projections,
  append-only activity events, event outbox, idempotency keys, score tables,
  RLS, and service-role-only RPCs.
- The first vertical slice is available at `/traces` and `/traces/:traceSlug`.
  The feed uses deterministic `reasonCode` ranking, impression tracking, URL
  tabs/search, and detail actions for Save / Follow Trace. Journey
  start/stop/complete uses the same server-owned idempotent state machine.
  Completed Journeys expose a server-authoritative 1–5 rating flow with
  structured tags, optional moderated review text, replay-safe idempotency, and
  visible saved/moderation state. The current contribution foundation also
  covers one-target Trace/Place posts, depth-one comments, and reports with
  eligibility, duplicate/burst guards, moderation status, notifications,
  activity, outbox, and authoritative replay-safe responses; UI must never
  imply publication before the server returns `VISIBLE`.
- Aevo Go discovery now has a phase-1 `/` Explore surface and a full-height
  `/map` Trace Map surface. Explore uses typed mixed demo fixtures only in demo
  mode and typed Place/Trace projections in live mode; Map uses URL-owned
  Places/Traces mode, committed viewport search, shared MapLibre selection, and
  explicit WebGL/offline/location recovery. Keep live Post/Tracer content and
  live Trace route geometry gated on the corresponding public response fields;
  never fill those gaps with fake data.
- The Explore/Map implementation uses the shared `GlidingGroup`, neutral
  colorless glass tokens, 44px controls, per-resource pending/error/retry
  states, and a shared comments drawer/sheet. Live feed comments remain
  read-only until the feed contract supplies a thread identifier; demo comment
  composition may exercise the optimistic rollback path.
- Deterministic, versioned projection rebuilds now compute profile, expertise,
  taste-affinity, and content-quality rows from authoritative events and
  content. Profile expertise reads are exposed through the typed Gateway, while
  `taste_ranking_v1` remains in SHADOW so deterministic ordering is still
  served until measured cohort rollout. The TraceDee performance migration
  also covers the discovered foreign-key access paths with additive indexes.
- The community slice now exposes public post listing, depth-one comments,
  helpful reactions, report submission, and retry-safe server reconciliation.
  The privileged Aevo Admin surface owns the moderation queue and can review,
  limit, remove, restore, or dismiss content using evidence snapshots and a
  separate `content.moderate` platform permission. Removed content remains in
  the moderation audit trail and public projections filter it out.
- Projection rebuilds run through a worker-safe run wrapper that records the
  before/after snapshot. Aevo Admin can inspect runs and idempotently rollback
  an applied run when an event is invalidated; keep score version and audit
  metadata visible, and never mutate projection rows directly from a browser.
- Completion verification is server-authoritative and privacy-preserving:
  completion evidence is optional, coarse location is rounded before leaving
  the browser, and the UI must distinguish `SELF_REPORTED`, `PARTIAL`,
  `VERIFIED`, and `REJECTED` without exposing precise visit history.
- Community safety is part of the read model: block/mute filters apply to
  feed, posts, comments, and notifications; notification rows are grouped by
  trace/thread/event and expose aggregation counts; relation and read actions
  remain authenticated, idempotent Gateway mutations.
- Content lifecycle uses owner-only optimistic-concurrency edit and soft
  delete. Mentions are parsed server-side and must never be treated as client
  notification authority; removed content remains recoverable for moderation
  audit.
- Remix is a distinct action. A clone starts as a private draft with
  `source_trace_id`, `root_trace_id`, and bounded lineage depth. Draft edits
  use revision checks; publish creates the lineage edge, attribution event,
  and aggregated creator notification. Cloning alone must not award XP.
- Follow Tracer is also distinct from Follow Trace. The detail surface may
  show both states and counts, but each action uses its own idempotency scope,
  event type, notification path, and server-authoritative response.
- XP controls are bounded and replayable: provisional awards wait through an
  anti-abuse window, daily caps and diminishing returns apply, and invalidated
  source events reverse awards. Keep XP projections separate from expertise
  and reputation, expose algorithm/version metadata to debug surfaces, and
  keep deterministic ranking fallback while taste rollout is gated.
- The follow-up slices are implemented as production-facing boundaries:
  remix draft reads use a typed Customer Gateway place search and the editor
  keeps stop notes/duration/transport/budget editable with revision-checked
  save and conflict recovery; reputation scores include versioned evidence
  inputs and privileged admin inspection; and the customer can set three-to-
  five interests, reset/opt out, and emit hide/quick-back outcomes.
- Ranking rollout remains deliberately gated. `taste_ranking_v1` starts in
  `SHADOW` mode with deterministic ordering still served; ranking evaluations
  and guardrail reports must be observed before moving through the audited
  `LIVE` sequence `5% → 25% → 50% → 100%`. Admin controls expose the mode,
  cohort size, evidence window, guardrail pass/fail state, and a required
  reason or incident ticket. If a guardrail fails, return to `0%`/kill-switch
  and do not silently continue serving personalized order.
- Reputation UI may show evidence inputs, outcome ratios, score version, and
  calculation time to privileged operators, but never expose private raw
  activity or internal weights to customers. Public TraceDee UI uses only the
  explainable reason fields returned by the Gateway.

### Aevo Go Explore master-detail contract

The Explore route uses one responsive source tree with a URL-owned selected
Trace. This is the canonical composition for Trace discovery and must remain
compatible with the Customer Gateway boundary:

- On desktop (`min-width: 900px`), the canvas is full-bleed under the global
  header. With no selection, the feed uses the full available width. With a
  selected Trace, use a wide fluid `40% / 60%` split: the master feed follows
  the page's natural document scroll and the detail panel owns an independent
  readable scroll body. Neither column creates a second API query tree.
- Store the selected Trace in the shareable URL (`selected=<trace-slug>` or
  the stable id), keep the active feed tab/query/area/filter state in the same
  URL, and clear `selected` on the detail close button or `Escape`. The active
  master card must expose a semantic selected state and a visible neutral rim.
- On mobile and narrow tablet widths, render the feed at 100% width first.
  Opening a Trace promotes the detail panel to a full-screen overlay with a
  safe-area header and an explicit `ย้อนกลับ` control; preserve the feed and
  its URL state underneath. Do not mount a duplicate mobile data component.
- Keep the discovery header compact: breadcrumb/title, one global search with
  a keyboard shortcut, horizontally scrollable context chips, quick intents,
  then the three-item `For you / Following / Nearby` `GlidingGroup`.
- Trace cards should support a photo/cover mosaic fallback, creator identity,
  stops/time/distance/budget metrics, explainable taste reason, community
  proof, and distinct actions for detail, Trace It, Follow, Remix, map, and
  discussion. Do not collapse these actions into one generic toggle.
- The detail panel must be composed as header/share/close, verified cover,
  creator follow state, four metrics, explainable reason, stop timeline,
  verified community proof, remixed lineage, and a sticky discussion/save/
  navigation footer. Every mutation uses the existing typed action handler,
  pending/`aria-busy` state, and an idempotency key at the Customer Gateway.
- Demo mode may provide deterministic stop and remix fixtures for interaction
  testing, but it must display the demo notice. Live mode must render only
  fields present in the public projection; missing stop timeline, proof, media,
  or lineage data uses an honest unavailable state rather than invented content.
- Detail navigation to Map carries the Trace slug/selection in the URL. A
  stop's map action must remain a bounded place search until the Gateway ships
  a typed stop/place projection; disabled save controls must explain that
  boundary.

### Aevo Go Spatial Docked Side-Panel contract

Use this composition for customer content pages that show a store/Trace image
or video together with stops, details, or discussion. The panel is an inline
spatial dock, not a modal:

- Closed state centers the primary content card inside a viewport-locked stage.
  A neutral matte ambient layer is allowed for depth, but never use gradients,
  purple/green tints, exterior bloom, or colored `box-shadow` glow.
- On desktop (`min-width: 1024px`), open the right dock at approximately
  `400px–460px` (or a measured 40/60 split). Animate the stage and dock with
  GPU-friendly `transform: translate3d(...)` and
  `cubic-bezier(0.16, 1, 0.3, 1)` over `300–400ms`. Do not add a dark backdrop
  or modal focus trap.
- Keep the main stage viewport-locked and the dock independently scrollable
  with `overflow-y: auto`, `overscroll-behavior: contain`, a restrained custom
  scrollbar, and a crisp inner glass rim.
- The dock header is sticky in effect through the dock grid and owns a close
  button plus a single moving `GlidingGroup` indicator for `stops` and
  `comments`. Clicking the active trigger again closes the dock; `Escape` must
  close it as well.
- On widths below `1024px`, switch to a full-height sheet/slide-over so the
  primary media card is not compressed. Include a clear close/back action and
  preserve safe-area insets for mobile.
- When the active tab is comments, keep the composer docked to the bottom of
  the panel, expose pending/error/empty/sign-in states, and never use native
  `alert()`, `confirm()`, or `prompt()`.
- Build media from typed public projections only. Support image first when the
  contract provides `imageUrl`; add video playback only after a typed media
  asset/playback projection exists. Missing media must be an explicit honest
  unavailable state, never a fabricated asset.
- Keep the composition in one React source tree and reuse existing server
  actions, idempotency keys, session checks, and `aria-busy`/live feedback.
  Do not create a second API data tree for mobile or desktop.

### Aevo Go Explore scroll and Map filter contract

Keep customer routes scrollable without trapping the user in a fixed-height
Explore page:

- Aevo Go's customer shell uses `min-height: 100dvh` and may grow with the
  document. Do not put `h-screen`, fixed `height: 100vh`, or `overflow: hidden`
  on the Explore root or its page content. The semantic main remains the safe
  content boundary with responsive gutters and bottom safe-area padding.
- Explore mobile must use normal document flow for the feed. Do not cancel the
  page height with a negative bottom margin or hide the main scrollbar. The
  full-screen Trace detail sheet is the only independent overlay scroll
  container; closing it returns focus and scroll state to the feed.
- Explore desktop remains normal document flow. When a Trace is selected, the
  workspace becomes a fluid `40% / 60%` master/detail grid; the feed follows
  page scroll and the detail panel is sticky with its own body `overflow-y:
  auto`. This preserves deep portal/feed content without making the page appear
  frozen while keeping the detail readable.
- Viewport locking is reserved for the Trace Map canvas and other explicitly
  operational surfaces. A Map results body may scroll independently while its
  canvas remains viewport-bound.
- Map desktop keeps the canvas viewport-locked while the results body owns its
  own scroll. Map mobile keeps the map full-height and uses the collapsed,
  preview, and expanded result sheet states without making the search/list
  fallback unreachable.

Map filters are URL-owned and support multi-selection rather than pretending a
single active category is the complete filter state:

- `categoryIds` and `priceLevels` are comma-separated arrays in the shareable
  URL and remain part of the TanStack Query key/request. Never keep these
  selections only in component state.
- Category, budget, Taste Match, Saved, and Following controls use semantic
  `aria-pressed` multi-select choices. Selecting one value must not clear other
  values in the same group; “ทุกหมวดหมู่” and “ทุกระดับ” explicitly clear that
  group.
- Use one solid obsidian filter drawer with a visible selected-count,
  “ล้างทั้งหมด”, and a rating select. Use `GlidingGroup` for mutually exclusive
  modes/tabs only; do not use a single sliding indicator for multi-select
  filters. Selected filter controls must use solid white/black inverse polarity
  and a checkmark or equivalent semantic cue; never a translucent glass fill.
- Every filter change clears stale map selection, preserves unrelated URL
  state, keeps list fallback usable, and exposes a 44px touch target plus
  visible focus/selected state.

### Aevo Go shell, Spotlight Search, and map movement stability

Keep the global customer shell quiet and predictable:

- Desktop primary navigation contains only Aevocado GO, Explore, Trace Map,
  Saved, and Activity. Do not put a city selector, Create menu, cart,
  notification placeholder, merchant marketing link, or long search field in
  the global header. Keep Profile reachable through the account affordance.
- Use one compact `Search or ask... ⌘K` trigger. `Meta/Ctrl + K` opens a
  centered Spotlight-style dialog; `Escape` closes it and restores focus. The
  dialog supports Arrow Up/Down, Enter, click-outside dismissal, a clear
  button, and visible category shortcuts for Places, Traces, Aevo Play, and
  Tracers. Use SVG icons rather than emoji.
- Spotlight uses the dark neutral search contract: a dark blurred backdrop,
  crisp inner rim, and no exterior neon glow; search controls remain solid and
  high contrast. Do not use a second page-specific search state or intercept
  the same shortcut in Explore.
- Map camera movement is local interaction state, not a search commit. Keep
  camera bounds separate from committed bounds; do not write camera bounds to
  the URL or re-fetch discovery/OSM data on every movement. Show `Search this
  area` after a meaningful user move, and fetch only after the user commits
  that action. Debounce filter-chip changes by at least 400ms and initialize
  the MapLibre instance once.

### Aevo Go Trace Map place-source and booking contract

When implementing the Trace Map, keep first-party business data and public map
enrichment visibly separate:

- Customer Gateway is authoritative for Aevo store profiles, categories,
  availability, partner assignment, saved/following state, ratings, and every
  booking mutation. OpenStreetMap/Overpass may enrich the map with public
  places, but an OSM place must not be presented as an Aevo profile or as
  reservable unless it has an explicit first-party partner projection.
- The OSM adapter uses explicit `disabled`, `mock`, and opt-in `remote` modes.
  Remote queries use the current bounded viewport, cache short-lived results,
  deduplicate in-flight requests, cap result count, reject unsafe external
  website protocols, and show OpenStreetMap attribution. A wide/unsafe viewport
  must fail closed instead of issuing an unbounded Overpass query.
- Convert both sources into the same typed map summary only at the map
  boundary. Preserve `source`, `osmId`, `venueSlug`, and
  `isAevoPlayPartner`; deduplicate obvious name collisions without overwriting
  the customer record. OSM cards show external place/map actions and honest
  missing ratings/availability rather than invented values.
- Use one MapLibre GeoJSON source for pins and one list projection for fallback.
  Category marks and semantic partner indicators must be readable at a glance;
  selecting or hovering a card/pin synchronizes active state, scrolls the list
  into view, and pans the map without requiring hover-only information.
- Partner cards may open a booking drawer. In live mode the drawer reads
  server availability for date/party/slot and hands off to the existing
  server-authoritative booking route for hold → details → confirm. Demo mode
  must say that slots are fixtures and must never claim a reservation was
  created. OSM-only places never expose the booking CTA.
- Preserve the existing desktop viewport-locked canvas/results-scroll and mobile
  full-height map with collapsed/preview/expanded sheet states. Keep filters,
  viewport, selection, source mode, and partner filter shareable where the URL
  contract owns them; multi-select filters must remain independent of the
  single-selection gliding tab control.

### Aevo Go Travel & Lifestyle Booking Portal contract

Use this composition when the Explore surface is positioned as a travel,
lifestyle, and Aevo Play booking portal. It is an extension of the existing
Explore/TraceDee source tree, not a second discovery product:

- Keep the desktop portal within the standard safe content margin (`max-w-7xl`
  equivalent) with fluid gutters. The App Shell topbar contains Aevocado GO,
  Explore, Trace Map, Saved, Activity, the compact Spotlight search trigger,
  and Profile. At constrained widths, reduce labels deliberately instead of
  allowing controls to overlap.
- Use an image-led Bangkok hero only when the public projection supplies a media
  URL or the fixture is explicitly in demo mode. Use a solid neutral scrim over
  the image; never use a CSS gradient, colored ambient glow, or promotional
  copy that implies an authoritative campaign when the campaign API is absent.
- Place the booking card first in the Explore document flow so search and
  booking are immediately available. An optional image-led lifestyle hero may
  follow it in normal flow. Do not use a negative margin or fixed-height
  wrapper that makes sections overlap or traps the page scrollbar. The card owns one shared
  `GlidingGroup` for mutually exclusive intent categories (Cafe, Dining, Trace,
  Bar, Activities, Aevo Play), then location, date, party size, and query
  controls. Use solid obsidian fields and white/black primary actions; keep
  semantic status colors only for status communication, never as a glass tint.
- Shareable booking context belongs in URL state. A submit action must map the
  selected intent to the existing discovery/booking boundary (`mode`, `area`,
  `categoryIds`, `availableAt`, `partySize`, `reservable`, `searched`) and must
  not create a client-only availability result. The next route reads canonical
  availability from Customer Gateway before a hold or confirmation.
- Voucher/ticket cards may be used as a marketing surface, but demo fixtures
  must be labelled and live mode must not claim a discount grant or redemption
  without a typed campaign/entitlement response. Use a toast or inline status,
  never `alert`, `confirm`, or `prompt`, for actions that are not connected yet.
- Partner places must carry typed `venueSlug` and `isAevoPlayPartner` fields.
  Render the partner indicator and `จองสิทธิ์` CTA only when the first-party
  projection says the venue is a partner; OSM-only or unverified places never
  receive a booking CTA. Reuse the existing `/stores/:storeSlug/booking`
  handoff and its server availability/hold/confirm semantics.
- Keep the For you / Following / Nearby feed tabs as a separate `GlidingGroup`
  below the booking portal, but keep the DISCOVER FEED heading and tabs in
  normal document flow rather than making them sticky. Do not create a
  duplicate query tree for mobile; on narrow screens let category tabs scroll
  horizontally and keep the semantic page main/document flow responsible for
  vertical scrolling.
- Use ticket cutout notches, image crops, and tactile motion only with the
  monochrome contract: matte `#090b0e`/`#12161c`, solid interactive
  `#191f27`, hover `#232b36`, crisp borders, limited colorless glass, inner
  rim highlight, no exterior glow or gradient. All controls remain at least
  44px and support Thai text expansion, focus, and reduced motion.

### Aevo Go Explore regression rules

Apply these rules whenever the Explore surface is refactored or new discovery
interactions are added:

- Keep Explore in natural document flow. The root, page content, and feed must
  not use `height: 100vh`, `h-screen`, or `overflow: hidden` to create a fake
  viewport; only an explicitly operational Map canvas may be viewport-bound.
- Treat Trace/place selection and feed-tab changes as in-page state changes.
  Use semantic `button` controls for cards and filters, and when React Router
  updates the shareable query use `preventScrollReset: true` so the user's
  scroll position is preserved. Clear selection on close or `Escape` without
  moving the document to the top.
- When a Trace is selected on desktop, use a wide full-bleed workspace such as
  `width: min(100%, 1600px)` with responsive gutters. The master column should
  be `minmax(420px, 520px)` (roughly 40–45% at common desktop widths) and the
  detail column should be `minmax(0, 1fr)`; do not retain a narrow text-shell
  max width that compresses the split view.
- Keep the `DISCOVER FEED` heading and its `For you / Following / Nearby`
  controls in normal flow. Do not add `sticky`, `top: 0`, or a second anchor
  layer merely to keep those controls visible while scrolling.
- Put the `PLAN YOUR NEXT STOP` booking/search block first in the Explore
  content hierarchy. Any optional lifestyle image may follow it; do not bring
  back the removed legacy hero eyebrow/title/description above the booking
  entry point.
- For MapLibre, initialize one map instance through a ref. Camera movement may
  mark local dirty state only; the explicit `Search this area` action is the
  only camera-bound commit/refetch boundary. Debounce multi-select filter
  changes by roughly 400ms and keep camera bounds separate from committed
  query bounds.

### Visual and responsive acceptance

- Use the centralized dark obsidian and limited-glass tokens from
  `aevo-go/src/styles/index.css`; do not introduce page-specific purple,
  green, sage, or cream surfaces.
- Keep body text readable, support Thai/English expansion, use minimum 44px
  touch targets, preserve safe-area insets, and provide keyboard focus that is
  visible against dark surfaces.
- On PC desktop, use the full viewport canvas with fluid side gutters; do not
  wrap the entire Aevo Go experience in an arbitrary narrow max-width shell
  that leaves large unused side margins. Apply max-width only where it
  improves text readability or keeps a focused control group usable, and let
  result/card grids add columns at wide breakpoints.
- Verify at 360/390, 768, 1280, 1440, and 1920px. Check 200% text/400% zoom
  spot cases, reduced motion, keyboard-only navigation, map/list fallback,
  long Thai labels, and resize while a sheet/dialog/form is open.
- Prefer product evidence over decorative metrics. Do not invent ratings,
  hours, availability, media, loyalty progress, or operational status when the
  corresponding public/server contract is not present; label demo fixtures and
  pending provider work honestly.

## Shared Design Language

- **No Emojis or Emoticons:** Do not use emojis or emoticons in authored UI copy, headings, buttons, badges, or indicators. Use one consistent SVG icon family. Do not alter user-authored content to enforce this.
- **Micro-Interaction Catalog Integration (`reactbits.dev/c/micro`):**
  - Reference the **Micro** collection on React Bits for high-polish component feedback:
    - _Tactile Action Feedback:_ Gentle spring-based micro-scaling (`scale(0.98)`) and magnetic/cursor-aware tilt on floating liquid cards.
    - _Liquid Status Indicators:_ Subtle pulsing live-status pips with soft diffusion blurs instead of static flat dots.
    - _Micro-Sheens:_ Shifting specular light highlights along the inner rim of active buttons during interaction.
  - Implement these interactions purely using native CSS transforms, transitions, or existing lightweight animation tools without dragging in redundant component suites.
- **Centralize Semantic Surface Tokens:** Maintain tokens for the base canvas,
  card/interactive/hover layers, the limited glass blur/fills, rim highlights,
  selection polarity, text, muted text, and semantic feedback states.
- **Composition over Overrides:** Prefer modular composition and a small documented set of variants over copied markup, per-page overrides, or universal components with excessive boolean props.
- **Accessible Primitives:** Reuse existing accessible primitives for dialogs, menus, tabs, comboboxes, and tooltips.

## Selection Motion & Hold Confirmation

- **One Moving Active Lens:** Tab bars, steppers, side navigation, and scope
  selectors use one shared measured selection indicator. In Aevo Go the
  indicator is a solid white capsule with black active text; other surfaces may
  use the shared glass treatment only when their allow-list permits it. Move
  the indicator with a transform and measured width/height when the semantic
  active item changes; do not paint an independent toggle background on every
  selected item.
- Keep the semantic state in the control itself (`aria-current`, `aria-selected`, or the appropriate active class). The moving glass layer is visual feedback only and must not intercept pointer or keyboard input.
- The indicator must animate with a short spring-like ease, remain legible in narrow layouts, recover when items are dynamically re-rendered, and become immediate when `prefers-reduced-motion: reduce` is enabled.
- **Hold-to-confirm:** Use an accessible Hold Button for destructive, privileged, irreversible, or high-impact actions such as revoking access, disabling an account, impersonating a user, deleting data, or changing security boundaries. A normal click must never confirm these actions.
- Hold Buttons must support pointer and keyboard input, show a visible progress fill and concise “Hold to …” label, cancel when released early, expose `aria-busy` while the request is running, prevent duplicate submissions, and restore the control with an inline error/toast and retry path when the request fails.
- Use a default hold duration around `900ms` and tune it only when the risk or context justifies it. Do not use Hold Buttons for routine navigation, ordinary saves, or low-risk selection changes.
- Never use native `alert()`, `confirm()`, or `prompt()` for confirmation or audit reasons. Ask for required context in a semantic dialog, then acknowledge the result with a toast or nearby live status.

## Visual Direction: 3D Liquid Glass & Gaussian Blur

> Scope note: the following cream/forest visual examples describe the Aevo Hub
> B2B workspace. For `aevo-go`, follow the Dark Flat + Optical Colorless
> Liquid Glass contract above and translate only the interaction principles
> into its neutral dark tokens.

Surfaces behave as tactile, semi-translucent convex glass lenses with light refraction and soft ambient depth:

- **Canvas & Environmental Background:**
  - Ambient base: Ultra-soft cream/off-white (`#f6f8f5`) with subtle, large organic radial color blurs beneath the glass layer to give the blur surface depth to refract.
- **Frosted Glass (Gaussian Blur):**
  - Standard cards and panels: `backdrop-filter: blur(16px) saturate(160%); -webkit-backdrop-filter: blur(16px) saturate(160%);`
  - Translucent fill: `rgba(255, 255, 255, 0.65)` to `rgba(255, 255, 255, 0.82)`.
  - Floating overlays and topbars: `backdrop-filter: blur(24px) saturate(180%); background: rgba(255, 255, 255, 0.75);`
- **3D Tactile Depth & Specular Rim Highlights (No Harsh Borders):**
  - Replace solid border outlines with a dual-light specular boundary:
    `box-shadow: inset 1px 1.5px 0 rgba(255, 255, 255, 0.85), inset -1px -1px 0 rgba(0, 0, 0, 0.03), 0 8px 24px rgba(45, 74, 48, 0.05);`
  - Cards feel subtly convex (raised from the screen) rather than drawn with flat vector strokes.
- **Form Controls & Inputs (Recessed Glass):**
  - Style inputs as gently indented into frosted glass:
    `background: rgba(240, 244, 238, 0.6); box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.04), inset 0 -1px 0 rgba(255, 255, 255, 0.6);`
  - Focus state: Replace thick outlines with a soft liquid luminescence glow:
    `box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02), 0 0 0 3px rgba(64, 99, 67, 0.2); background: rgba(255, 255, 255, 0.9);`
- **Action Buttons & Pills (Liquid Lens):**
  - Primary CTA: Deep forest/sage liquid glass with upper specular gloss:
    `background: linear-gradient(180deg, #446847 0%, #2f4e32 100%); box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.35), 0 6px 16px rgba(45, 74, 48, 0.25); color: #ffffff;`
  - Pill radius: Use fully rounded capsule edges (`border-radius: 9999px;`) for pills and `14px–18px` for modular glass cards.
- **Typography:**
  - Use **IBM Plex Sans Thai** as the product UI font for Thai and Latin text. Load weights `300, 400, 500, 600, 700` and keep `Fira Code` reserved for IDs, query syntax, and other technical values.
  - Use `400` for body copy and table data, `500` for page and section titles, `600` for controls and important values, and `700` for compact labels, eyebrow text, and strong emphasis. Avoid faux bold and avoid relying on a serif fallback for headings.
  - Tabular figures (`font-variant-numeric: tabular-nums;`) for metrics and balances.
  - Sentence case for action verbs; maintain strict WCAG AA contrast against translucent backgrounds.

## Layout and Navigation

- **Topbar Rhythm:** Keep topbar at `56px–64px` with continuous frosted blur. Prevent text wrapping on action buttons using `white-space: nowrap;`.
- **Navigation Drawer / Sidebar:** Frosted vertical panel with capsule-shaped active indicators (`border-radius: 9999px`) using subtle sage tinting and inner specular rim light.
- **Persistent Workspace Sidebar:** Use the viewport-locked shell and independent-scroll contract below for admin/control-plane dashboards. The sidebar must remain available while the main surface scrolls, and its navigation must have a bounded internal scroll region when the menu is longer than the viewport.

### Viewport-locked dashboard shell & independent scroll

For a dashboard with a persistent sidebar, make the shell the only viewport-sized
layout boundary. Do not let a long content column determine the shell height or
fall back to a shared window scrollbar:

- Root shell: `display: flex; width: 100%; height: 100vh; height: 100dvh;
  min-height: 0; overflow: hidden;`. Keep `html` and `body` at `height: 100%`
  so the shell has a real containing block.
- Desktop sidebar: `flex: 0 0 var(--sidebar-width); width:
  var(--sidebar-width); height: 100%; min-width: 0; min-height: 0;
  overflow: hidden; display: flex; flex-direction: column;`. A fixed flex basis
  prevents content in the main column from stretching or shrinking the sidebar.
- Sidebar navigation: `flex: 1 1 auto; min-height: 0; overflow-y: auto;
  overscroll-behavior: contain;`. Keep the brand/context area above it and the
  session/user footer below it with `flex: 0 0 auto` and `margin-top: auto`.
- Main column wrapper: `flex: 1 1 0; min-width: 0; min-height: 0; height: 100%;
  overflow: hidden; display: flex; flex-direction: column;`. Every flex ancestor
  in this chain needs `min-height: 0`; otherwise the browser's automatic minimum
  size can recreate the stretched-sidebar bug.
- The semantic `<main>` must own the vertical scroll: `flex: 1 1 0; width: 100%;
  height: 100%; min-width: 0; min-height: 0; overflow-y: auto;
  overscroll-behavior: contain;`. Put a constrained `max-width` on an inner
  content wrapper, not on `<main>`, so the main panel still occupies all remaining
  viewport width.
- Do not use `position: sticky` or `min-height: 100vh` as a substitute for this
  contract. Sticky positioning can hide the underlying sizing problem and leaves
  the page dependent on window scroll.
- At the stacked/mobile breakpoint, change the shell to a column, reset the
  sidebar to `height: auto; min-height: 0;`, make the navigation a deliberate
  horizontal scroll region (`overflow-x: auto; overscroll-behavior-x: contain`),
  and keep the main column as `flex: 1 1 0; min-height: 0` with its own vertical
  scroll. Never hide navigation or allow scroll chaining to move the whole page.
- QA must confirm: the sidebar footer stays at the viewport bottom, long menus
  scroll inside the sidebar, long dashboards scroll inside `<main>`, the window
  does not acquire a page-level scrollbar, and scrolling at either boundary does
  not chain into the other container. Check 360/390/768/1280/1440/1920px,
  200% text/400% zoom, keyboard focus, reduced motion, and long Thai labels.
- **First-class Workspace Areas:** Operational areas such as `Stores & branches` must be reachable as first-class sidebar routes, not only as a buried section inside a settings page. Give the route its own active navigation state, breadcrumb, heading, permission-denied state, and return path to the broader settings area. Store collections should link to a first-class store context route (for example `/stores/:storeId`) after creation, where store-level application availability can be configured. Reuse the same server loader/action and domain components where possible rather than duplicating authorization or form logic.
- **Public Home Escape Hatch:** An authenticated workspace must keep an explicit `Home` link and brand link to the configured public home URL. Do not make users sign out or rely on browser history to leave the control plane; validate the configured URL server-side and preserve the current Hub session.
- **Modular Micro-KPI Rails:** Responsive auto-fit card grid (`repeat(auto-fit, minmax(min(100%, 200px), 1fr))`) displaying metrics, clear labels, and subtle pill tags without visual clutter.
- **Content Organization:** Place actions immediately near target objects. Use split views and KPI arrangements only when justified by content, avoiding forced asymmetric layouts.
- **Responsive Layout:** Stack multi-column glass cards vertically on smaller viewports (`< 1024px`). Ensure backdrop blur remains hardware-accelerated and smooth during scrolling.

### Aevo Hub B2B Workspace Layout & Hierarchy Contract

Apply these layout and hierarchy rules to eliminate visual bugs, badge collisions, and redundant repetitions in Aevo Hub:

- **Context Switcher 2-Row Grid Architecture:**
  - In the persistent sidebar (minimum width `264px`), never compress the context eyebrow label and scope badge into the same single-row grid alongside the entity icon, name, and chevron.
  - Implement a dedicated 2-row layout:
    - **Header Row (`.aevo-context-trigger__header`):** Contains the small uppercase eyebrow (`CURRENT CONTEXT`) and the right-aligned scope badge (`STORE SCOPE` or `ORGANIZATION SCOPE`).
    - **Body Row (`.aevo-context-trigger__body`):** Contains the 36px icon avatar, store/org title with truncated subtitle (e.g. `TEST001 · THB`), and the chevron toggle indicator.
  - Prevents badge and text collisions across languages (Thai/English) or long store titles.
- **Page Heading & Inline Status Badge Alignment:**
  - Never render status badges (`<StatusBadge tone="active">ACTIVE</StatusBadge>`) on an isolated row above the page `<h1>` title where it looks like an accidental orphan element.
  - Use `.aevo-page-heading__title-row` with `display: flex; align-items: center; gap: 12px; flex-wrap: wrap;` so the status badge sits directly beside the primary title on the same horizontal baseline.
- **Repetition Elimination & Scope Advisory Hierarchy:**
  - Never repeat the active store or entity name 3 times in stacked consecutive blocks (e.g., in `<h1>`, in the green scope banner, and again in an `<h2>` card title).
  - Use distinct semantic roles:
    1. **Primary Page Heading (`<h1>`):** Displays the active entity name (e.g., `test`) and its metadata (`TEST001 · Asia/Bangkok · THB`).
    2. **Scope Boundary Banner (`.aevo-scope-banner`):** Acts as an informative boundary alert explaining what changes on the page affect (e.g., "Store-level workspace · Changes on this page apply only to this store...").
    3. **Operational Section Cards:** Use purposeful operational section headings (e.g., "Branch overview", "Operational summary", "Store modules") instead of repeating the store name.

## Dialog, Modal & Overlay Architecture (Flat / Modern — Solid White Surface)

> Scope note: this solid-white modal contract is for Aevo Hub workspace flows.
> Aevo Go dialogs/sheets must use the dark obsidian surface tokens, keep glass
> to the explicitly allowed backdrop/media-badge cases, and follow the
> customer-flow accessibility rules defined above.

Modals and dialogs use a **flat solid white surface** (not frosted glass) to create maximum foreground clarity against the blurred backdrop. The backdrop retains Gaussian blur and a dark tint to isolate focus. Inputs inside modals use a sage-tinted recessed background with 1.5px sage borders for high-contrast legibility.

### Token Reference (`shared.css :root`)

```css
/* Flat Modal Tokens */
--modal-surface: #ffffff;          /* Solid white — no alpha, no glass */
--modal-border: #e6ebe4;           /* Hairline container border */
--modal-shadow: 0 2px 4px rgba(0,0,0,0.04), 0 20px 52px rgba(32,52,35,0.13);
--modal-divider: #eef1ec;          /* header/footer separator lines */

/* Flat Input Tokens */
--input-bg: #f3f6f1;               /* Sage-tinted field background */
--input-bg-active: #edf1ea;        /* Hover/active field background */
--input-border: #cdd8c9;           /* 1.5px sage border */
--input-border-focus: var(--brand-primary);  /* #5b7b58 on focus */
--input-focus-ring: 0 0 0 3px rgba(45, 79, 52, 0.16);  /* Forest green glow */
```

### Mandatory Centering & Layout

All `<dialog>` elements **must** define fixed viewport centering for global reset immunity:

```css
dialog {
  position: fixed;
  inset: 0;
  margin: auto;
  width: min(560px, calc(100vw - 32px));
  max-height: calc(100dvh - 48px);
  padding: 0;
  border: 1px solid var(--modal-border);
  border-radius: 16px;
  background: var(--modal-surface);   /* Solid white — NOT rgba() */
  color: var(--text-main);
  box-shadow: var(--modal-shadow);    /* NO backdrop-filter on dialog itself */
  overflow-y: auto;
  overscroll-behavior: contain;
}

dialog::backdrop {
  background: rgba(14, 24, 16, 0.48);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  backdrop-filter: blur(10px) saturate(140%);
}

dialog[open] {
  animation: dialog-appear 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes dialog-appear {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}
```

### Semantic Modal HTML Structure

Always use the three semantic sections — never a monolithic `modal-box` div:

```html
<dialog id="modal-example">
  <!-- Header: title + close button -->
  <div class="modal-header">
    <div>
      <div class="modal-header-title">Dialog Title</div>
      <div class="modal-header-subtitle">Optional supporting subtitle</div>
    </div>
    <button type="button" class="modal-close-btn"
            onclick="document.getElementById('modal-example').close()"
            aria-label="Close">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
           stroke="currentColor" stroke-width="2.5"
           stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>

  <!-- Body: form fields -->
  <div class="modal-body">
    <!-- fields go here -->
  </div>

  <!-- Footer: Cancel + Primary action -->
  <div class="modal-footer">
    <button type="button" class="pill-btn pill-btn-ghost"
            onclick="document.getElementById('modal-example').close()">Cancel</button>
    <button type="button" class="pill-btn pill-btn-primary"
            onclick="submitAction()">Save Changes</button>
  </div>
</dialog>
```

### Layout Grid Rules

- **3-column grid for co-dependent quota fields:** Use `grid-template-columns: 1fr 1fr 1fr` for tightly related controls like (Status, Max Users, Max Stores).
- **Full-Width Fields:** Identity fields (Name, Email, Description) must span `grid-column: 1 / -1`.
- **No Orphaned Fields:** Never leave a single field alone in a multi-column row. Use full-width span instead.
- **Responsive Reflow:** Collapse to 1 column below `640px`.

### Dialog-Scoped Input Overrides

```css
dialog .input-field-group input,
dialog .input-field-group select,
dialog .input-field-group textarea {
  background: var(--input-bg);           /* #f3f6f1 sage-tinted */
  border: 1.5px solid var(--input-border);  /* #cdd8c9 visible sage */
  border-radius: var(--radius-sm);
  box-shadow: none;                       /* flat — no inset shadow */
}

dialog .input-field-group input[readonly] {
  background: #f0f4ee;
  color: var(--text-muted);
  cursor: default;
}

dialog .input-field-group input:focus,
dialog .input-field-group select:focus,
dialog .input-field-group textarea:focus {
  background: #ffffff;
  border-color: var(--input-border-focus);
  box-shadow: var(--input-focus-ring);
  outline: none;
}
```

### Module Chip Toggles

Replace native checkbox grids with pill-shaped toggle chips for feature flags and module access:

```html
<div class="input-field-group">
  <label>Feature Modules <span style="font-weight:400; color:var(--text-muted);">— enable or disable per tenant</span></label>
  <div class="module-chip-group">
    <div class="module-chip">
      <input type="checkbox" id="flag-pos" checked>
      <label for="flag-pos">Aevo POS</label>
    </div>
    <!-- ... more chips ... -->
  </div>
</div>
```

**Chip CSS pattern:**
```css
.module-chip-group { display: flex; flex-wrap: wrap; gap: 6px; }
.module-chip input[type="checkbox"] { position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; }
.module-chip label {
  padding: 5px 11px; border-radius: var(--radius-pill);
  border: 1.5px solid var(--input-border); background: var(--input-bg);
  color: var(--text-muted); font-size: 0.75rem; font-weight: 600; cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.module-chip input:checked + label {
  background: var(--brand-tint); border-color: rgba(91,123,88,0.55); color: var(--brand-dark);
}
.module-chip input:checked + label::before { content: "\2713"; font-size: 0.65rem; font-weight: 800; opacity: 0.8; }
```

### Button Variants

- **Primary (Forest Green Capsule):** `pill-btn pill-btn-primary` — forest green gradient, white text, subtle inner specular highlight.
- **Ghost (Flat Secondary):** `pill-btn pill-btn-ghost` — transparent fill, sage border (`--input-border`). Use for dismiss/cancel actions.
- **Subtle:** `pill-btn pill-btn-subtle` — frosted glass fill (for non-modal contexts).
- **Danger:** `pill-btn pill-btn-danger` — used only for destructive confirmation actions.

```css
/* Ghost button */
.pill-btn-ghost {
  background: transparent;
  border-color: var(--input-border);  /* #cdd8c9 */
  color: var(--text-main);
}
.pill-btn-ghost:hover {
  background: var(--input-bg);
  border-color: var(--brand-primary);
  color: var(--brand-dark);
}
```

### Dismissal & Light-Dismiss Pattern

```javascript
dlg.addEventListener("click", (event) => {
  const rect = dlg.getBoundingClientRect();
  const isInDialog = (
    rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
    rect.left <= event.clientX && event.clientX <= rect.left + rect.width
  );
  if (!isInDialog) dlg.close();
});
```

Native `Escape` key is handled automatically by `<dialog>`.

### Notification Rule

**Never use `alert()`, `confirm()`, or `prompt()`.** Always use Toast Notification (`showToast(msg, isError)`) for feedback. Success toasts auto-dismiss in 4 seconds; error toasts persist until dismissed.

### Universal Loading UI & Instant Interaction Feedback Contract (Every Clickable Element)

Every user-triggered action and clickable element across Aevo Hub and customer surfaces must provide **instant visual feedback (< 100ms)** upon being clicked or triggered. The user must never be left wondering whether their click registered, whether data is being fetched, or whether a transition is underway.

#### The 3-Tier Interaction Feedback Architecture

1. **Tier 1: Physical Tactile Press Feedback (CSS Micro-Interaction):**
   - Every interactive element (`button`, `a`, `.aevo-module-card`, tab button, scope switcher option) must implement tactile compression:
     ```css
     button:active, a:active, .aevo-module-card:active {
       transform: scale(0.98);
       transition: transform 0.08s ease;
     }
     ```
2. **Tier 2: Targeted Element Micro-Spinner & Pending State:**
   - Every clickable element must transition into an inline visual pending state immediately upon click:
     - **Action & Submit Buttons (`Button`, `ActionLink`):**
       - Add `.is-busy` class and set `aria-busy="true"`.
       - Render an inline `<Spinner size={14} />` or `<Spinner size={16} />` alongside or replacing the icon.
       - Preserve button padding and dimensions to prevent layout shifts.
       - Disable input to prevent double submission while maintaining readability.
     - **Sidebar Navigation Links (`.aevo-hub-nav a`):**
       - When clicked, immediately show an inline `.aevo-nav-spinner` and apply `.is-pending` styling.
       - Set `aria-busy="true"` on the pending navigation item.
     - **Scope & Workspace Switcher Items (`.aevo-scope-switcher__option`):**
       - When a store or organization is selected, immediately swap the icon for a `<Spinner size={16} />`.
       - Update label to show live activity (e.g., "Switching workspace…").
       - Set `aria-busy="true"` on the active option and disable sibling options.
     - **Segmented Controls & Tabs (`StoreTabs`):**
       - When a tab is clicked, display an inline `.aevo-tab-spinner` next to the tab label while the new view loads.
     - **Module Cards & Clickable Grid Items (`ModuleCardLink`, `.aevo-module-card`):**
       - When clicked, render a corner micro-spinner (`.aevo-card-spinner`) at the top right of the card and apply `.is-pending` (subtle border glow and slight elevation).
       - Set `aria-busy="true"`.
     - **Modal & Dialog Forms:**
       - During form submission, the primary button enters `busy={isSubmitting}`, all form inputs are set to `disabled`, and the dialog prevents dismiss gestures.
3. **Tier 3: Global Route & Mutation Shimmer Bar:**
   - A global top progress bar (`.aevo-top-progress-bar`) is mounted at the very top of the viewport (`height: 3px; position: fixed; top: 0; left: 0; right: 0; z-index: 99999`).
   - Active whenever `navigation.state !== "idle"` or during background transitions.
   - Uses an organic forest-green shimmering gradient animation (`@keyframes aevo-progress-shimmer`) to communicate page-level data loading and route streaming.

#### Shared Design System Spinner (`packages/design-system`)

Use the standardized `<Spinner />` primitive rather than ad-hoc SVG markup:
```tsx
import { Spinner } from "@aevocado/design-system";

// Available sizes: 14, 16, 20
<Spinner size={16} aria-label="Loading..." />
```

```css
.aevo-spinner {
  display: inline-block;
  border-radius: 9999px;
  border-style: solid;
  border-color: rgba(68, 104, 71, 0.2);
  border-top-color: var(--aevo-color-brand-primary, #446847);
  animation: aevo-spin 0.65s linear infinite;
}
.aevo-button.is-busy {
  position: relative;
  cursor: wait;
  opacity: 0.85;
}
```

- **Async actions:** Set a visible pending state before the request starts. Disable the triggering control to prevent duplicate submissions, expose `aria-busy="true"`, use a concise pending label or spinner, and preserve the surrounding layout.
- **Synchronous actions:** Show the resulting state immediately, such as the newly active step, selected option, expanded panel, or a live status message.
- **Successful actions:** Confirm the outcome in a nearby status region or success toast, then show the next state or destination. Navigation CTAs must communicate that navigation is in progress before changing location.
- **Failed actions:** Keep the primary layout visible, restore the control, show a persistent inline error or dismissible error toast, and provide a clear retry path. Do not silently swallow errors.
- **Final-step navigation:** If a completion API call precedes navigation, handle completion and navigation as explicit states. Include the destination context in the URL when needed, validate required identifiers before navigating, and never leave a disabled or inert final CTA without an explanation.
- **Accessibility:** Use a `role="status"` / `aria-live="polite"` region for progress and success updates; use `role="alert"` for actionable errors. Loading indicators must not be the sole meaning of the state.


## Async States, Recovery, and Accessibility

- **State Completeness:** Support initial loading, background refresh, empty states, and errors. Never replace active layouts with blank spinners during background synchronisation.
- **Glass Skeletons:** Use low-contrast shimmering translucent pulses (`rgba(255, 255, 255, 0.4)`) matching exact component dimensions to avoid layout shifts.
- **Contrast & Legibility (WCAG 2.2 AA):**
  - Verify that text over frosted/translucent glass maintains at least 4.5:1 against either the card surface or underlying blurred shapes.
  - When `backdrop-filter` is unsupported, gracefully fall back to semi-opaque neutral containers (`rgba(248, 250, 247, 0.96)`).
- **Reduced Motion:** Respect `prefers-reduced-motion`: disable shimmer loops, spring tilts, and micro-interaction sheen transitions, providing immediate opacity-based feedback instead.

## Aevo Go Mobile Feed and Map Interaction Contract

### Mobile Post and Trace Cards

- At widths below `768px`, a Trace card exposes one primary capsule CTA and one horizontal icon rail. Do not stack long text-action rows for detail, save, map, remix, comments, and share.
- Trace and post media use a Facebook-style responsive photo grid based on `images.length`: one image preserves its natural aspect ratio, two images use equal square columns, three images use one large tile plus two supporting tiles, and four or more images use a 2x2 grid with a remaining-count overlay on tile four.
- Every photo grid, tile, and image must use `touch-action: pan-y` so a vertical page gesture remains a page gesture even when it starts on media. Do not use a horizontal media carousel as the default mobile interaction for these cards.
- Every tile is a real button with a minimum `44px` target and opens an accessible lightbox/detail surface. The lightbox supports close, `Escape`, previous/next controls, a visible position count, and a detail CTA when the parent card provides one.
- Creator avatar/name is a single `44px`-minimum button. It opens a neutral glass profile sheet with bio, taste rationale, honest available stats, and a Follow/Following action. The sheet closes through its close button, scrim, or `Escape`.
- Use Lucide/SVG icons with accessible labels; never use emoji as the only action affordance. Async save, share, comment, and follow actions expose pending/disabled/`aria-busy` states. A broken image must fall back to its text label without collapsing the card.

### Mobile Trace Map Immersive Mode

- The mobile map result surface is a draggable bottom sheet with three explicit snap points: `peek` (handle, compact search and result count), `half` (horizontal filters and short result list), and `full` (detailed filters and independently scrollable results). Use pointer capture on the handle and snap on release; do not update React state on every pointer-move frame.
- The sheet is the only mobile map control surface: search, mode switch, multi-select filters, sorting and results must be inside it rather than a second top overlay. Keep the map viewport visible behind it and keep bottom navigation available.
- Below `768px`, map camera interaction owns a local `isMapInteracting` UI state guarded by a ref so repeated `touchmove` events do not enqueue a render every frame. `touchstart`, `touchmove`, and MapLibre `move`/`moveend` signals may only hide/reveal chrome; they must not fetch discovery data.
- While interacting, transform the search, mode tabs, filter chips, Search this area CTA, preview card, and map notices out of view. Collapse the result sheet to `peek`; its compact controls may remain available only after the gesture settles. Keep the bottom navigation visible at all times.
- Reveal the chrome after an approximately `1800ms` inactivity timer or immediately on a blank-map tap. Clear and replace the timer on every interaction; clean it up on unmount. Dragging the sheet itself must not trigger a map query.
- Map camera bounds are local/dirty until the user explicitly commits `Search this area`. Keep the MapLibre instance in a ref and initialize it once per mounted map surface.
- Respect `prefers-reduced-motion` by removing the transform transitions while preserving the state and content hierarchy.

### Aevo Go Entry Point and Gateway Recovery

- `/` is the single customer discovery entry point. Legacy singular `/trace` routes must use a replace redirect to `/?tab=for_you&category=trace` (or preserve a valid discovery tab) rather than rendering a second feed tree. Existing detail routes such as `/traces/:traceSlug` remain explicit detail routes.
- On mobile, do not duplicate Profile in the top header when the bottom navigation already exposes Profile. Keep one canonical Profile destination.
- Public read queries may use the repository's typed in-memory demo fixtures when a gateway request fails at the network layer (`TypeError`/offline), but must display an honest offline/demo notice and a retry action. Never turn a failed booking, save, follow, or other mutation into a fake success.
- Do not hard-code a closed mock port in feature code. Read the API origin from validated environment configuration, classify connection failures separately from HTTP authorization/business errors, and keep API errors recoverable with inline status and retry.

### Aevo Go Monochrome Depth and High-Contrast Selection Contract

Use this contract when implementing or refining Aevo Go controls, filters, and
selection-heavy screens:

- Treat the six obsidian layers as shared tokens, not page-specific colors:
  canvas `#090b0e`, card `#12161c`, interactive `#191f27`, hover/inactive
  emphasis `#232b36`, border `#2c3644`, and primary contrast `#ffffff`.
- Inactive interactive controls use `#191f27` with `#94a3b8` text and
  `#2c3644` borders. Hover uses `#232b36` and a stronger neutral border.
- Active filter, toggle, checkbox, rating, and selected action controls use a
  solid `#ffffff` surface with bold `#000000` text. Add a Lucide check icon or
  another semantic active cue where the control represents a multi-select.
  Use only the subtle white selection bloom; never a colored or exterior glow.
- Keep the inner rim to `inset 0 1px 0 rgba(255,255,255,0.08)` (optionally with
  a restrained dark lower inset). Do not add gradients, radial flares, colored
  halos, or drop-shadow bloom.
- Glass is an explicit allow-list: top navigation, Spotlight/search backdrop
  and surface, and floating badges on media. Remove `backdrop-filter` from
  filter chips, toggles, checkbox rows, ordinary cards, and buttons.
- A `GlidingGroup` still owns one moving indicator for tabs and mutually
  exclusive modes. Its active indicator is solid white with black active text;
  each multi-select filter must remain independently selectable and must not
  borrow that single-lens behavior.
- Centralize these rules in `aevo-go/src/styles/index.css` and verify dark
  contrast, 44px touch targets, keyboard focus, reduced motion, selected-count
  feedback, and URL/query persistence for map filters.

## Definition of Done

- Evaluated `https://reactbits.dev/c/micro` for suitable micro-interaction patterns and adopted only those that improve operational clarity and tactile responsiveness.
- Hub surfaces use tactile 3D liquid glass specular highlights and soft drop shadows instead of harsh solid outlines.
- **Aevo Go surfaces use Dark Obsidian Canvas + Laura Mercier "Light Struck" Iridescent Pearlescent Glow System:**
  solid matte obsidian canvas/cards/controls, neutral optical glass on headers/drawers/spotlight,
  and delicate Laura Mercier "Light Struck" iridescent foil glows (Ice Aqua, Champagne Gold, Peach Rose,
  and Lavender with a pure white core). When highlighted (:hover, :focus-visible), surfaces exhibit
  subtle organic glow motion without crude multi-colored rainbow clouds. Selected controls use solid
  white/black inverse polarity with the documented restrained white bloom.
- Modals & dialogs enforce explicit centering (`position: fixed; inset: 0; margin: auto;`) with Gaussian blur `::backdrop` and safe viewport constraints.
- **Modal surface is solid white** (`--modal-surface: #ffffff`); **no** `backdrop-filter` on the dialog element itself. The frosted blur stays on `::backdrop` only.
- **Inputs inside modals** use sage-tinted background (`--input-bg: #f3f6f1`), 1.5px sage borders (`--input-border: #cdd8c9`), and the custom focus ring (`--input-focus-ring: 0 0 0 3px rgba(45, 79, 52, 0.16)`).
- Modal HTML always uses semantic sections: `.modal-header` / `.modal-body` / `.modal-footer` — never a single `.modal-box` wrapper.
- Feature flag toggles use `.module-chip` / `.module-chip-group` pill chips — never native bare checkbox grids.
- Cancel / dismiss actions use `pill-btn pill-btn-ghost` (transparent + sage border); primary actions use `pill-btn pill-btn-primary`.
- Form grids are balanced without orphaned fields; 3-column grids used for co-dependent quota triplets; full-width identity fields span all columns.
- Close triggers use accessible SVG `.modal-close-btn` circles; action footers are right-aligned with clear hierarchy.
- Click-outside light-dismiss and Escape key handling are fully functional.
- No emojis are present in authored UI or labels; all icons are semantic, accessible SVGs.
- **Toast Notifications** replace all native `alert()` / `confirm()` calls. Never use browser dialogs for user feedback.
- **Universal Loading UI on Every Clickable Element:** Every interactive control (buttons, links, navigation items, tabs, cards, switcher items) provides instant (< 100ms) tactile press feedback (`scale(0.98)`), renders an inline micro-spinner (`Spinner`, `.aevo-nav-spinner`, `.aevo-tab-spinner`, `.aevo-card-spinner`), sets `aria-busy="true"`, and prevents double-action triggers.
- **Global Route & Mutation Progress Bar:** A top progress bar (`.aevo-top-progress-bar`) appears at the top edge of the viewport during all route navigation and async transitions.
- **Aevo Hub Workspace Layout & Collision Prevention:** Context switcher implements a non-overlapping 2-row layout (`.aevo-context-trigger__header` and `__body`) within a minimum 264px sidebar; status badges sit inline beside `<h1>` headings (`.aevo-page-heading__title-row`); redundant entity name repetition across stacked rows is eliminated.
- **Every user-triggered action has immediate feedback:** async actions expose pending/disabled/`aria-busy` states, synchronous actions expose the resulting state, success is acknowledged, and errors remain visible with a retry path.
- **Aevo Go mobile media and map interactions are resilient:** photo grids preserve natural single-image ratio and `pan-y` scrolling, lightboxes are keyboard dismissible, map sheets snap between `peek`/`half`/`full` without per-frame state churn, and gateway-offline read fallbacks are visibly labeled.
- **Selection motion is coherent:** active tabs, steppers, scopes, and navigation show one moving glass indicator rather than competing per-item toggle fills; reduced-motion behavior is verified.
- **High-impact actions are deliberate:** destructive and privileged operations require a keyboard-accessible Hold Button with visible progress, cancellation, pending, and failure recovery states.
- **Typography is consistent:** IBM Plex Sans Thai is loaded and applied across public, workspace, setup, and administration surfaces with intentional weights; technical identifiers retain a monospace treatment.
- Keyboard navigation, ARIA attributes, responsive reflow (down to 320px), and contrast standards comply with WCAG 2.2 AA.
- Dashboard shells use a viewport-locked `100dvh` boundary with `overflow: hidden`; the sidebar navigation and semantic `<main>` own independent scroll containers with `min-height: 0` and `overscroll-behavior: contain`, while the session footer remains pinned to the sidebar bottom. The stacked mobile layout keeps navigation reachable through deliberate horizontal overflow and preserves the main vertical scroll.
- Workspace areas promoted into navigation have dedicated routes and active states; settings actions preserve the current area after mutations, and store creation lands on the new store context route.
