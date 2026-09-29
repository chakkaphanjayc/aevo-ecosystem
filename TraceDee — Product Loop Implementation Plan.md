TraceDee — Product Loop Implementation Plan

1. เป้าหมายของการ Implement

สร้างระบบให้ Product Loop เกิดขึ้นจริงและวัดผลได้:

Discover → Trace It / Follow → Experience → Rate / Contribute → Expertise / Reputation → Create Better Traces → Discover Again

สิ่งที่ต้องระวังคือไม่เริ่มจาก gamification หรือ recommendation ที่ซับซ้อนเกินไป ระบบต้องเก็บ พฤติกรรมจริงและ contribution ที่มีคุณภาพ ให้ได้ก่อน แล้วค่อยใช้ข้อมูลนั้นพัฒนา Taste Match, Expertise และ Feed Ranking

2. หลักการพัฒนา

หนึ่ง action มีหนึ่งความหมาย — Save, Follow Trace, Follow Tracer, Complete และ Remix ต้องไม่ปนกัน

Event-first — ทุกขั้นของ loop ต้องสร้าง domain event ที่วัดและประมวลผลซ้ำได้

Derived score ไม่ใช่ source of truth — XP, Expertise, Reputation และ Taste Match คำนวณจากกิจกรรมต้นทางและ rebuild ได้

Explainable recommendation — ทุก item ใน feed ต้องมี reason_code

Quality before quantity — ป้องกัน spam/farming ตั้งแต่ schema และ workflow

Progressive delivery — เปิด feature ด้วย flag และเริ่มจาก deterministic ranking ก่อน ML

Privacy by default — location/visit history เป็น private เว้นแต่ผู้ใช้เลือกเผยแพร่

3. Product Loop และ Service Boundary

ขั้น

User action

ระบบที่รับผิดชอบ

Output สำคัญ

Discover

เปิด Explore/Map/Search

Discovery

ranked items + reason

Intent

Trace It, Follow, เปิดรายละเอียด

Saved/Social

intent signal

Plan

Follow Trace หรือ Remix

Trace

active journey/draft

Experience

Start, check stop, skip, complete

Journey

verified activity

Contribute

Rate, comment, post, edit Trace

Community

quality contribution

Recognition

คำนวณ EXP/Expertise/Reputation

Identity/Scoring

trusted profile signals

Rediscovery

feed/map ranking รอบถัดไป

Discovery

personalized results

ในช่วง MVP สามารถเป็น modular monolith ได้ แต่ให้แยกโมดูลและ ownership ชัดเจน ไม่ต้องแตก microservices ก่อนมี load หรือ team boundary จริง

4. Domain Model ขั้นต่ำ

Identity และ social

profiles

follows — follower → tracer

profile_topics — taste/topic affinity ที่คำนวณได้

profile_areas — area affinity และ expertise

profile_scores — level, total XP, reputation snapshot

Place และ Trace

places

place_categories

traces

trace_stops

trace_saves — Trace It

trace_follows — ผู้ใช้ตั้งใจใช้เส้นทาง

trace_remixes — source_trace_id, root_trace_id, revision/lineage

trace_completions

trace_ratings

Feed และ community

posts

post_attachments — MVP จำกัด primary object เป็น Place หรือ Trace

comment_threads

comments

comment_reactions

content_reports

notifications

Scoring และ recommendation

activity_events — append-only domain events

expertise_scores — profile × topic/area

taste_vectors หรือ taste_affinities — เริ่มจาก weighted tags ได้

content_quality_scores

feed_impressions

feed_interactions

recommendation_snapshots — optional cache/debugging

Constraints ที่ควรบังคับในฐานข้อมูล

unique save/follow/reaction ต่อ user และ target

trace_stops.position ไม่ซ้ำภายใน Trace

Trace rating หนึ่งรายการต่อ completion ที่มีสิทธิ์

Remix ห้ามอ้างกลับมาหาตัวเองและมี max lineage depth สำหรับ query safety

Comment reply มี depth สูงสุด 1 ใน product rule

