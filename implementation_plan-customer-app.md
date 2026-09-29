# Aevocado Go — Customer App Implementation Plan

สถานะเอกสาร: Phase 1 foundation และ Phase 2 route/design-system shell เสร็จในระดับ app core; Phase 3 discovery/search/map และ Phase 4–6 vertical slices เชื่อม Gateway แล้ว รวม store profile/favorites, server slot hold, reservation reconciliation, cart pricing และ hosted-payment handoff. เหลือ production gates ที่ต้องใช้ provider/policy/configuration จริง รวมถึง Phase 7–8 ที่ยังเป็นแผนถัดไป
แหล่งอ้างอิงหลัก: `aevocado_implementation.md`

เอกสารนี้แทนแผนเดิมที่วาง `aevo-go` เป็น Next.js connectivity app โดยกำหนดให้
`aevo-go` เป็น shared React application layer สำหรับ Web/PWA และ Capacitor
ในอนาคตจาก source เดียว

## Executive decision

`aevo-go` ใช้:

- React + TypeScript strict mode
- Vite เป็น build/runtime สำหรับ web และ static native bundle
- React Router Data Mode เป็น routing contract
- TanStack Query เป็น server-state cache
- Zustand เฉพาะ ephemeral UI state ข้าม route
- Zod เป็น boundary validation
- CSS custom-property design tokens และ Tailwind CSS foundation
- Platform bridge แยก Web/Capacitor/Test implementation

ไม่ใช้ Next.js เป็น application core ของ Go เพราะ customer experience มี
interaction หนักที่ search, map, booking, cart, order tracking และ profile
ซึ่งต้องรันบน Web และ Capacitor ด้วย application layer เดียวกัน

## Current implementation boundary

```text
Browser / PWA
      ↓
Aevo Go React application :4324
      ├── React Router route contract
      ├── Design tokens + responsive shell
      ├── TanStack Query / typed API client
      └── Platform bridge
      ↓
Customer Gateway / Aevocado Core API
      ↓
PostgreSQL / Supabase ผ่าน trusted backend เท่านั้น
```

ใน local development Vite proxy `/health`, `/ready` และ `/api/*` ไปที่
`VITE_API_BASE_URL` หรือ `http://localhost:4000` เป็นค่าเริ่มต้น ส่วน
production ต้องใช้ Customer Gateway origin ที่มี CORS, auth และ security
policy สำหรับ Go โดยเฉพาะ

## Phase 0 — Connectivity spike (archived)

สิ่งที่ทำไว้ก่อน migration:

- ตรวจ `/health` และ `/ready` ของ Hub Gateway
- แสดง `connected`, `degraded`, `unavailable`
- ป้องกัน Supabase secret ไม่ให้เข้า frontend
- ตรวจ responsive และ accessibility ของหน้าเดิม

หลังเปลี่ยนเป็น Vite ไม่มี Next server route `/api/connection` อีกต่อไป
เพราะ app เป็น static/client-capable bundle การตรวจ connection อยู่ใน typed
client query และใช้ proxy/BFF ตาม deployment แทน

## Phase 1 — Foundation

### Delivered

- standalone `aevo-go` แยกจาก Hub workspace
- ADR React/Vite/Capacitor และ API gap list อยู่ใน `aevo-go/docs/`
- Vite React build/dev/preview pipeline ที่ port `4324`
- strict TypeScript project references และ `@/*` alias
- React Router route skeleton สำหรับ product URL contract
- TanStack Query provider และ connection query
- typed API transport/error normalization ผ่าน `src/lib/api-client.ts`
- typed discovery/store/availability contracts ผ่าน `src/contracts/customer.ts`
- environment validation ผ่าน `VITE_API_BASE_URL`
- Web/Test platform bridge และ Capacitor platform boundary
- PWA manifest และ `capacitor.config.ts`
- Vite proxy สำหรับ local Gateway
- migration และ RLS สำหรับ `customer_store_profiles` ที่ opt-in public projection
- Gateway public discovery/search/store detail และ authenticated Hub profile-management boundary
- Vitest + jsdom + connection/platform adapter tests

### Exit criteria

- `bun run typecheck`, `bun run test` และ `bun run build` ผ่าน
- app เปิดบน browser ด้วย `bun run dev:go`
- Gateway unavailable/readiness failure แสดง generic recoverable state
- ไม่มี service-role/Supabase credential ใน bundle หรือ client state
- platform capability ที่ยังไม่รองรับคืน fallback/error ที่ UI เข้าใจได้

## Phase 2 — Design system and navigation

### Delivered

- semantic color, spacing, radius, elevation และ motion tokens
- Dark Flat + Optical Colorless Liquid Glass เป็น default พร้อม neutral flat light variant และ user toggle
- safe-area shell สำหรับ browser และ Capacitor
- floating bottom navigation บน mobile และ responsive rail บน desktop
- Explore, Map, Saved, Activity และ My Page destinations
- route loading progress, error recovery, skip link และ live regions
- touch target ขั้นต่ำ 44px, focus states และ reduced-motion behavior
- route skeleton สำหรับ Store detail, Booking, Menu, Cart, Checkout,
  Profile/Level/Quests/Coupons และ Auth callback
- demo fixtures แยกจาก API authority; ยังไม่ทำ mutation ปลอม

### Exit criteria

- direct URL และ browser back ทำงานตาม route contract
- navigation ไม่บัง content หรือ bottom safe area
- route มี empty/loading/error/offline หรือ pending explanation ตามความเสี่ยง
- Thai/English label และ narrow viewport ไม่ overflow
- component states ผ่าน targeted accessibility audit

### Current vertical-slice additions

- IndexedDB repository สำหรับ recent search, viewed stores, guest favorites,
  cart draft, local reservation snapshot และ opaque order tracking reference
- Capacitor adapters สำหรับ geolocation, haptics, share, push permission/
  registration, Preferences และ native secure storage
- Mapbox GL ถูก lazy-load เฉพาะเมื่อมี `VITE_MAPBOX_TOKEN`; ไม่มี token หรือ
  provider error จะเห็น marker/list fallback ที่เข้าถึงได้
- Booking live flow เลือก server availability, validate details ด้วย Zod,
  ส่ง `Idempotency-Key` เดิมเมื่อ outcome ไม่ชัดเจน และบันทึก reservation
  snapshot โดยไม่สร้าง success ใน demo mode
- Menu live flow ตรวจ variant/modifier requirements ก่อนสร้าง cart line
- Checkout live flow ส่ง public order route แบบ idempotent, เก็บ tracking
  token และเปิด Activity polling; draft total ไม่ถูกใช้เป็น business authority

## Route contract

```text
/
/search?q=&category=&area=
/map?bbox=&category=&date=&party=
/saved
/activity
/activity/reservations/:reservationId
/activity/orders/:orderId
/stores/:storeSlug
/stores/:storeSlug/booking
/stores/:storeSlug/menu
/cart
/checkout
/profile
/profile/level
/profile/quests
/profile/coupons
/auth/callback
```

Filter ที่ต้องแชร์หรือ restore ได้อยู่ใน URL; server state จะอยู่ใน TanStack
Query และ business truth จะอยู่ที่ Customer Gateway ไม่ mirror เข้า Zustand

## Phase 3 — Explore, search and map

ทำแล้วใน vertical slice ปัจจุบัน:

- `GET /api/v1/public/discovery` และ `/search` พร้อม q/category/area/cursor/limit
- `GET /api/v1/public/stores/:storeSlug` พร้อม store code สำหรับ catalog handoff
- `PUT /api/v1/hub/stores/:storeId/customer-profile` สำหรับ tenant operator ที่มี permission
- `aevo-go` live mode ใช้ typed discovery/store reads เป็นค่าเริ่มต้น; demo mode เป็น opt-in สำหรับงาน UI shell เท่านั้น
- public projection แยกจากข้อมูล private และไม่เปิด anonymous Data API access
- Admin/Hub เป็นแหล่งข้อมูลจริงของ customer projection, catalog และ booking configuration; ไม่มีการสร้าง mockup record ใน Go