soft delete สำหรับ user content ที่ต้องรองรับ moderation/audit

idempotency key สำหรับ create completion, rating, remix และ action ที่ retry ได้

5. Event Taxonomy

ใช้ชื่อ event แบบอดีตกาล และเก็บ event_id, actor_id, occurred_at, source, session_id, entity_type, entity_id, metadata, schema_version

Events หลัก

feed_item_impressed
feed_item_opened
place_saved
trace_saved
tracer_followed
trace_followed
trace_started
trace_stop_completed
trace_stop_skipped
trace_completed
trace_remixed
trace_rated
post_created
comment_created
comment_marked_helpful
content_reported

กฎสำคัญ:

Impression ต้องเกิดเมื่อ item เข้า viewport ตาม threshold ไม่ใช่แค่ API ส่งมา

Event mutation ต้องสร้างจากผลสำเร็จฝั่ง server ไม่ใช่จาก click อย่างเดียว

Event consumer ต้อง idempotent

ห้ามใส่ raw precise location ใน analytics event หากไม่จำเป็น

แยก product analytics event ออกจาก authoritative domain record

6. Vertical Slice Strategy

พัฒนาเป็น slice ที่เดิน loop ได้จริง ไม่พัฒนา frontend ทุกหน้าก่อน backend หรือสร้าง score ก่อนมี event

Slice A — Discover to Save

Explore/Map → เปิด Place/Trace → Trace It → Saved

Slice B — Save to Experience

Saved/Trace detail → Follow Trace → Start → Complete/Skip stops → Finish

Slice C — Experience to Contribution

Finish → Rate tags → Comment/Post → Creator notification

Slice D — Contribution to Recognition

Events → XP/Expertise/Reputation → Profile → ranking reason

Slice E — Recognition to Better Discover

Profile signals → For You ranking → impression/outcome measurement

7. Phase 0 — Foundation and Contracts

ระยะเวลาแนะนำ: 1–2 สัปดาห์

งาน

ทำ inventory routes, current components, map/query state, auth และ API contracts

กำหนด canonical IDs ของ Place, Trace, Post, Comment และ Profile

สร้าง migrations สำหรับแกน domain และ constraints

วาง outbox/event publishing pattern เพื่อไม่ให้ mutation สำเร็จแต่ event หาย

สร้าง feature flags: mixed_feed, trace_journey, comments_v2, expertise_v1, taste_ranking_v1

สร้าง seed data ที่มี Places, Traces, Stops, Profiles, Posts และ Comments เชื่อมกันจริง

กำหนด moderation states: visible, limited, under_review, removed

Deliverables

ERD และ migration ที่ review แล้ว

API/event contract version 1

realistic seed dataset

analytics dictionary

feature-flag rollout plan

Definition of done

Create/save/follow operations retry ด้วย idempotency key แล้วไม่เกิดข้อมูลซ้ำ

Event จาก mutation สำเร็จถูกส่งครบและ replay ได้

Permission tests ยืนยันว่าผู้ใช้แก้ไข content ของคนอื่นไม่ได้

8. Phase 1 — Explore and Trace Map Foundation

ระยะเวลาแนะนำ: 2–3 สัปดาห์

Backend/API

Unified discovery endpoint รับ mode, tab, bounds, filters, cursor

Response item เป็น discriminated union: place | trace | post | tracer

ทุก item มี rank_score, reason_code, reason_params, tracking_token

Cursor pagination ที่ stable และไม่ซ้ำเมื่อมี content ใหม่แทรก

Spatial query สำหรับ places และ trace start/coverage bounds

Cache query ที่ไม่ personalized มาก เช่น nearby/popular area

Frontend

Compact Explore header และ tabs: For you / Following / Nearby

FeedItemRenderer และ card primitives 4 ชนิด

Map split view บน desktop และ bottom sheet บน mobile

Places/Traces mode

Map/list selection synchronization

Search/filter state อยู่ใน URL และ central query state

stale-while-refresh, partial error, offline และ location-denied states