ทำเพิ่มใน Phase 3 รอบนี้:

- URL `bbox` เก็บ viewport ล่าสุดหลังผู้ใช้ขยับแผนที่ และปุ่ม Search this area ส่ง bounds ไป Gateway
- Gateway validate `bbox` และ filter จากพิกัดใน public store projection ฝั่ง server
- Mapbox GeoJSON source ใช้ clustering, cluster expansion และ selected-place layer โดยยังมี list fallback เสมอ
- TanStack Query ส่ง `AbortSignal` ให้ discovery request เพื่อยกเลิกผลลัพธ์เก่าเมื่อ query/viewport เปลี่ยน

ลำดับถัดไปของ Phase 3:

- search suggestion แสดง store/category/area และผลลัพธ์ใช้ server cursor pagination + facet metadata
- sync marker กับ selected-place preview/bottom-sheet behavior และทดสอบ gesture/cluster บน device จริง
- Near me ส่งพิกัดจริงเป็น server `bbox` radius จำกัด; ยังต้องล็อก consent/retention policy ก่อน production

## Phase 4 — Store detail and saved

- public store projection พร้อม venue handoff, hero/media gallery, address/timezone,
  opening hours, facilities และ policy summary จาก Customer Gateway
- guest local favorite intent, viewed-store history และ local snapshot สำหรับ
  store ที่ไม่อยู่ใน live response
- authenticated favorites ใช้ server read/write พร้อม optimistic UI rollback และ
  guest-to-member local favorite merge เมื่อมี session
- ยังเหลือ filter ใน Saved และ device/deep-link parity สำหรับ release hardening

## Phase 5 — Booking

- service/resource → date → party/duration → slot → details → review → confirm
  flow อยู่ใน `aevo-go/src/pages.tsx`
- server-derived availability, explicit timezone, local opening hours และ server-time contract
- party-size-aware slot filtering, 10-minute server slot hold, expiry countdown และ
  server-side overlap/capacity checks
- `Idempotency-Key` สำหรับ hold/confirm, same-key replay และ public opaque tracking token
- public reservation read endpoint, Activity polling/retry และ local reservation snapshot
- ยังเหลือ cancellation/refund policy, calendar/reminder action และ push deep link

## Phase 6 — Ordering and payment

- Dine-in/Takeaway และ public catalog/modifier contract
- cart draft ผ่าน IndexedDB repository abstraction และ variant-aware line key
- live order submission ผ่าน public Gateway route แบบ idempotent; server
  `create_order` เป็นผู้ derive/reprice ราคาและตรวจ catalog
- order tracking token เก็บ local และ Activity refresh/polling แสดง server
  status
- explicit cart-pricing endpoint คืน currency/minor-unit line breakdown,
  pricing version และ server time; Checkout block เมื่อ reprice ไม่ผ่าน
- hosted/provider payment handoff ส่ง order total จาก trusted server และไม่รับ
  card data ใน Go; Stripe adapter และ webhook source-of-truth/retry path ต่อแล้ว
- tax/discount/coupon/policy fields อยู่ใน contract แล้ว แต่ค่าปัจจุบันเป็น zero/
  extension hook จนกว่าจะกำหนด policy จริง
- ยังเหลือ provider credentials, payment E2E และ kill/relaunch recovery บน device จริง

## Phase 7 — Profile, loyalty and quests

- customer identity, preferences, notification settings และ logout
- tier/EXP read model จาก append-only ledger
- badges, quests และ coupon wallet จาก versioned server configuration
- source event idempotency, anti-abuse และ audit trail