Ranking v0

ใช้ deterministic weighted rules:

score = freshness + distance relevance + followed-author boost + popularity quality + saved-topic affinity - repetition penalty - low-quality/spam penalty

เพิ่ม feed composition guardrail เช่น ไม่เกิน 2 items ชนิดเดียวติดกัน และควบคุม creator/category duplication

Definition of done

เปิด Explore แล้วเห็น actionable content ใน viewport แรก

Map pin/result card sync ทั้ง mouse, keyboard และ touch

Search request เก่าถูก cancel หรือ ignore

กลับจาก detail แล้ว Explore scroll และ Map state ยังอยู่

Impression/open/save events มี tracking token เชื่อมกันได้

9. Phase 2 — Trace Planning, Follow and Remix

ระยะเวลาแนะนำ: 2–3 สัปดาห์

Trace detail

Route map + timeline sync

stop notes, time, duration, transport และ estimated budget

actions: Trace It, Follow Trace, Remix

autosave draft และ conflict handling

source creator attribution ที่เห็นชัด

Follow Trace lifecycle

State machine:

planned → active → completed
├→ paused
└→ abandoned

Stop state: pending | completed | skipped

Start สร้าง journey instance แยกจากต้นฉบับ

การแก้ Trace ต้นฉบับภายหลังไม่เปลี่ยน active journey โดยไม่แจ้งผู้ใช้

ผู้ใช้เลือก update to latest revision ได้

completion ไม่บังคับครบ 100%; เก็บ completed/skipped ratio

Remix

Clone เป็น draft พร้อม source_trace_id และ root_trace_id

ผู้ใช้เพิ่ม/ลบ/สลับ stop และเปลี่ยน metadata ได้

Publish แล้วสร้าง lineage edge

Original creator ได้ attribution และ notification

ห้าม XP จากการ clone เฉย ๆ; contribution เริ่มเมื่อ remix ถูก publish/used และผ่าน quality threshold

Definition of done

Trace เดียวถูก Save, Follow และ Remix ได้โดย state ไม่ปนกัน

journey resume ข้าม device/session ได้

Remix lineage แสดง original และ direct parent ถูกต้อง

concurrent edit มี revision check และ recovery path

10. Phase 3 — Experience, Rating and Community

ระยะเวลาแนะนำ: 2–3 สัปดาห์

Completion และ verification

เริ่มจาก verification แบบไม่ intrusive:

user-confirmed stop

time consistency

optional coarse proximity เมื่อได้รับ permission

anomaly flags สำหรับ completion ที่เร็วหรือซ้ำผิดปกติ

ไม่ควรบังคับ GPS ตลอดเวลา และไม่แสดง visit history เป็น public โดยอัตโนมัติ

Rating

ให้ rating หลัง journey completion หรือ eligible visit

Overall rating + structured tags เช่น Worth it, Good pacing, Hidden gems

แยก rating ของ Trace ออกจาก rating ของ Place

แสดง aggregate เมื่อมีจำนวนขั้นต่ำเพื่อลด noise และ privacy leakage

Post และ comment

Post แนบ primary Place หรือ Trace ได้หนึ่งรายการ

Comment thread กลางสำหรับ Post, Trace และ Review

reply หนึ่งระดับ + mention

optimistic text comment พร้อม rollback/retry

edit/delete/report/helpful

notification aggregation เพื่อลด spam

Safety และ moderation

rate limit create/comment/reaction/report

duplicate-text และ burst heuristic

block/mute user

report queue พร้อม reason และ evidence snapshot

removed content ต้องไม่หายจาก moderator audit trail

Definition of done

เฉพาะผู้มีสิทธิ์จึง rate Trace ได้

comment retry ไม่สร้าง comment ซ้ำ

block/mute มีผลต่อ feed, comments และ notifications

creator ได้ notification แบบ deduplicated/aggregated

11. Phase 4 — XP, Expertise and Reputation

ระยะเวลาแนะนำ: 2 สัปดาห์

แยกสามระบบชัดเจน