## Phase 8 — Native hardening and launch

- เพิ่ม `apps/go-native` หรือ native project boundary เมื่อ signing workflow พร้อม
- app/deep links, push lifecycle และ secure credential storage
- iOS/Android safe area, back gesture, keyboard resize และ cold-start recovery
- privacy copy/manifests, crash/performance monitoring และ phased rollout

## Security gates

- client เป็น untrusted ทั้ง Web และ Capacitor
- ห้ามฝัง `SUPABASE_SECRET_KEY` หรือ service-role key ใน bundle
- auth ใช้ server-derived relationship ไม่อ่าน `user_metadata` เป็น permission
- API ตรวจ identity, organization/store, price, availability, entitlement,
  coupon, payment และ idempotency ทุก mutation
- token ห้ามอยู่ใน `localStorage`, Preferences, URL หรือ log
- RLS เปิดทุก exposed table และ policy ต้องมีทั้ง `USING`/`WITH CHECK`
- public projection ต้องไม่เปิดเผย staff/internal/PII เกินความจำเป็น
- feature access อ่านจาก entitlement resolver ไม่อ่าน plan ตรงใน frontend
- location/push ขอ permission เมื่อเห็นคุณค่าและมี fallback ที่ไม่ block

## Testing and release gates

### Current commands

```bash
bun install
bun run typecheck
bun run test
bun run build
bun run dev
```

### Required next coverage

- unit: URL/filter serialization, API error normalization, platform adapter
- component: loading/empty/error/pending, keyboard, focus, Thai/English length
- contract: generated client กับ Customer Gateway schema
- integration: RLS/IDOR, booking concurrency, slot expiry, idempotency
- web E2E: Explore → Store → Booking และ Explore → Menu → Cart → Checkout
- native smoke: safe area, back, deep link, push, secure session, relaunch

## Implementation log

- [x] แยก `aevo-go` เป็น standalone app
- [x] เปลี่ยน core จาก Next.js เป็น React + Vite
- [x] เพิ่ม React Router route contract
- [x] เพิ่ม TanStack Query, typed API client และ environment validation
- [x] เพิ่ม typed discovery/store/availability contract และ cursor/error shape
- [x] เพิ่ม Zustand UI state และ dark/neutral light/dark semantic tokens
- [x] กำหนด Aevo Go UI theme เป็น Dark Flat + Optical Colorless Liquid Glass และ sync rule ใน ux-ui skill
- [x] ตัด gradient/exterior glow และเพิ่ม shared gliding glass indicator ใน tabs/filters
- [x] เพิ่ม Web/Test/Capacitor platform bridge boundary
- [x] เพิ่ม PWA manifest และ Capacitor config
- [x] เพิ่ม responsive app shell, floating navigation และ route skeleton
- [x] เพิ่ม Vitest tests สำหรับ Gateway status mapping, API contract และ platform storage contract
- [x] เพิ่ม IndexedDB/local memory repository และ native Preferences boundary
- [x] เพิ่ม Capacitor geolocation, haptics, share, push และ secure-storage adapter
- [x] เพิ่ม lazy Mapbox provider พร้อม accessible marker/list fallback
- [x] เพิ่ม live booking/order vertical slices พร้อม same-key idempotency recovery
- [x] เพิ่ม catalog variant/modifier validation และ cart draft recovery
- [x] แก้ public store projection ให้ส่ง `venueSlug` เมื่อมี active venue
- [x] เพิ่ม typed adapters สำหรับ canonical public catalog และ venue availability
- [x] เพิ่ม typed public order/tracking adapter พร้อม idempotency header boundary
- [x] เพิ่ม live/demo data mode guard และแสดง server-derived menu/slot states
- [x] เพิ่ม guest saved intent แบบ local-only ที่ sync ข้าม route และ reload ได้
- [x] เพิ่ม map URL category filter, list fallback และ user-initiated location bridge
- [x] เพิ่ม cart draft local repository, quantity controls และ checkout handoff guardrail
- [x] เพิ่ม `customer_store_profiles` migration/RLS และ public discovery/search/store Gateway façade
- [x] ต่อ `aevo-go` live mode กับ typed discovery/store reads โดย live เป็น default และ demo เป็น explicit opt-in
- [x] เพิ่ม map viewport `bbox` ใน URL, server-side bounds validation/filter และ Search this area
- [x] เพิ่ม Mapbox source clustering, cluster expansion และ AbortSignal cancellation สำหรับ discovery reads
- [x] ปรับเอกสารให้สอดคล้องกับ `aevocado_implementation.md`
- [x] ปรับ `aevo-go` ตาม Web refinement: desktop global header, mobile safe-area bottom nav, focus/skeleton states และ adaptive content tokens
- [x] เพิ่ม map preview marker/selected-place sync พร้อม list fallback และ store media/profile signal composition
- [x] เพิ่ม public `imageUrl` mapping เพื่อให้ store card/detail ใช้ media จริงเมื่อ Gateway ส่งมา โดยไม่สร้างรูปปลอม
- [x] ทำ server-side booking `Idempotency-Key` persistence/replay ผ่าน database RPC และ Gateway error mapping
- [x] เติม normalized store media/facilities/policy/hours, server facet metadata และ cursor pagination contract
- [x] ทำ Near me ด้วยพิกัดจริง + bounded `bbox`, live search suggestions และ selected-place preview/list fallback
- [x] ทำ slot hold 10 นาที, server-time countdown, party-size/capacity checks และ public reservation read/polling
- [x] ทำ authoritative cart pricing, hosted payment session contract, Stripe adapter และ webhook payment reconciliation path
- [ ] ทำ Map technical spike และ list fallback บน device จริง
- [ ] ล็อก authentication/PKCE/secure-storage strategy
- [ ] เพิ่ม Capacitor iOS/Android project และ native smoke tests