Signal

ตอบคำถาม

ใช้ทำอะไร

XP

ผู้ใช้งานมีประสบการณ์รวมเท่าไร

progression ส่วนตัว

Expertise

เขารู้เรื่อง/พื้นที่ใด

trust และ discovery

Reputation

contribution เชื่อถือได้แค่ไหน

ranking/moderation weight

XP v1

ให้ provisional XP ก่อน แล้ว confirm หลังผ่าน anti-abuse window

complete a meaningful Trace

publish a Trace ที่ผ่าน minimum completeness

contribution ถูก mark helpful

คนอื่น complete Trace ของผู้สร้าง

explore category/area ใหม่แบบมี verified activity

กำหนด daily cap, diminishing returns และ reversal เมื่อ content ถูกลบจาก abuse

Expertise v1

คำนวณแยก Topic และ Area:

expertise = verified_depth + contribution_quality + downstream_usefulness + consistency + freshness - abuse_penalty

ไม่ให้ผู้ใช้ตั้ง Expert เอง แต่ให้เลือก interests เพื่อ cold start ได้

Reputation v1

พิจารณา helpful ratio, trace completion by others, rating confidence, report outcome และ account trust โดยไม่เปิดสูตรเต็มต่อสาธารณะ

Processing

incremental projection หลัง event

nightly reconciliation/rebuild

score version ในทุก snapshot

admin/debug view แสดง input และเหตุผลที่ score เปลี่ยน

Definition of done

replay events แล้วได้ score เดิมภายใน tolerance ที่กำหนด

score rollback ได้เมื่อ event ถูก invalidate

Profile อธิบาย expertise ด้วย evidence summary ไม่ใช่ตัวเลขลอย ๆ

ไม่มี action เดี่ยวที่ farm XP ได้ไม่จำกัด

12. Phase 5 — Taste Profile and Personalized Ranking

ระยะเวลาแนะนำ: 2–3 สัปดาห์หลังมีข้อมูลพอ

Cold start

onboarding เลือก 3–5 interests และพื้นที่

popular high-quality local content

follow recommended Tracers

exploration quota เพื่อไม่ล็อกผู้ใช้ใน filter bubble

Taste affinity v1

ใช้ weighted tags ก่อน vector/ML:

positive: save, follow, complete, high rating, dwell/open detail

negative: hide, repeated skip, quick back, low rating

weight สูงสุดให้ verified experience

decay signal เก่าอย่างเหมาะสม

Candidate generation

ดึง candidate จาก:

followed Tracers

similar taste cohort

matching topic/area

nearby quality content

remixes/lineage ที่เกี่ยวข้อง

fresh/new creator exploration

Ranking v1

final_score = taste_affinity + social_relevance + location/context + quality/confidence + freshness + exploration_bonus - repetition - seen/content-fatigue - risk penalty

ทุกผลลัพธ์ต้อง map ไปยังข้อความอธิบายได้ เช่น “เพราะคุณชอบกาแฟและบันทึกย่านอารีย์” ไม่แสดงเปอร์เซ็นต์ Taste Match จน calibration มีคุณภาพพอ

Evaluation

offline replay บน historical sessions

shadow ranking ก่อนเปิดจริง

rollout 5% → 25% → 50% → 100%

guardrails: hide/report rate, latency, creator concentration, category diversity

Definition of done

feed มี reason ที่ตรงกับ signal จริง

ranking timeout แล้ว fallback เป็น deterministic feed ได้

ผู้ใช้ reset/ปรับ interests และปิด personalization บางส่วนได้

ไม่มี creator/category ใดครอง feed เกิน guardrail ที่กำหนด

13. API Contract ที่ควรมี

GET /discovery/feed
GET /discovery/map
POST /traces/:id/save
DELETE /traces/:id/save
POST /traces/:id/follow
POST /traces/:id/remix
POST /journeys/:id/start
PATCH /journeys/:id/stops/:stopId
POST /journeys/:id/complete
POST /journeys/:id/rating
POST /posts
GET /threads/:id/comments
POST /threads/:id/comments
PATCH /comments/:id
DELETE /comments/:id
POST /comments/:id/helpful
GET /profiles/:id/expertise
GET /activity

Mutation response ต้องคืน authoritative state, version และ event correlation ID เมื่อมีประโยชน์ Frontend ไม่ควรประกอบ state สำเร็จเองจาก assumption

14. Frontend Architecture

Feature modules

features/discovery
features/map
features/traces
features/journeys
features/community
features/profiles
features/activity

State ownership

URL: tab, search, map bounds, filters, selected mode

server cache: feed pages, entity detail, comments, profile scores

local UI: drawers, bottom-sheet snap, hover/focus selection

durable draft: Trace/Post editor draft

optimistic mutation: save, follow, lightweight comment/reaction เท่านั้น

อย่าเก็บข้อมูล server ซ้ำใน global client store หาก query cache จัดการได้

Shared UX contracts

action pending ต่อ resource

mutation idempotency key

preserved input หลัง failure

stale data ยังใช้ได้ระหว่าง refresh

optimistic rollback และ reconciliation

focus restore สำหรับ drawer/dialog

live region สำหรับผลสำเร็จ/ล้มเหลวสำคัญ

15. Background Jobs

event-projector — อัปเดต counters และ projections

score-expertise — incremental + scheduled reconciliation

score-content-quality

build-feed-candidates

aggregate-notifications

moderation-precheck

refresh-place-status — ชั่วโมงเปิด/ปิดและข้อมูลที่เปลี่ยนได้

cleanup-idempotency-records

ทุก job ต้องมี retry policy, dead-letter handling, idempotency, metrics และ replay tooling

16. Observability

Technical metrics

feed/map p50, p95 latency

error และ partial-error rate

stale response/canceled request rate

job lag และ event processing delay

duplicate mutation prevented

cache hit rate

Product funnel

Feed impression
→ Detail open
→ Trace It / Follow
→ Start
→ Complete
→ Rate / Comment / Remix
→ Return discovery session

North-star candidate

Weekly meaningful traced experiences — จำนวน experience ที่เริ่มจาก discovery/follow และมี completion หรือ contribution ที่ผ่าน quality threshold

ไม่ใช้ page views, likes หรือ XP issued เป็น north-star

17. Test Strategy

Unit

state machines

eligibility/rating rules

score calculations และ caps

reason-code mapping

lineage validation

Integration

mutation + event outbox

idempotency และ concurrent writes

permission/policy tests

cursor pagination

event replay/reconciliation

End-to-end

Discover → Save → Saved

Trace detail → Follow → Start → Complete → Rate

Remix → Edit → Publish → Attribution

Post → Comment → Reply → Notification

Map pan → Search this area → Select pin/card

Offline/partial failure → Retry/reconcile

Block/mute/report impact

Non-functional

320 px และ 200% text zoom

keyboard/focus flow

reduced motion

slow network/race conditions

map performance เมื่อมี clusters และ route layer

load test feed, comment และ event consumers

18. Rollout และ Migration

เปิด schema/event capture ก่อน UI ใหม่

เปิด UI ใหม่กับ internal accounts และ seed data

เปิด mixed feed แบบ deterministic ให้ cohort เล็ก

เปิด Follow/Complete/Rate

รอข้อมูลและตรวจ abuse ก่อนเปิด XP/Expertise

Shadow personalized ranking

rollout ตาม cohort พร้อม kill switch

ระหว่าง migration ให้ dual-read หรือ adapter สำหรับ content เก่า แต่ควรมี canonical write path เดียว

19. แผน Sprint ตัวอย่าง 12 สัปดาห์

Sprint

Scope

ผลลัพธ์ที่ทดลองได้

1

schema, events, flags, seed, contracts

mutation และ event pipeline

2

Explore mixed feed + cards

Discover → Detail

3

Map split view + Places/Traces

Map search/selection

4

Trace detail + Save/Follow

Discover → Plan

5