## Verification evidence

- `aevo-go bun run typecheck` ผ่าน
- `aevo-go bun run test` ผ่าน 32 tests รวม discovery bbox serialization, public adapters,
  booking hold/confirm, cart pricing/payment handoff และ cart/local repository
- `aevo-go bun run build` ผ่านด้วย Vite และสร้าง `dist/`; Mapbox GL ยังคงเป็น lazy chunk ตาม design
- `aevo-hub bun run build:gateway` ผ่านหลังเพิ่ม discovery facets, booking hold/read,
  cart pricing, hosted payment handoff และ webhook reconciliation
- root `aevo-hub bun run typecheck` ผ่านหลัง workspace dependency ของ `packages/design-system` พร้อมใช้งาน
- `aevo-hub bun test` ต้องรันพร้อม Gateway/Web integration services; ไม่ถือว่าเป็น local unit-test pass เมื่อ services ไม่ได้เปิด
- migration ถูก apply สำเร็จใน connected Supabase database และตรวจ RLS/policies/table columns แบบ read-only แล้ว
- `GET /api/v1/public/discovery` และ `/search` ตอบ `{ data, nextCursor, facets }` ได้จริงเมื่อยังไม่มี enabled profile
- public booking ที่ไม่มี `Idempotency-Key` ตอบ `422 BOOKING_VALIDATION_ERROR` และ invalid resource ถูกปฏิเสธโดย server contract
- runtime Gateway ตรวจ health, availability/timezone conversion, hold/replay, held-slot
  blocking, confirm/replay, public reservation read และ invalid cart/payment error paths แล้ว
- browser runtime และ accessibility audit ต้องรันซ้ำหลังเปิด dev server; device Mapbox/Capacitor
  smoke ยังเป็น release gate
- ยังไม่มี claim ว่า payment production-ready จนกว่าจะเติม Stripe secrets, tax/coupon/policy
  rules และ payment/order E2E kill-relaunch tests