Journey state machine + completion

Plan → Experience

6

Rating + comments + notifications

Experience → Contribute

7

Remix + lineage

Creator/community loop

8

XP/Expertise/Reputation v1

Contribution → Recognition

9

Taste affinity + candidate generation

signals → candidates

10

Personalized ranking shadow mode

compare rankers

11

abuse, moderation, accessibility, performance

release hardening

12

cohort rollout + funnel review

loop validation

หากทีมเล็ก ให้รวม Sprint 2–3 และเลื่อน personalization ไปหลัง release โดย MVP ที่ควรเปิดจริงคือ Sprint 1–7

20. Release Gate ของ Product Loop

ห้ามถือว่า feature เสร็จเพียงเพราะหน้า UI เปิดได้ แต่แต่ละขั้นต้องผ่าน gate:

Discover: impression และ reason ถูกต้อง

Intent: save/follow idempotent และ state ชัดเจน

Experience: journey resume และ completion เชื่อถือได้

Contribute: eligibility, moderation และ retry ครบ

Recognition: score อธิบาย/rebuild/rollback ได้

Rediscovery: ranking ใช้ signal จริง มี fallback และวัด outcome ได้

เมื่อครบ gate นี้ TraceDee จะไม่ได้มีเพียงชุด feature แต่มีวงจรข้อมูลและแรงจูงใจที่ทำให้ content, creator trust และ recommendation ดีขึ้นพร้อมกัน

21. Prompt สำหรับ Implement ต่อ

Implement the TraceDee product loop as vertical slices:
Discover → Save/Follow → Experience → Rate/Contribute → Expertise/Reputation → Better Discovery.

Start by inspecting the existing repository, routes, data access, authentication, map provider, component system, migrations, background jobs, tests, and feature-flag mechanism. Do not replace the stack.

Phase 0:

- Define canonical entities and database constraints for profiles, follows, places, traces, trace_stops, saves, trace_follows, journeys, journey_stops, completions, ratings, remixes, posts, comment_threads, comments, notifications, activity_events, expertise_scores, reputation snapshots, and feed tracking.
- Use idempotency keys for retryable mutations and an outbox/event pattern.
- Add realistic linked seed data and feature flags.

Then implement one complete vertical slice at a time:

1. Explore/Map → detail → Trace It.
2. Saved/Trace detail → Follow Trace → start/complete journey.
3. Completion → eligible rating/comment/post → creator notification.
4. Events → versioned XP/expertise/reputation projections.
5. Taste affinities/candidates → explainable personalized ranking.

Requirements:

- Keep Save, Follow Trace, Follow Tracer, Complete, and Remix as separate domain actions.
- Every ranked item must include reason_code, reason_params, and a tracking token.
- Preserve stale usable data during refresh/failure.
- Scope pending state by action/resource and prevent duplicate mutation.
- Cancel or ignore obsolete discovery requests.
- Keep map/list selection synchronized and preserve URL/search state.
- Make score projections replayable, reversible, versioned, and resistant to farming.
- Protect location privacy; precise visit history is private by default.
- Add moderation, block/mute/report, rate limits, and audit-safe soft deletion.
- Add unit, integration, end-to-end, permission, race-condition, offline, accessibility, and load tests appropriate to each slice.
- Deliver migrations, API contracts, components, jobs, tests, observability, rollout flags, and concise documentation.

Do not implement ML ranking first. Begin with deterministic explainable scoring, collect reliable events, run later ranking in shadow mode, and retain a deterministic fallback.

## 22. Implementation status — Phase 0 / first vertical slice

อัปเดต 22 กันยายน 2026:

- Delivered: `tracedee_*` foundation migration with feature flags, places,
  traces/stops, journey/community/score projections, moderation states,
  append-only activity events, transactional outbox, idempotency keys,
  service-role-only RPCs, RLS, and deterministic discovery feed.
- Delivered: Customer Gateway routes for TraceDee feed/detail, Save/Unsave,
  Follow/Unfollow Trace, and feed impression events. Mutation responses return
  authoritative state, state version, and event correlation ID.
- Delivered: Aevo Go `/traces` and `/traces/:traceSlug` routes with URL-owned
  feed state, TanStack Query loading/error/empty states, 50% viewport
  impression capture, keyboard-accessible gliding tabs, and dark optical glass
  presentation. Live mode does not invent Trace data.
- Delivered: Phase 2 Journey state machine and Gateway surface. A published
  trace revision can be copied into a private Journey, started, paused,
  resumed, updated stop-by-stop, and completed only after no pending stops
  remain and at least one stop is completed. Version conflicts and retryable
  actions are explicit.
- Delivered: Aevo Go trace detail now exposes sign-in-gated Journey start,
  private progress, stop completion/skip controls, completion eligibility, and
  recoverable error states without claiming success before server refresh.
- Delivered: Phase 3 rating slice. A completed Journey can submit one Trace
  rating with structured tags and optional review text through
  `POST /api/v1/public/tracedee/journeys/:journeyId/rating`. Eligibility,
  uniqueness, moderation status, idempotent replay, `trace_rated` activity,
  outbox insertion, and authoritative response state are enforced by the
  service-role-only RPC. Aevo Go reconciles the rating from the server and
  exposes pending, error, submitted, and under-review states.
- Delivered: Phase 3 contribution foundation. A completed Journey can create
  one-target Trace/Place posts, and the Gateway exposes comment-thread reads,
  depth-one comments, and content reports. Server rules enforce completed-
  Journey eligibility, target ownership, duplicate/burst guards, moderation
  status for link-like content, idempotent replay, notifications for visible
  contributions, and `post_created` / `comment_created` / `content_reported`
  events with transactional outbox rows. Aevo Go exposes the first
  contribution composer with explicit Trace/Place targeting and pending,
  visible, and under-review states.
- Delivered: Phase 3 community/moderation slice. Public Trace community reads
  now expose visible/limited posts and depth-one comments with helpful
  reactions. Reports capture an evidence snapshot, and the privileged Aevo
  Admin queue can review, limit, remove, restore, or dismiss content through a
  separate `content.moderate` platform permission. Moderation actions write a
  durable audit row, activity event, and outbox record atomically; public
  discovery excludes removed Trace content.
- Delivered: Phase 4 recognition foundation. A replayable deterministic
  projection rebuild computes versioned profile, expertise, taste-affinity,
  and content-quality rows from authoritative TraceDee data. It is exposed as
  a worker-safe service-role RPC plus `db:rebuild:tracedee`; profile expertise
  reads are available through a typed Gateway route. Taste affinity can feed
  the deterministic ranking with an explainable `TASTE_MATCH` reason, while
  the feature flag remains in SHADOW until cohort measurement.
- Delivered: Phase 4 replay/rollback foundation. Worker rebuilds now create a
  versioned projection run with before/after snapshots. Aevo Admin can inspect
  runs and idempotently rollback an applied run to its prior snapshot when an
  event is invalidated; rollback state, reason, audit, activity, and outbox are
  preserved.
- Delivered: TraceDee performance hardening. The performance migration adds
  covering indexes for the foreign-key access paths identified by Supabase's
  advisor, without changing the service-role-only Gateway/RPC security model.
- Delivered: reproducible `bun run db:seed:tracedee` fixture script. It requires
  an explicit existing `TRACEDEE_SEED_USER_ID` and creates linked places,
  traces, and stops only when invoked intentionally.
- Delivered: completion verification slice. Journey completion can optionally
  submit client time and coarse location evidence; the server stores only
  verification status and summary, flags timing/location anomalies, and keeps
  precise visit history private.
- Delivered: community safety and notification controls. Block/mute affects
  feed, posts, comments, and notifications; notifications aggregate repeated
  trace/thread events; authenticated relation/read mutations are idempotent.
- Delivered: content lifecycle slice. Owners can edit with an expected
  timestamp/revision boundary or soft-delete posts/comments; server-side
  mention parsing creates notification signals while preserving moderation
  history.
- Delivered: remix lineage slice. A published Trace can be cloned into a
  private draft, edited through revision-checked metadata/stops APIs, then
  published with a bounded source/root lineage edge, attribution event, and
  creator notification. The customer detail UI exposes lineage and draft /
  publish actions; cloning alone does not award XP.
- Delivered: Follow Tracer slice. Tracer following has its own idempotent
  mutation, activity event, notification, follower count, and detail UI state;
  it is never inferred from Follow Trace.
- Delivered: bounded XP controls. Authoritative completion/content/rating
  events produce provisional awards with a 24-hour anti-abuse window, UTC
  daily cap, diminishing returns, replay-safe reconciliation, and reversal
  when source state is invalidated. XP is included in the worker projection
  run after the deterministic score rebuild.
- Delivered: richer Remix place-picker/editor UX. Customer Gateway exposes a
  public moderated place search and owner-only draft read; Aevo Go can edit
  title/description/area/tags, stop order, notes, duration, transport, and
  budget through the existing revision-checked mutation. Dirty drafts cannot
  publish and revision conflicts refetch the authoritative draft.
- Delivered: reputation evidence and weighting foundation. Projection rebuilds
  persist versioned helpfulness, downstream completion, rating confidence,
  moderation outcome, and account-trust inputs with rationale evidence; the
  privileged Aevo Admin surface can inspect those inputs without exposing them
  to customers. The personalized scorer consumes a bounded reputation signal
  server-side while customer reason copy stays topic/area based.
- Delivered: measured personalization boundary. Customer preferences support
  three-to-five interests, reset/opt-out, and idempotent feed hide/quick-back
  outcomes. Feed reads expose matched topics/areas and deterministic vs
  personalized scores without showing a taste percentage. Ranking evaluations
  and guardrail reports cover creator concentration, category diversity,
  hide/quick-back rates, and latency.
- Delivered: audited taste-ranking rollout controls. `taste_ranking_v1` is
  currently `SHADOW` with deterministic ordering still served. Aevo Admin can
  move through `LIVE` cohort steps `5% → 25% → 50% → 100%`, with kill-switch
  rollback to `0%`, guardrail visibility, and a required change reason. The
  flag remains in SHADOW until real evaluation volume passes the operational
  review; this is an intentional release gate, not a missing UI slice.

Release gate currently passed: schema/event/idempotency contract,
Discover → Detail → Save/Follow, Save/Follow → start Journey → stop state
→ completion with verification, completion → rating/contribution/community
moderation, safety/lifecycle controls, remix lineage, and deterministic
recognition projections with replay/rollback/XP reconciliation validation,
remix editing, reputation evidence, preference opt-out, and ranking
measurement/control surfaces. The remaining production gate is deliberately
operational: review a meaningful SHADOW evaluation window and guardrail report,
then promote only a 5% LIVE cohort; if any guardrail fails, return to 0% and
keep deterministic ordering.

## Aevo Go customer experience delivery — 22 September 2026

- Delivered: the `/` Explore surface now uses a mixed, typed discovery feed
  with Place, Trace, Post, and Tracer cards, explainable recommendation
  reasons, URL-owned tabs/search/area context, quick intents, and explicit
  live/demo data boundaries.
- Delivered: Trace It, Follow, Remix, hide, share, and comment entry points
  now expose pending/error/retry behavior; live mutations use existing typed
  APIs and idempotency keys, while demo-only interactions are clearly marked.
- Delivered: a shared responsive comment drawer/sheet supports relevant vs
  newest sorting, one-level replies, image selection, optimistic rollback, and
  accessible close/keyboard behavior. Explore live feed comments remain
  intentionally read-only until the feed contract supplies a thread id.
- Delivered: Explore navigation now exposes Trace Map and a guarded Create
  entry point without presenting an unpublished draft as server state.

The next customer-facing slice is the full Trace detail/community handoff for
Explore cards, followed by live Place/Trace mixed-feed projections and route
geometry when those fields are available from the public contract.
