Aevocado Go — Web & Capacitor Implementation Plan

สถานะเอกสาร: Design contract adopted; Web/PWA baseline and live customer vertical slices implemented in `aevo-go`, with native/release gates explicitly tracked below
แพลตฟอร์ม: Aevocado Go
เป้าหมาย: สร้าง customer application จาก React codebase เดียว ให้ทำงานได้ดีทั้ง Web/PWA และ Native iOS/Android ผ่าน Capacitor
เอกสารที่เกี่ยวข้อง: Aevocado-Framework-Modernization-Plan.md

1. Executive decision

Aevocado Go จะใช้ React + TypeScript + Vite + React Router เป็น application core และสร้างผลลัพธ์สองช่องทางจาก source เดียว:

Shared React application
├── Web build → CDN/edge hosting + PWA
└── Native web build → Capacitor → iOS / Android

ส่วน public landing, SEO page, custom-domain storefront และ QR resolver ที่มีอยู่ในแผนหลักยังคงอยู่ใน go-public (Astro/SSR) ได้ แล้วส่งผู้ใช้เข้า flow ของ go-app โดยใช้ URL contract เดียวกัน

ไม่เลือก Next.js เป็น application core ของ Go ในระยะนี้ เพราะ:

Native shell ต้องใช้ static/client-capable build อยู่ดี

Go มี Aevocado Core API แยกเป็น trusted backend อยู่แล้ว

Map, cart, booking, order tracking และ profile เป็น client-heavy interaction

React + Vite ทำให้ Web/Capacitor parity, mocking native plugins และ build pipeline ตรงไปตรงมากว่า

ป้องกันการมีสอง data-loading model ระหว่าง server-rendered Web กับ native bundle

Next.js ไม่ถูกห้ามใช้ในระบบอื่น แต่ไม่ใช่ default ของ go-app นี้

2. Product scope

2.1 MVP

Explore และ universal search

Category/area discovery

Map search พร้อม Search this area

Store detail และ media gallery

Favorite/save

Availability search และ booking

Menu/service catalog

Dine-in / Takeaway cart

Checkout และ payment handoff

Reservation/order history และ status

Customer profile

Push notification foundation

Web/PWA และ Capacitor iOS/Android จาก shared application layer

2.2 Post-MVP

Membership tier และ EXP ledger

Badge progression

Daily/weekly quest

Coupon wallet และ auto-apply suggestion

Reviews พร้อมรูปภาพ

Personalized recommendations

Waitlist/queue

Universal/App Links และ deferred deep-link recovery แบบเต็มรูปแบบ

2.3 Non-goals ในรอบนี้

ไม่สร้าง Local Store Hub

ไม่ทำ native UI แยกด้วย Swift/Kotlin

ไม่ให้ client คำนวณราคา, reward, entitlement หรือ booking availability เป็น authority

ไม่รับประกัน booking/order mutation ขณะ offline

ไม่สร้าง social feed หรือ user-generated content moderation system เต็มรูปแบบใน MVP

ไม่คัดลอก visual identity หรือ asset ของ Tabelog; ใช้ภาพเป็น reference ด้าน information hierarchy และ interaction pattern เท่านั้น

3. Target architecture

Customer
├── Browser / PWA
└── iOS / Android (Capacitor)
│
▼
Aevocado Go application shell
├── React Router
├── Design system
├── TanStack Query
├── Zustand UI stores
├── Platform adapters
└── Local persistence
│
▼
Aevocado Customer Gateway / Core API
├── Search and discovery
├── Catalog and availability
├── Booking and order orchestration
├── Payment intent
├── Customer identity
├── Loyalty/quest ledger
└── Notification registration
│
▼
PostgreSQL / Supabase
├── RLS and tenant isolation
├── Transactional records
├── Realtime where justified
└── Storage for merchant/user media

Trust boundaries

Web/Native client เป็น untrusted client

API ตรวจ identity, tenant/store, price, availability, coupon, payment และ idempotency ทุก mutation

Publishable/anonymous client key ใช้ได้เฉพาะ endpoint/table ที่มี RLS ถูกต้อง

ห้ามฝัง service-role/secret key ใน Web หรือ Capacitor bundle

Authorization ใช้ server-derived relationship; ห้ามใช้ user_metadata เป็น permission source

Reward/EXP ใช้ append-only ledger หรือ server-owned transaction ไม่เพิ่มจาก client โดยตรง

4. Monorepo structure

apps/
├── go-public/ # Astro/SSR: SEO, QR and custom-domain entry
├── go-web/ # Web/PWA composition and deployment
└── go-native/ # Capacitor config, ios/, android/

packages/
├── go-app/ # Routes, screens and application composition
├── go-ui/ # Go-specific composed UI
├── design-system/ # Tokens and primitives shared across Aevocado
├── api-contract/ # Schemas/types generated or shared with API
├── api-client/ # Transport, auth, retry and error normalization
├── auth-client/ # Guest/customer auth abstraction
├── customer-domain/
├── discovery-domain/
├── booking-domain/
├── order-domain/
├── loyalty-domain/
├── local-repository/ # Recent search, drafts and cache metadata
├── platform-bridge/ # Web/Capacitor ports
├── analytics/
└── test-utils/

go-web และ go-native ต้องเป็น composition shells ขนาดเล็ก ห้าม duplicate screen หรือ business logic

Dependency direction

go-web / go-native
↓
go-app
↙ ↓ ↘
go-ui domains platform-bridge
↘ ↓ ↙
api-contract / shared utilities

Domain packages ห้าม import React, Capacitor, browser globals หรือ native plugin โดยตรง

5. Standard technology stack

Concern

Decision

UI runtime

React + TypeScript strict mode

Build

Vite

Routing

React Router Data Mode

Styling

Tailwind CSS + CSS custom-property design tokens

Server state

TanStack Query

UI state

Zustand เฉพาะ cross-route ephemeral state

Forms

React Hook Form + Zod

Motion

Motion/Framer Motion สำหรับ coordinated transitions; CSS สำหรับ micro-interaction

Bottom sheet

Accessible dialog primitive + Vaul หรือ implementation ที่ผ่าน mobile/keyboard tests

Map

Mapbox GL JS เป็น default; adapter เปิดทางเปลี่ยน provider

Web persistence

IndexedDB ผ่าน repository abstraction

Native structured data

SQLite เมื่อมีข้อมูลจำนวนมาก/ต้อง query; ไม่ใช้ Preferences เป็น database

Lightweight preferences

Capacitor Preferences สำหรับ locale, onboarding และ non-secret flags

Secret storage

Keychain/Keystore ผ่าน audited secure-storage adapter

Native runtime

Capacitor

Testing

Vitest, Testing Library, MSW, Playwright, native smoke tests

Component docs

Storybook

Observability

Error reporting + web vitals + app/version/platform tags

6. State ownership model

State

Owner

ตัวอย่าง

URL state

React Router/search params

query, map bounds, category, date, party size

Server cache

TanStack Query

store, availability, reservation, order status

Form state

React Hook Form

booking form, checkout, review

Ephemeral UI

Local state/Zustand

sheet snap point, transient filters, active media index

Durable local data

Repository

recent search, cart draft, last viewed, pending deep link

Trusted business state

Core API/PostgreSQL

price, stock, slot, order, payment, EXP, coupon

กฎสำคัญ:

อย่า mirror TanStack Query data เข้า Zustand

Filter ที่ควรแชร์/refresh ได้ต้องอยู่ใน URL

Cart มี local draft เพื่อ recovery แต่ checkout ต้อง reprice/revalidate จาก server

Mutation ที่ไม่ปลอดภัยต่อการทำซ้ำต้องส่ง Idempotency-Key

Timeout ไม่ได้แปลว่า operation ล้มเหลว ต้อง reconcile status ก่อน retry

7. Platform bridge

สร้าง interface กลางและเลือก implementation ตอน bootstrap:

export interface PlatformBridge {
readonly platform: 'web' | 'ios' | 'android';
getCurrentPosition(): Promise<GeoPoint>;
requestLocationPermission(): Promise<PermissionState>;
haptic(kind: 'selection' | 'success' | 'warning'): Promise<void>;
share(payload: SharePayload): Promise<void>;
openExternalUrl(url: string): Promise<void>;
getPushPermission(): Promise<PermissionState>;
requestPushPermission(): Promise<PermissionState>;
registerPush(): Promise<PushRegistration | null>;
getSecure(key: SecureKey): Promise<string | null>;
setSecure(key: SecureKey, value: string): Promise<void>;
removeSecure(key: SecureKey): Promise<void>;
}

Implementations:

WebPlatformBridge: Web APIs, service worker, Web Share fallback, browser permission

CapacitorPlatformBridge: Geolocation, Haptics, Push, Share, App/Browser และ secure storage

TestPlatformBridge: deterministic fake สำหรับ unit/component test

ทุก plugin call ต้องมี unsupported, denied, unavailable และ error path ที่ UI เข้าใจได้

8. Routing and deep-link contract

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

หลักการ:

Web URL ทุกหน้าสำคัญต้องเปิดตรงและ refresh ได้

Universal Link/App Link ใช้ HTTPS URL เดียวกัน

ถ้าแอปติดตั้ง ให้เปิด native route; ถ้าไม่ติดตั้ง ให้เปิด Web

QR/deep link เก็บ returnTo แบบ allowlist และ restore หลัง sign-in

Native back gesture และ browser back ต้องให้ผลทาง navigation สอดคล้องกัน

Bottom sheet state ที่เป็นรายละเอียดชั่วคราวใช้ nested route หรือ URL stateเมื่อจำเป็นต่อ share/back behavior

9. Authentication and session

Web

ใช้ secure HttpOnly cookie ผ่าน Customer Gateway/BFF เมื่อ architecture รองรับ

CSRF protection สำหรับ cookie-authenticated mutation

Guest session upgrade เป็น customer account โดยรักษา cart/favorite ที่อนุญาต

Capacitor

ใช้ system browser สำหรับ OAuth/OIDC และ callback ผ่าน Universal/App Link

ใช้ Authorization Code + PKCE

เก็บ refresh credential ใน Keychain/Keystore ผ่าน secure-storage adapter

Access token อยู่ใน memory และอายุสั้น

ห้ามเก็บ token ใน Preferences, localStorage, URL query หรือ log

Session lifecycle ที่ต้องทดสอบ

cold start พร้อม valid/expired session

sign-in canceled

callback ซ้ำ

app ถูก kill ระหว่าง callback

token refresh พร้อมกันหลาย request

logout และ remote revoke

guest-to-member merge conflict

10. UI foundation and design language

นำ pattern จากภาพอ้างอิงมาใช้ในเชิงโครงสร้าง:

Search-first information hierarchy

Horizontal category/area discovery

Map + draggable preview sheet

Store card ที่เน้น rating, price, category และ availability action

Floating bottom navigation ที่อยู่เหนือ safe area

Membership card ที่สื่อ progression อย่างชัดเจน

แต่สร้าง visual language ของ Aevocado เอง:

ใช้ token สำหรับ color, typography, radius, elevation, blur, spacing และ motion

รองรับข้อความไทย/อังกฤษและความยาว label ที่ต่างกัน

Aevo Go ใช้ Dark Flat + Optical Colorless Liquid Glass เป็นค่าเริ่มต้น:
พื้นผิวหลักเป็น matte black (`#070709`, `#0D0D12`, `#121218`), glass ใช้
`rgba(255,255,255,0.04–0.08)` กับ `backdrop-filter: blur(20px)`, ไม่มี gradient,
neon, exterior glow หรือ colored halo และใช้ inner specular rim สีขาวที่คมชัด
แทนเงาภายนอก

Active tabs, filters และ category controls ใช้ shared gliding glass capsule ที่
เลื่อนและปรับขนาดตาม item ที่เลือก พร้อม recalculation เมื่อ resize และรองรับ
reduced motion; semantic state ยังคงอยู่บน control เดิม

Minimum touch target แนะนำ 44×44 CSS px

รองรับ WCAG 2.2 AA, keyboard, screen reader, 200% text และ reduced motion

Core tokens

Color: bg, surface, elevated, text, muted, border, brand, success, warning, danger
Spacing: 4, 8, 12, 16, 20, 24, 32, 40
Radius: 8, 12, 16, 24, pill
Elevation: none, card, floating-nav, sheet, modal
Motion: fast 120ms, standard 180ms, sheet 240ms
Layout: content-max, page-gutter, bottom-nav-height, safe-area offsets

Safe-area shell

.app-shell {
min-height: 100dvh;
padding-top: env(safe-area-inset-top, 0px);
padding-left: env(safe-area-inset-left, 0px);
padding-right: env(safe-area-inset-right, 0px);
}

.page-content {
padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 16px);
}

Web browser ที่ไม่มี safe area จะ fallback เป็น 0px

11. Navigation architecture

Bottom navigation มี 5 destinations:

Explore

Map

Saved

Activity (Reservations/Orders)

My Page

ข้อกำหนด:

แสดง label ทุก item ไม่ใช้ icon อย่างเดียว

Active item ต้องต่างทั้งสี รูปทรง และ accessibility state

Floating capsule ไม่บังเนื้อหา/CTA และไม่ชน keyboard

ซ่อนหรือปรับตำแหน่งเฉพาะ flow ที่ต้อง focus เช่น checkout โดยมี navigation escape ชัดเจน

Desktop/tablet เปลี่ยนเป็น side rail หรือ top navigation เมื่อเหมาะสม ไม่ยืด mobile dock เต็มจอ

Preserve scroll position ต่อ tab

12. Screen implementation specifications

12.1 Explore

Composition:

Safe-area top header

Universal search field

Notification entry

Area chips

Featured carousel

Category sections

Nearby/recommended stores

Recent searches

Floating bottom navigation

Behavior states:

first load: skeleton ที่รักษาขนาด card

empty recommendation: category discovery fallback

permission not granted: แสดง area picker ไม่ block หน้าจอ

offline: แสดง cached recent/search discovery พร้อม stale indicator

carousel ต้องหยุดอัตโนมัติเมื่อ reduced motion และใช้งานด้วย keyboard ได้

12.2 Search and results

Debounce text input แต่ submit ได้ทันที

Search suggestion แยก store/category/area

Filter อยู่ใน URL และ restore หลัง back

List virtualization ใช้เมื่อผลลัพธ์มีจำนวนมากจริง

Empty state อธิบาย filter ที่ทำให้ไม่พบผลและมี action reset

Search analytics ไม่เก็บคำค้นที่เป็นข้อมูลอ่อนไหวโดยไม่จำเป็น

12.3 Map

State machine:

idle → locating → map-ready → moved-by-user → search-area → loading-results
└→ marker-selected → preview-sheet

ข้อกำหนด:

ขอ permission เมื่อผู้ใช้กด Near me ไม่ขอทันทีที่เปิดแอป

ใช้ viewport bounds + filter เป็น query key

Cancel request เก่าเมื่อ viewport เปลี่ยน

Search this area ปรากฏหลัง user gesture ไม่ยิงทุก map movement

Cluster marker ตาม zoom level

Selected marker และ preview card sync กัน

Bottom sheet มี snap points: preview / details; drag handle มี semantic alternative

มี list-mode fallback สำหรับ accessibility และ device ที่ map ทำงานไม่ดี

จำกัด precision/retention ของ location ตามความจำเป็น

12.4 Store detail

Sections:

Hero/media gallery

Name, category, rating, review count และ price range

Primary Check availability

Save, share และ directions

Tabs/anchors: Overview, Booking, Menu/Services, Photos, Reviews

Opening hours, facilities, location และ merchant policies

Rules:

Sticky action ไม่บัง bottom navigation

Availability CTA แสดง loading ในตำแหน่งเดิมและป้องกันกดซ้ำ

Save ใช้ optimistic update พร้อม rollback

Booking/order/payment success ห้าม optimistic

Structured data และ SEO อยู่ฝั่ง public surfaceเมื่อ route เปิดจาก Web

12.5 Booking

Flow:

Service/resource → Date → Party/duration → Slot → Details → Review → Confirm

Availability เป็น server-derived

Slot hold มี expiry และ countdown ที่อิง server time

รองรับ timezone ของร้านอย่าง explicit

เมื่อ slot ถูกแย่ง ให้เสนอ alternative โดยไม่ล้างข้อมูลทั้งหมด

Confirm ส่ง idempotency key

Unknown outcome ให้ poll/reconcile ก่อน retry

Success แสดง reservation ID, policy, calendar/deep-link action

12.6 Menu, cart and checkout

เลือก fulfillment: Dine-in / Takeaway ก่อนแสดงข้อกำหนดที่ต่างกัน

Menu category มี sticky sub-navigation

Modifier validation มาจาก contract

Cart draft recover ได้หลัง refresh/app restart

ก่อน checkout ต้อง reprice, revalidate availability, tax, coupon และ merchant policy

Payment ใช้ provider SDK/hosted flow ตาม compliance scope

Client ไม่รับ card data เองหากไม่จำเป็น

Order submission มี idempotency และ status reconciliation

12.7 Saved

Optimistic save/unsave พร้อม undo/rollback

Guest เก็บ local favorites ได้และเสนอ merge หลัง sign-in

แบ่ง filter ตาม category/area

Empty state เชื่อมกลับ Explore

12.8 Activity

รวม Reservations และ Orders ใน entry เดียว แต่แยก tab/filter ชัดเจน

Status timeline ใช้ server event time

Push deep link เปิด record เป้าหมาย

Cancellation/refund ตรวจ policy ฝั่ง serverและต้อง confirm

Realtime ใช้เฉพาะสถานะที่มีคุณค่าชัดเจน; fallback polling/backoff เสมอ

12.9 My Page and gamification

Profile summary

Tier card และ progress ไป tier ถัดไป

Metrics: completed visits/orders, explored categories, approved reviews

Level/badge collection

Quest list และ coupon wallet

Settings, privacy, notification preferences และ logout

Progress UI ต้องบอกทั้งค่าปัจจุบัน เป้าหมาย และเงื่อนไข ไม่พึ่งสี/รูป lock เพียงอย่างเดียว

13. Loyalty, quest and coupon domain

Data model

loyalty_accounts
loyalty_ledger
tier_definitions
badge_definitions
customer_badges
quest_definitions
quest_assignments
quest_progress
reward_grants
coupon_definitions
customer_coupons
coupon_redemptions

Domain rules

EXP เป็น ledger entry; ห้ามแก้ยอดรวมจาก client

Event เช่น reservation.completed หรือ order.fulfilled เป็น trigger ที่ผ่าน verification แล้ว

Quest definition มี version, eligibility window, target, reward และ anti-abuse rule

Progress update ต้อง idempotent ด้วย source event ID

Coupon grant และ redemption อยู่ใน transaction

Coupon expiry, timezone และ stacking rule เป็น explicit

Review quest ให้รางวัลหลัง moderation/eligibility ไม่ใช่เพียง client submit

Admin adjustment ต้องมี reason และ audit trail

Initial tiers

ไม่ hard-code ชื่อ/เกณฑ์ใน UI ให้โหลดจาก versioned configuration ตัวอย่างเริ่มต้น:

Tier

Example rule

UI intent

Beginner

Account created

Onboarding

Explorer

3 completed activities + 1 eligible review

Cross-category exploration

Master

Sustained usage across configured categories

Retention and breadth

เกณฑ์จริงต้องผ่าน product/economics review ก่อนเปิด production

14. Database and API boundaries

Core entities

customers, customer_identities, customer_preferences

organizations, stores, store_locations

categories, catalogs, catalog_items, modifiers

resources, availability_rules, slot_holds, reservations

carts, orders, order_items, payments, refunds

favorites, visits, reviews, review_media

loyalty and quest entitiesตามหัวข้อก่อนหน้า

device_installations, push_tokens, notification_preferences

API modules

GET /v1/discovery
GET /v1/search
GET /v1/stores/:slug
GET /v1/stores/:id/availability
POST /v1/slot-holds
POST /v1/reservations
GET /v1/reservations/:id
POST /v1/carts/price
POST /v1/orders
GET /v1/orders/:id
PUT /v1/me/favorites/:storeId
GET /v1/me/loyalty
GET /v1/me/quests
POST /v1/devices/push-registration

Contract requirements:

Versioned request/response schema

Stable machine-readable error code

Trace/request ID

Cursor pagination

Idempotency สำหรับ create/confirm/payment-sensitive commands

ETag/cache policy สำหรับ catalog/store data

Explicit money currency/minor-unit representation

Explicit timestamp timezone/UTC rules

Supabase/PostgreSQL security gates

เปิด RLS ทุก table ใน exposed schema

Policy จำกัด row ด้วย customer/organization/store relationship จริง ไม่ใช้เพียง TO authenticated

UPDATE policy มีทั้ง USING และ WITH CHECK

View ที่เปิดผ่าน API ใช้ security_invoker เมื่อรองรับ หรือย้ายไป unexposed schema

Privileged function อยู่ private schema, revoke default execute และตรวจ auth.uid() เมื่อจำเป็น

Service-role ใช้เฉพาะ trusted server

รัน database/security advisors ก่อน release migration

15. Offline and persistence scope

รองรับ offline

app shell

recently viewed stores

recent searches

cached store/catalog data ที่มี freshness label

saved local favorite intent สำหรับ guest

cart draft

last known reservation/order snapshot

ไม่รองรับ offline mutation ในระยะนี้

booking confirmation

order submission

payment/refund

coupon redemption

review reward

loyalty adjustment

เมื่อ offline ให้ disable action พร้อมเหตุผลและ preserve input; ห้ามแสดง success ปลอมแล้วค่อย sync สำหรับธุรกรรมสำคัญ

16. Capacitor implementation

Native project

apps/go-native/
├── capacitor.config.ts
├── ios/
├── android/
├── resources/
└── scripts/

Configuration principles:

webDir ชี้ไป build output ของ shared Go app

แยก app ID, scheme, signing และ environment config ต่อ dev/staging/prod

Native project เป็น source-controlled artifact

Core/iOS/Android plugin versionsต้องอยู่ major/version line เดียวกัน

ทุก release รัน web build → Capacitor sync → native build/test

Plugin rollout

Capability

Phase

UX fallback

App/deep links

Foundation

Web route

Status/System bars

Foundation

CSS safe area

Geolocation

Explore/Map

Manual area selection

Haptics

Interaction polish

No-op

Share

Store detail

Copy link

Push notifications

Activity

In-app status/history

Preferences

Foundation

Browser storage adapter

Secure storage

Auth

Web cookie/session strategy

Push permission ขอหลังผู้ใช้เห็นคุณค่า เช่น หลังจองสำเร็จเพื่อรับ reminder ไม่ขอทันทีที่เปิดแอป

17. Error and async UX contract

ทุก data surface ต้องรองรับ:

initial loading

background refresh

empty

partial content

recoverable error + retry

permission denied

offline/stale

session expired

mutation pending

unknown mutation outcome

success ที่คงอยู่ในหน้าจอ ไม่พึ่ง toast อย่างเดียว

Button async pattern:

loading อยู่ในปุ่มเดิม

ป้องกัน activation ซ้ำ

label สื่อ action เช่น กำลังยืนยันการจอง…

error อยู่ใกล้ control/summary และมี recovery action

toast ใช้เสริม ไม่ใช้เป็นช่องทางเดียวของข้อมูลสำคัญ

18. Motion and gesture contract

Press/selection feedback: 100–150 ms

Small state transition: 150–220 ms

Sheet/dialog: 200–300 ms และ interruptible

ใช้ opacity/transform เป็นหลัก

ห้ามใช้ transition: all

Bottom sheet drag ต้องไม่แย่ง vertical scroll ของ content

Gesture ทุกชนิดมี tap/keyboard alternative

prefers-reduced-motion ลด parallax, shimmer และ large movement

Business logic/focus restoration ห้ามพึ่ง animation end

19. Analytics and observability

Product events

search_submitted

filter_applied

map_area_searched

store_viewed

availability_checked

booking_started/completed/failed

cart_started

checkout_started/completed/failed

favorite_changed

quest_viewed/completed

coupon_applied/failed

Operational dimensions

app version/build

web/iOS/Android

route and release channel

network state

API error code and latency

crash-free session

deep-link resolution result

push registration/delivery/open funnel

ห้ามส่ง token, full address, payment data หรือ free-form user content เข้า telemetry โดยปริยาย

20. Testing strategy

Unit

domain calculation/transition

URL/filter serialization

platform adapter behavior

cart recovery และ price-change handling

quest eligibility/idempotency

Component

all async states

keyboard/focus

long Thai/English text

reduced motion

safe-area variables

permission denied/unsupported plugin

Contract/integration

generated client กับ API schema

RLS positive/negative/IDOR cases

booking concurrency และ slot expiry

duplicate order/reservation submission

coupon transaction and replay

guest-to-member merge

E2E Web

Explore → Store → Booking → Activity

Explore → Menu → Cart → Checkout → Order tracking

Map → marker → sheet → Store

Save as guest → sign in → merge

expired session and recovery

offline draft recovery

Native smoke/regression

cold/warm start

safe area/notch/home indicator

back gesture/button

keyboard resize

location permission lifecycle

deep link from terminated/background state

push open routing

secure session persistence/logout

upgrade from previous app version

Device matrix ขั้นต่ำต้องมี iPhone ขนาดเล็ก/ปัจจุบัน, Android ขนาดเล็ก/ปัจจุบัน และ tablet layout อย่างน้อยหนึ่งขนาด

21. CI/CD and release lanes

Pull request
├── lint/typecheck
├── unit/component
├── contract test
├── web build
└── preview deployment

Main
├── Web staging deploy
├── E2E smoke
├── Capacitor sync validation
└── internal native build

Release candidate
├── iOS TestFlight
├── Android internal testing
├── native regression
├── privacy/store metadata check
└── phased production rollout

Feature flags ต้องมี owner, expiry และ fallback ไม่ใช้ remote code download เพื่อหลบ app review

22. Implementation phases

Phase 0 — Architecture and discovery

Deliverables:

ADR: React/Vite dual-target architecture

current Go route/API inventory

design reference analysis

browser/device matrix

privacy/data map

API gap list

Exit criteria:

route ownershipและ API contract owner ชัดเจน

native capabilitiesถูกจัดเป็น required/optional

ไม่มี business rule ที่จำเป็นต้องอยู่ใน native shell

Phase 1 — Foundation

scaffold go-app, go-web, go-native

React Router และ error boundaries

Tailwind + semantic tokens

Query client, API error normalization และ MSW

platform bridge + test bridge

environment validation

Web/Capacitor build pipeline

safe-area/status bar baseline

Exit criteria:

หน้าเดียวกันรันบน browser, iOS simulator และ Android emulator

unsupported native capability ไม่ทำให้ app crash

CI สร้าง web/native artifacts ได้

Phase 2 — Design system and navigation

typography, color, space, radius, elevation, motion

Button, IconButton, Field, Chip, Card, Tabs, Dialog, Sheet, Toast, Skeleton

Floating bottom navigation + responsive rail

Storybook states and accessibility checks

Exit criteria:

navigation/back/safe-area/keyboard ผ่าน device matrix

components ครบ loading/disabled/error/focus/reduced-motion

Phase 3 — Explore, search and map

Explore composition

universal search and filters

category/area discovery

Mapbox adapter, clustering, search-this-area

marker/card sync และ bottom sheet

geolocation permission UX

Exit criteria:

route/filter shareable

map มี list fallback

request cancellation และ stale result handling ผ่าน

Phase 4 — Store detail and saved

store detail, gallery, tabs/anchors

availability entry

save/share/directions

guest local favorite and account merge groundwork

Exit criteria:

public link เปิด Web/native route เดียวกัน

optimistic favorite rollback ถูกต้อง

long localized content ไม่ overflow

Phase 5 — Booking

availability, slot hold, guest/customer details

confirm/idempotency/reconciliation

reservation detail/activity

reminder preference and deep link

Exit criteria:

concurrency/expiry/timezone tests ผ่าน

duplicate submissionไม่สร้างสอง reservation

unknown outcome recover ได้

Phase 6 — Ordering and payment

fulfillment mode, menu, modifiers

cart draft and recovery

price validation, coupon hook, checkout

payment flow and order status

Exit criteria:

server repricing และ price-change UX ผ่าน

payment/order retry ไม่ duplicate

kill/relaunch ระหว่าง payment recover ได้

Phase 7 — Profile, loyalty and quests

profile and preferences

tier/EXP ledger API

level/badge UI

quest progress and coupon wallet

notification preference

Exit criteria:

client ปลอม EXP/quest completion ไม่ได้

source event replay ไม่ให้รางวัลซ้ำ

coupon grant/redemption atomic

Phase 8 — Native hardening and launch

app icons/splash/store metadata

Universal/App Links

push lifecycle

secure session storage

privacy manifests/permissions copy

crash/performance monitoring

TestFlight/Internal testing และ phased rollout

Exit criteria:

native regression matrix ผ่าน

privacy/security review ผ่าน

rollback/kill switch/runbook พร้อม

23. Suggested sprint backlog

Sprint 1

ADR and repo boundaries

Vite React shell

route skeleton

design tokens

platform bridge contracts

web and Capacitor hello-flow

Sprint 2

core components

app shell, bottom navigation and safe area

query/error/auth bootstrap

MSW fixtures

Storybook baseline

Sprint 3

Explore/search API integration

area/category UI

recent search repository

loading/empty/error/offline states

Sprint 4

Map provider adapter

map/filter URL state

clustering and bottom sheet

geolocation permission flow

Sprint 5

Store detail/media/actions

saved/favorite

deep-link route parity

Sprint 6–7

Booking flow, slot hold, confirmation and activity

concurrency/idempotency/E2E

Sprint 8–9

Menu/cart/checkout/payment/order status

recovery and payment E2E

Sprint 10

Profile/notification settings

loyalty read model and tier UI

Sprint 11

quests/coupons

fraud/idempotency/audit verification

Sprint 12

native hardening, store readiness, performance and phased launch

จำนวน sprint เป็น planning sequence ไม่ใช่ fixed delivery promise; ควรปรับตาม API readiness และจำนวนคนในทีม

24. Team workstreams

Workstream

Ownership

Go experience

routes, screens, navigation and UX states

Design system

tokens, primitives, accessibility and motion

Commerce

catalog, cart, price, order and payment

Scheduling

availability, slot hold and reservation

Customer platform

guest/account, saved, profile and notification

Loyalty

ledger, tier, quest, coupon and anti-abuse

Native

Capacitor, deep links, plugins, signing and store release

Platform/API

contracts, auth, RLS, idempotency and observability

ทุก workstream ต้องมี owner, contract, test command, runbook และ metrics

25. Performance budgets

Route-level code splitting

Map library โหลดเมื่อเข้า map/ต้องใช้เท่านั้น

Image responsive sizes, modern formats และ lazy loading

Avoid hydrating/rendering hidden sheet treesขนาดใหญ่

Cache store/catalog ตาม explicit freshness policy

Search input ต้องไม่ทำให้ main threadสะดุด

Track LCP/INP/CLS บน Web และ startup/route transition/crash-free session บน Native

กำหนด numeric budget หลังเก็บ baseline บนอุปกรณ์เป้าหมายจริง ไม่ตั้งตัวเลขจาก desktop lab อย่างเดียว

26. Security and privacy checklist

PKCE + state + allowlisted callback/return path

Secure credential storage; no token in Preferences/localStorage/log

CSP และ dependency review สำหรับ Web

Deep-link host/path validation

RLS/IDOR negative tests

Idempotency and replay protection

Payment handled within provider compliance boundary

Location permission just-in-time และ purpose copy ชัดเจน

Push token rotate/revoke handling

Review/media upload type/size validation and moderation path

Account deletion/export policy

Telemetry data classification and retention

27. Definition of done per feature

Feature ถือว่าเสร็จเมื่อ:

ทำงานบน Web, iOS และ Android หรือระบุ capability fallback ชัดเจน

URL/deep-link/back behavior ถูกต้อง

Loading, empty, error, offline, permission และ session-expired states ครบ

Business validation อยู่ server/domain layer

Typed API contract และ stable error code พร้อม

Unit/component/integration/E2E ตามความเสี่ยงผ่าน

Thai/English, narrow/wide, safe area และ keyboard ผ่าน

Accessibility/focus/reduced motion ผ่าน targeted checks

Analytics ไม่มีข้อมูลอ่อนไหวและ operational telemetryพร้อม

Rollout/rollback และ support notes พร้อม

28. Immediate next actions

อนุมัติ ADR ให้ React + Vite + React Router เป็น core ของ go-app

ทำ inventory ของ Go routes/API/schema ที่มีอยู่จริง

ยืนยัน MVP ว่ารวม Booking และ Ordering ทั้งคู่หรือปล่อยเป็นสอง release

สร้าง Figma/design-token mapping จากภาพ reference เป็น Aevocado visual language

Scaffold go-app, go-web, go-native และ platform bridge

สร้าง API contract สำหรับ discovery/store/availability ก่อนเริ่ม UI จริง

ทำ app shell + floating navigation + safe-area spike บน device จริง

ทำ Map + bottom-sheet technical spike เพื่อวัด performance/gesture conflict

ล็อก Web/Native authentication strategy และ secure storage implementation

ตั้ง contract, RLS/IDOR, Web E2E และ native smoke tests เป็น release gate

29. Final target

go-public (SEO/QR/custom domain)
│
▼
Shared Aevocado Go React application
├── go-web → Browser / PWA
└── go-native → Capacitor → iOS / Android
│
▼
Aevocado Customer API
│
▼
PostgreSQL/Supabase + trusted services

ผลลัพธ์ที่ต้องการคือผู้ใช้เห็น product เดียวกันทั้ง Web และ Native ขณะที่ทีมดูแล route, component, domain rule และ API contract ชุดเดียว โดย native capability เป็น adapter ที่เพิ่มความสามารถ ไม่ใช่ fork ของ application

30. Reference documentation

Capacitor workflow: https://capacitorjs.com/docs/basics/workflow

Capacitor Preferences: https://capacitorjs.com/docs/apis/preferences

Capacitor Geolocation: https://capacitorjs.com/docs/apis/geolocation

Capacitor Push Notifications: https://capacitorjs.com/docs/apis/push-notifications

TanStack Query persistence: https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient

WCAG 2.2: https://www.w3.org/TR/WCAG22/

Supabase API security: https://supabase.com/docs/guides/api/securing-your-api

31. Desktop Adaptive UX Addendum

31.1 Decision: one product, two UX compositions

Aevocado Go ไม่ควรแยกเป็น Mobile Version และ Desktop Version ที่มี route/component tree ทั้งชุดคนละชุด แต่ควรใช้ หนึ่ง codebase, หนึ่ง domain/application layer และสอง responsive compositions:

Shared route + loader/view model
├── Mobile composition
│ ├── App header
│ ├── One-column feed
│ ├── Bottom navigation
│ └── Bottom sheet
└── Desktop composition
├── Global header
├── Discovery/search workspace
├── Multi-column content
└── Dialog/side panel/split view

สิ่งที่ใช้ร่วมกัน:

Route และ URL contract

API client และ TanStack Query cache

Domain/application services

Auth/session

Search/filter schema

Analytics event vocabulary

Design tokens และ primitive components

Error/loading/empty/offline semantics

สิ่งที่แยกได้เมื่อ UX ต่างกันจริง:

Page shell และ navigation placement

Page composition และ content order

Search form presentation

List/grid density

Bottom sheet เทียบกับ side panel/dialog

Mobile sticky action เทียบกับ desktop inline/sticky summary

ห้ามสร้าง mobile/ และ desktop/ ที่ copy feature logic ทั้งชุด เพราะจะทำให้ behavior, analytics, validation และ bug fix แยกจากกัน

31.2 Why current desktop feels weak

จากภาพปัจจุบัน desktop เป็น mobile layout ที่ขยายพื้นที่มากกว่าจะเป็น desktop experience:

Navigation dock ลอยแยกจาก global header และ content ทำให้ spatial relationship ไม่ชัด

Hero ใช้พื้นที่สูง แต่ search ยังเป็น field เดียวและไม่ได้ช่วยวางแผนหลายเงื่อนไข

Content column แคบและมี whitespace มากเมื่อเทียบกับ viewport

Category chips และ CTA ยังมี density แบบ mobile

Feature cards กว้างเต็มแถว ทำให้ข้อมูลต่อ viewport ต่ำ

Profile page เป็น stacked cards ขนาดใหญ่ จึง scan และเปรียบเทียบข้อมูลยาก

Desktop ไม่มี persistent discovery context เช่น location, date, party, category หรือ recent search

31.3 What to learn from Trip.com

นำหลักการมาใช้ ไม่คัดลอกหน้าตาหรือโครงสร้างธุรกิจตรงตัว:

Global header มี brand, universal search/location และ utility actions

Desktop ใช้พื้นที่แนวนอนสำหรับ search task ที่ประกอบด้วยหลาย field

Category/service switcher อยู่ใกล้ search เพื่อเปลี่ยน intent ได้เร็ว

Hero ทำหน้าที่เป็น background/context ให้ search workspace ไม่ใช่เป็น card ใหญ่เพียงอย่างเดียว

Content area มี section hierarchy ชัดและ card grid ที่สแกนได้รวดเร็ว

Navigation และ utility actions มีตำแหน่งคงที่ ไม่ลอยกระจาย

Promotion/recommendation แสดงหลายรายการต่อ viewport

สำหรับ Aevocado ให้แปลหลักการเหล่านี้เป็น restaurant/activity discovery:

Location | Category/keyword | Date/time | Party size | Search

อย่าเพิ่ม field ทุกอย่างพร้อมกันถ้า category ไม่ต้องใช้ เช่น Cafe search อาจไม่ต้องเลือก party size จนกด availability

31.4 Breakpoint strategy

ใช้ content-driven breakpoints ไม่ผูกกับชื่อ device เพียงอย่างเดียว:

Range

Composition

< 768px

Mobile app composition

768–1099px

Tablet/compact composition

≥ 1100px

Desktop discovery composition

≥ 1440px

Wide desktop โดยเพิ่ม columns ไม่ขยายข้อความจนอ่านยาก

Breakpoint ต้องไม่ใช่ตัวตัดสิน capability หรือ business behavior และห้ามอ่าน window.innerWidth ครั้งเดียวเพื่อเลือกคนละ application tree ที่ hydrate ไม่ตรงกัน

ใช้ CSS container/media queries สำหรับ layout และใช้ JS match media เฉพาะ interaction ที่ต้องเปลี่ยน primitive จริง เช่น sheet เป็น dialog โดยต้องรองรับการเปลี่ยน viewport ระหว่าง session

31.5 Responsive component architecture

ExploreRoute
├── useExploreViewModel()
├── MobileExploreLayout
└── DesktopExploreLayout

StoreRoute
├── useStoreViewModel()
├── MobileStoreLayout
└── DesktopStoreLayout

ProfileRoute
├── useProfileViewModel()
├── MobileProfileLayout
└── DesktopProfileLayout

Layout components รับ typed view model และ callbacks ไม่เรียก API ซ้ำเอง:

type ExploreViewModel = {
location: LocationSelection;
search: SearchDraft;
categories: Category[];
featured: FeaturedItem[];
recommendations: StoreSummary[];
status: AsyncStatus;
};

Primitive ที่ share ได้:

SearchField, LocationPicker, DateTimePicker, PartyPicker

CategoryItem, StoreCard, OfferCard, SectionHeader

FavoriteButton, RatingSummary, PriceRange

AsyncBoundary, EmptyState, InlineAlert

Composition ที่ควรแยก:

MobileSearchSheet / DesktopSearchBar

MobileBottomNav / DesktopGlobalNav

MobileFilterSheet / DesktopFilterPanel

MobileStoreActions / DesktopBookingPanel

MobileMapSheet / DesktopMapSplitView

31.6 Desktop global shell

แนะนำ shell ใหม่:

┌─────────────────────────────────────────────────────────────┐
│ Brand | Explore | Map | Saved | Activity | Search | Account │
├─────────────────────────────────────────────────────────────┤
│ Optional category/location sub-navigation │
├─────────────────────────────────────────────────────────────┤
│ Main content: full-width desktop canvas with fluid gutters │
└─────────────────────────────────────────────────────────────┘

Rules:

เลิกใช้ floating vertical dock สำหรับ desktop

Header สูงประมาณ 64–72px และ sticky เมื่อช่วยรักษา search context

Navigation หลักมี text label และ active state พร้อม aria-current

Utility ได้แก่ location, language, notifications และ account อยู่ด้านขวา

ไม่แสดง Guest เป็น badge ที่ลอยกลาง hero; เปลี่ยนเป็น account action ใน header

Main content ใช้พื้นที่เต็ม viewport บน PC โดยใช้ fluid gutter ที่อ่านง่าย
(ประมาณ 28–72px ตามขนาดจอ) และจำกัด max-width เฉพาะข้อความหรือ control group
ที่ต้องการความกระชับ ไม่ครอบทั้งหน้าไว้ใน shell แคบที่ทำให้เกิดขอบว่างขนาดใหญ่

Wide desktop เพิ่มจำนวนคอลัมน์ของ result/card grid ที่ 1440px และ 1920px
เพื่อใช้พื้นที่แนวนอนให้คุ้มค่า โดยไม่ลดขนาดตัวอักษรหรือยืดข้อความยาวเกินอ่านง่าย

Background full-bleed ได้ แต่ข้อความและ controls ต้อง align กับ content grid

31.7 Desktop Explore redesign

โครงสร้างแนะนำ:

Global header
Hero / discovery context
└── Desktop search workspace
├── Location
├── Category or keyword
├── Date/time
├── Party/resource needs
└── Search CTA

Quick categories (icon + label)
Featured campaigns / next-plan module
Recommended near you (4-column cards)
Popular categories (6 compact tiles)
Recently viewed / saved (horizontal row)
Editorial or seasonal collections
Footer

Search workspace:

เป็น elevated surface ซ้อนช่วงล่างของ hero คล้าย principle ของ Trip.com

แต่ใช้ visual identity สีม่วง/ดำของ Aevocado

Field แต่ละตัวมี label และ value ชัด ไม่ใช้ placeholder เป็น label

Enter submit ได้ และมี keyboard navigation

เมื่อเปลี่ยน category ให้แสดงเฉพาะ field ที่เกี่ยวข้อง

Search pending แสดงใน CTA โดยคงขนาด control

Hero:

ลด headline จากขนาดที่กินพื้นที่มากเกินไป

ใช้ภาพหรือ illustration ที่สื่อร้าน/กิจกรรมจริงมากกว่า gradient เปล่า

CTA รองควรเชื่อมกับ value เช่น ดูร้านใกล้ฉัน

Customer Gateway offline panel เป็น developer/operational status ไม่ควรอยู่กลาง consumer homepage ใน production; ย้ายเป็น unobtrusive offline banner หรือ diagnostics เฉพาะ environment

Content density:

Desktop card grid 3–4 columns

Category grid 5–8 itemsต่อแถวตามความกว้าง

ใช้ image, rating, location, price และ nearest availability ใน card

จำกัด card width เพื่อให้สแกนง่าย ไม่ stretch card เดียวเต็ม viewport

31.8 Desktop profile redesign

เปลี่ยนจาก stacked mobile cards เป็น dashboard:

Page title + account action
┌──────────────────────────────┬───────────────────────┐
│ Membership / progress │ Profile summary │
│ larger primary panel │ sign-in/preferences │
├──────────────────────────────┼───────────────────────┤
│ Quests │ Coupons │
├──────────────────────────────┼───────────────────────┤
│ Level & badges │ Recent activity │
└──────────────────────────────┴───────────────────────┘

Membership card เป็น primary 2/3-width panelเมื่อมีข้อมูลพอ

Profile/sign-in เป็น compact side panel ไม่ใช้ cardเต็มแถว

Level, quest และ coupon เป็น cards ที่ preview จำนวน/สถานะได้ ไม่ใช่ menu row อย่างเดียว

Settings แยก section ด้านล่าง ไม่ปนกับ gamification

เมื่อยังเป็น guest เน้นประโยชน์ของ sign-in และ preserve local saved/cart state

31.9 Desktop store, search and map layouts

Store detail:

Gallery mosaic ด้านบน

Content column + sticky booking/availability panel แบบ 65/35 เมื่อข้อมูลเหมาะสม

Tabs หรือ anchor navigation sticky ใต้ header

Menu/reviews ใช้พื้นที่เต็ม content ไม่บีบให้อยู่ใน mobile card

Search results:

Filter rail 240–280px + results grid/list

Sort และ result count อยู่เหนือรายการ

Filter update preserve scroll อย่างเหมาะสมและแสดง background refresh

URL เป็น source of truth ของ filter

Map:

Desktop ใช้ split view list 40% / map 60%

Hover/focus card sync marker แต่ข้อมูลสำคัญต้องไม่เข้าถึงได้เฉพาะ hover

Selected store เปิด preview panel ไม่ใช้ bottom sheet เต็มรูปแบบ

Resize panel ได้เฉพาะเมื่อมี product valueจริง; มิฉะนั้นใช้ fixed responsive split

31.10 Adaptive navigation mapping

Destination

Mobile

Desktop

Explore

Bottom nav

Global header

Map

Bottom nav

Global header / search view toggle

Saved

Bottom nav

Global header

Activity

Bottom nav

Global header

My Page

Bottom nav

Account menu/avatar

Notifications

Top icon

Header utility

Location

Top icon

Header/search workspace

Routes และ labels ยังเป็นชุดเดียวกัน การย้ายตำแหน่งไม่ควรเปลี่ยน permission หรือ analytics meaning

31.11 Design tokens for adaptive density

เพิ่ม tokens:

--content-max-compact: 1080px
--content-max-default: 1280px
--content-max-wide: 1440px
--page-gutter-mobile: 16px
--page-gutter-tablet: 24px
--page-gutter-desktop: 32px
--page-gutter-desktop-wide: clamp(28px, 3vw, 72px)
--section-gap-mobile: 32px
--section-gap-desktop: 56px
--control-height-mobile: 48px
--control-height-desktop: 44px
--card-density-mobile: comfortable
--card-density-desktop: compact

อย่าเปลี่ยน desktop ให้ตัวอักษรเล็กลงทั้งระบบเพื่อเพิ่ม density ให้ลด padding/spacing อย่างมีระบบและรักษา body text ที่อ่านง่าย

31.12 Implementation sequence

Desktop Phase D0 — Audit

จับภาพทุก route ที่ 390, 768, 1280, 1440 และ 1920px

ระบุ mobile-only assumptions ใน navigation, sheet และ sticky action

วัด content width, whitespace และ items per viewport

Desktop Phase D1 — Shell

สร้าง DesktopGlobalHeader

ย้าย Explore/Map/Saved/Activity เข้า header

สร้าง content container tokens

ลบ desktop floating side dock

Desktop Phase D2 — Search workspace

แยก shared search schema/view model

สร้าง DesktopSearchBar

เพิ่ม location/category/date/time/party fields แบบ conditional

เชื่อม URL และ submit behavior เดิม

Desktop Phase D3 — Explore density

ปรับ hero

สร้าง category grid และ store card grid

เพิ่ม recommended/recent/seasonal sections

ย้าย operational offline status ออกจาก hero flow

Desktop Phase D4 — Profile dashboard

สร้าง two-column dashboard

เปลี่ยน menu rows เป็น preview cards

แยก account/settings จาก loyalty

Desktop Phase D5 — Search/Map/Store

Filter rail + results

Map split view

Store sticky booking panel

Responsive transition ที่ tablet widths

Desktop Phase D6 — QA

keyboard-only workflow

200% text and 400% zoom spot checks

Thai/English long labels

pointer + touch laptop

resize while route/sheet/dialog open

visual regression ต่อ breakpoint

31.13 Acceptance criteria

Desktop ไม่มี bottom navigation หรือ floating mobile dock

บน PC main canvas ใช้พื้นที่เต็ม viewport โดยไม่มี arbitrary max-width ที่ทำให้เกิดขอบว่างขนาดใหญ่

ที่ 1440px เห็น search task และ recommendation อย่างน้อยหนึ่ง sectionโดยไม่ต้อง scroll ลึกเกินควร

Explore card grid มีอย่างน้อย 3 columns เมื่อ contentเหมาะสม และเพิ่ม columns ตามพื้นที่จริงที่ 1440px/1920px โดยยังคง body text และ touch target ที่อ่านง่าย

Search filters share URL/schema กับ mobile

Mobile และ desktop mutation ให้ผล/error codeเดียวกัน

Switching viewport ไม่ทำข้อมูล form/cart/filter หาย

Desktop search ใช้ keyboardครบ flow

Sticky header/panel ไม่บัง focused element หรือ error

Thai text ไม่ตัดวรรณยุกต์และไม่ overflow

ไม่มี duplicated API request จากการ render mobile และ desktop tree พร้อมกัน

Analytics event name และ payload semanticsตรงกันทั้งสอง composition

31.14 Final recommendation

คำตอบคือ ควรมี 2 UX/UI modes แต่ไม่ควรมี 2 versions ของ application:

หนึ่ง product
หนึ่ง codebase
หนึ่ง route/data/domain layer
หนึ่ง design system
สอง adaptive compositions

เริ่มแยก composition เมื่อโครงสร้างงานต่างกันจริง ไม่แยกทุก component ตาม breakpoint เป้าหมายคือให้ mobile รู้สึกเหมือน native app และ desktop รู้สึกเหมือน discovery/booking website ที่ใช้พื้นที่ได้เต็มประสิทธิภาพ โดยยังแก้ business logic และ bug เพียงจุดเดียว

## 31.15 Current implementation alignment

การปรับปรุงรอบนี้เริ่มจาก `aevo-go` โดยยึด route/data/domain layer เดิมและเพิ่ม composition ที่สอดคล้องกับ refinement plan:

- [x] ใช้ Dark Flat + Optical Colorless Liquid Glass เป็น default theme ทั้ง Web และ Capacitor-ready shell
- [x] ตัด gradient, neon/glow และ exterior shadow ออกจาก Aevo Go surfaces เหลือ inner specular rim
- [x] เพิ่ม shared gliding glass indicator สำหรับ activity, checkout และ category filters
- [x] Desktop ใช้ global header navigation และ search utility; mobile ใช้ bottom navigation เหนือ safe area
- [x] เพิ่ม keyboard focus ring, loading skeleton และ live status สำหรับ async discovery/search/map states
- [x] Map preview มี Mapbox adapter แบบ lazy-load, clustering, marker selection, selected-place preview และ list fallback
- [x] Search มี typed store/category/area suggestions, URL filters, server facets และ cursor pagination
- [x] Near me ขอ permission หลัง user action แล้วส่ง bounded real-location `bbox` โดยมี manual area fallback
- [x] Store detail รองรับ `imageUrl`, media gallery, opening hours/timezone, facilities, address และ policy จาก public contract
- [x] Saved รองรับ local guest intent, authenticated server favorite merge และ rollback เมื่อ mutation ไม่สำเร็จ
- [x] รักษา server authority สำหรับ availability/booking, slot hold, cart pricing/order/payment และไม่สร้าง success ปลอมใน client
- [ ] ยืนยัน map gesture/cluster, permission/viewport/cancellation และ sheet behavior บน device จริง
- [ ] เติม desktop search workspace/profile dashboard เต็มรูปแบบเมื่อ schema และ interaction evidence พร้อม

ข้อกำหนดเหล่านี้เป็น source of truth ร่วมกับ `.agents/skills/ux-ui-skill/SKILL.md` สำหรับ implementation รอบถัดไป

## 31.16 Profile Insight Card — current implementation alignment

หน้า `aevo-go/profile` เปลี่ยนจาก profile/level split แบบ placeholder เป็น
Profile Insight Card ที่ยึด interaction quality จาก ZAYX Card Insight
(`https://www.zayx.dev/components/card-insight`) แต่แปลงให้เหมาะกับ Vite
React Web/Capacitor ของ Aevo Go:

- [x] ด้านหน้าแสดง identity, account/session signal และ sign-in/sign-out action
- [x] ด้านหลังแสดง Saved places, Reservations และ Orders จาก typed local recovery
  records และ Customer Gateway favorites เมื่อมี authenticated session
- [x] รองรับ pointer drag เพื่อ tilt/flip, explicit flip control ขนาด 44px,
  live-region announcement และ `prefers-reduced-motion`
- [x] ใช้ matte dark + colorless optical glass, crisp inner rim, ไม่มี gradient
  หรือ exterior glow และยังใช้ full desktop canvas/stacked mobile composition
- [x] เก็บ adaptation ไว้ที่ `src/features/profile/profile-insight-card.tsx`
  โดยไม่เพิ่ม Expo, React Native, Reanimated หรือ Skia dependency
- [ ] เชื่อม profile progression/quests/coupons กับ versioned Customer API
  เมื่อ read models และ permission contract พร้อม

## 31.17 Explore Master–Detail — current implementation alignment

หน้า `aevo-go/explore` ปรับเป็น responsive Master–Detail สำหรับ Trace
discovery โดยใช้ route/data layer เดิมและไม่สร้าง mobile/desktop data tree แยกกัน:

- [x] Desktop ใช้ full-bleed fluid canvas; เมื่อเลือก Trace แบ่ง master feed/detail เป็น `40% / 60%` โดย feed อยู่ใน natural document flow และ detail panel มี scroll body อิสระ
- [x] ไม่มี selected Trace ให้ feed ขยายเต็มพื้นที่; card ที่เลือกมี active rim และ `selected=<trace-slug>` อยู่ใน URL
- [x] Mobile เริ่มจาก feed 100%; detail เปิดเป็น full-screen overlay พร้อม safe-area header, ปุ่มย้อนกลับ และปุ่ม Escape สำหรับ keyboard
- [x] Compact discovery header มี search/⌘K, context chips, quick intents และ For you / Following / Nearby `GlidingGroup` แยกเป็นลำดับชั้นชัดเจน
- [x] Trace card รองรับ cover mosaic, creator/expertise, metrics, taste reason, community proof และ action ที่แยกความหมายกัน
- [x] Detail panel รองรับ creator follow, metrics, taste reason, demo stop timeline, community proof, remix lineage และ sticky discussion/Trace It/navigation CTA
- [x] action feedback ใช้ pending/`aria-busy`, custom toast และ retry/error state; ไม่ใช้ `alert()`
- [x] live mode ไม่สร้าง stop/rating/remix/media ขึ้นมาเองเมื่อ public contract ยังไม่มี; demo fixtures มี notice และใช้เพื่อทดสอบ interaction เท่านั้น
- [x] เพิ่ม stop map action แบบ bounded search และ save stop ผ่าน local repository เฉพาะ demo mode จนกว่า Customer Gateway จะมี typed stop/place projection
- [ ] เพิ่ม typed public Trace detail projection (media, taste score, stops, verified ratings, remix lineage) แล้วถอด unavailable state ตาม contract โดยไม่เปลี่ยน layout contract
- [ ] เพิ่ม visual regression ที่ 360/390/768/1280/1440/1920px และทดสอบ scroll/resize/keyboard บน device จริง

## 31.18 Spatial Docked Side-Panel — current implementation alignment

หน้า Trace detail มี spatial content surface สำหรับภาพ/คอนเทนต์ของร้านและ Trace
โดยยังใช้ typed Customer Gateway เดิม และแยก panel ออกจาก main stage ทาง layout
ไม่ใช้ modal overlay:

- [x] สถานะปิดจัด main content card ไว้กึ่งกลาง พร้อม neutral ambient layer ที่ไม่ใช้ gradient หรือ colored glow
- [x] สถานะเปิดใช้ GPU-accelerated `translate3d` ด้วย easing `cubic-bezier(0.16, 1, 0.3, 1)` ระยะ 360ms ให้ card glide ไปทางซ้าย และ dock panel เข้าแนบขอบขวา
- [x] Desktop ตั้งแต่ 1024px ใช้ inline dock กว้างสูงสุด 460px; main stage และ panel ไม่สร้าง backdrop ดำทับกัน
- [x] Panel มี independent `overflow-y: auto`, custom scrollbar, sticky header/tab/footer และใช้ `GlidingGroup` สำหรับ Stops Timeline/ความคิดเห็น
- [x] กดแท็บเดิมซ้ำหรือปุ่ม X ปิด panel ได้ และกด `Escape` เพื่อคืน main card กลับศูนย์กลาง
- [x] ต่ำกว่า 1024px เปลี่ยนเป็น full-height sheet โดยไม่บีบ content card; composer ความคิดเห็นติดตรึงที่ด้านล่างของ panel
- [x] ใช้ live projection ที่มีอยู่จริง (`place.imageUrl`) เป็น media; เมื่อยังไม่มี video/media projection จะแสดง unavailable state แทนการสร้างข้อมูลปลอม
- [x] ลบ content ใช้ inline confirmation แทน browser `confirm()` และยังคง soft-delete/audit semantics ของ Customer Gateway
- [ ] เพิ่ม typed video/media asset projection จาก Gateway ก่อนเปิด playback จริง และตรวจ visual regression ที่ 360/390/768/1024/1280/1440px

## 31.19 Explore scroll + Map multi-select — current implementation alignment

รอบปรับปรุงนี้แก้ interaction ที่กระทบการใช้งานจริงของ Aevo Go โดยคง
route/data/domain layer และ URL contract เดิมไว้:

- [x] app shell ของ Customer Web ใช้ `min-height: 100dvh` แต่ไม่ล็อก document
  ด้วย fixed `height: 100vh`/`overflow: hidden`; semantic `main` ใช้ safe-area
  padding และหน้ารองรับ natural document flow
- [x] Explore mobile กลับมาใช้ normal document flow จึงเลื่อน feed ได้ต่อเนื่อง;
  detail ยังคงเป็น full-screen sheet ที่มี independent scroll ของตัวเอง
- [x] Explore desktop ใช้ normal document flow; เมื่อเลือก Trace จะเป็น
  master/detail `40% / 60%` โดย feed เลื่อนตามหน้า และ detail panel แบบ sticky
  มี body scroll แยกสำหรับข้อมูลเชิงลึก
- [x] Map desktop ทำให้ result body เป็น scroll container อิสระภายใน panel
  ส่วน canvas ยังคงล็อกอยู่กับ viewport
- [x] Map filter เปลี่ยนจาก single-choice category/price controls เป็น filter
  drawer แบบ multi-select สำหรับหมวดหมู่ งบประมาณ Taste Match Saved Following
  และคะแนนขั้นต่ำ
- [x] ทุกการเลือก filter ใช้ `aria-pressed`, แสดงจำนวนตัวกรองที่เลือก,
  รองรับ “ทุกหมวดหมู่”/“ทุกระดับ” เพื่อ reset เฉพาะกลุ่ม และมี “ล้างทั้งหมด”
- [x] `categoryIds` และ `priceLevels` ยังคงถูกเก็บใน URL แบบ comma-separated
  และถูกส่งต่อเป็นส่วนหนึ่งของ query key/request จึงแชร์ลิงก์และ refresh ได้
- [x] ไม่มีการใช้สีเคลือบหรือ exterior glow เพิ่มใน filter surface; ใช้ neutral
  optical glass และ inner rim ตาม Dark Flat contract

## 31.20 Trace Map OSM + partner booking — current implementation alignment

Trace Map รอบนี้เพิ่ม public place layer และ booking handoff โดยยังแยก source of
truth อย่างชัดเจน:

- [x] Customer Gateway ยังคงเป็น business authority สำหรับ public store profile,
  availability และ reservation; OSM/Overpass เป็นเพียง place enrichment ที่ไม่มี
  rating, availability, saved/following หรือสิทธิ์จองของ Aevo
- [x] เพิ่ม `src/features/map/osm-service.ts` รองรับ `disabled`, `mock` และ
  `remote` mode, bounds query, in-memory cache 5 นาที, in-flight dedupe,
  safe HTTP website parsing, deterministic fixtures และ remote result cap
- [x] OSM place ถูกแปลงเป็น `StoreMapSummary` ที่มี `source: "osm"` และ `osmId`
  แยกจาก customer place; รายการที่ชื่อซ้ำจะไม่แสดงซ้ำใน map/list projection
- [x] Marker และ result card sync กันผ่าน GeoJSON source เดียว: category mark,
  partner status, selected/hover state และ map camera pan ทำงานร่วมกันทั้ง
  mouse, keyboard และ list fallback
- [x] Partner place แสดงสถานะ `จองผ่าน Aevo GO ได้ทันที`; เปิด booking drawer
  แล้วอ่าน availability จาก server ใน live mode ก่อนส่งต่อไป flow `/booking`
  ที่สร้าง hold/confirm ด้วย Customer Gateway ส่วน demo mode แสดง notice และ
  ไม่อ้างว่าเกิด reservation จริง
- [x] Mobile ใช้ map เต็ม viewport พร้อม collapsed/preview/expanded result sheet;
  desktop ล็อก canvas และให้ results scroll แยก พร้อม attribution เมื่อเปิด
  remote OpenStreetMap layer
- [ ] Production ควรย้าย remote Overpass call ไป edge/server adapter ที่มี
  rate-limit, cache และ monitoring ก่อนเปิดให้ traffic สูง; `remote` ใน client
  เป็น integration spike ที่ opt-in ผ่าน environment เท่านั้น

ไฟล์ implementation หลัก:

- `aevo-go/src/app/app-shell.tsx` + `aevo-go/src/styles/index.css` — viewport
  shell และ scroll ownership
- `aevo-go/src/features/discovery/explore-page.tsx` — Explore responsive flow
- `aevo-go/src/features/map/map-page.tsx` — multi-select Map filter controls
- `aevo-go/src/features/map/map-url-state.ts` — shareable filter state
- `aevo-go/src/features/map/maplibre-map.tsx` — marker/category/partner sync
- `aevo-go/src/features/map/osm-service.ts` — OSM/Overpass adapter and cache
- `aevo-go/src/features/map/map-booking-drawer.tsx` — partner booking handoff

หลักฐานตรวจสอบรอบนี้: `npm run typecheck`, `npm run test` (15 files / 57
tests) และ `npm run build` ผ่านใน `aevo-go` โดย build ยังมีคำเตือนขนาด chunk
ของ MapLibre/แอปตามเดิม แต่ไม่ใช่ compile หรือ runtime error

## 31.21 Explore Travel & Lifestyle Booking Portal — current implementation alignment

หน้า Explore รอบนี้ปรับ composition ให้เป็น Travel & Lifestyle Booking Portal
โดยยึด Dark/Emerald ของ Aevo Go และเชื่อมต่อกับ discovery/booking contracts เดิม:

- [x] เพิ่ม Hero แบบ image-led สำหรับ Bangkok พร้อมข้อความหลักของ Aevocado GO,
  system/route proof และ promo badge ที่ปิดได้โดยไม่บังเนื้อหาหลักถาวร
- [x] เพิ่ม floating booking card ที่ใช้ `GlidingGroup` เดียวสำหรับ category
  intent: คาเฟ่, ร้านอาหาร, Trace, บาร์, เวิร์กช็อป และ Aevo Play
- [x] ฟิลด์พื้นที่, วันที่, จำนวนคน และคำค้นเชื่อมกับ URL state; submit จะส่งต่อ
  ไป `/map` พร้อม `mode`, `area`, `categoryIds`, `availableAt`, `partySize`,
  `reservable` และ `searched` ตาม category ที่เลือก
- [x] เพิ่ม voucher/ticket cards แบบ cutout และ partner lane พร้อม CTA
  `/stores/:storeSlug/booking`; demo mode ติดป้ายข้อมูลตัวอย่างและ live mode
  ไม่สร้างส่วนลดหรือ availability สำเร็จปลอมขึ้นมาเอง
- [x] เพิ่ม partner projection fields (`venueSlug`, `isAevoPlayPartner`) บน
  `DiscoveryPlace` เพื่อแสดง “จองโต๊ะทันทีผ่าน Aevo Play” แยกจาก Store/OSM
  source อื่น และ reuse booking route ที่ตรวจ availability จาก server
- [x] Global topbar เหลือ Aevocado GO, Explore, Trace Map, Saved, Activity,
  compact Spotlight search trigger และ Profile; ตัด location/Create/cart/
  notification placeholder/merchant link ออกจาก navigation surface
- [x] Hero และ booking card อยู่ใน normal document flow โดยไม่ใช้ negative
  margin ซ้อนทับกัน; mobile เปลี่ยน form เป็น single column และ category เป็น
  horizontal scroll
- [x] Spotlight รองรับ click และ `Meta/Ctrl + K`, Arrow Up/Down, Enter,
  Escape, click-outside และคืน focus ให้ trigger หลังปิด
- [x] Map camera bounds ถูกแยกจาก committed search bounds; การขยับกล้องไม่เขียน
  URL หรือ refetch OSM/discovery จนกว่าจะกด `Search this area`; multi-select
  filter debounce 400ms ก่อนเปลี่ยน query
- [ ] เมื่อ campaign/voucher public projection พร้อม ให้เปลี่ยน fixture cards
  เป็น typed Gateway data โดยคง fallback ที่บอกสถานะ unavailable อย่างตรงไปตรงมา

ไฟล์ implementation หลัก:

- `aevo-go/src/features/discovery/explore-booking-portal.tsx` — Hero, booking
  form, category intent, voucher และ partner lane
- `aevo-go/src/features/discovery/explore-page.tsx` — URL state, query tree,
  map handoff และ feed composition
- `aevo-go/src/features/discovery/types.ts` + `demo-discovery.ts` — partner
  projection fields สำหรับ demo/live boundary
- `aevo-go/src/app/app-shell.tsx` + `aevo-go/src/styles/index.css` — global
  navigation, responsive portal layout และ neutral optical-glass tokens

## 31.22 Explore scroll, Spotlight Search และ Map movement stability — current implementation alignment

รอบนี้แก้บั๊กที่ทำให้หน้า Explore เหมือนถูกล็อกและ Trace Map กระพริบ/ยิงข้อมูล
ซ้ำจาก camera movement โดยยึด URL ownership และ source-of-truth boundary เดิม:

- [x] เปลี่ยน Customer Web shell เป็น `min-height: 100dvh` + natural document
  flow; ถอด fixed-height/overflow lock จาก Explore root และเปิด safe content
  margin มาตรฐานให้ page frame อ่านง่ายบน Desktop/Mobile
- [x] ปรับ Explore hierarchy ให้ `PLAN YOUR NEXT STOP` booking card เป็นบล็อก
  แรกใน flow ปกติ; lifestyle image อยู่ถัดลงไปโดยไม่มี negative margin ซ้อนทับ
  หรือทำให้คูปอง/partner cards หลุดจากความสูงของหน้า
- [x] Header เหลือ brand, Explore, Trace Map, Saved, Activity, Profile และ
  compact `Search or ask... ⌘K`; ตัด Bangkok selector, Create, cart,
  notification placeholder, merchant link และ long search field ออกจาก shell
- [x] เพิ่ม `SpotlightSearch` แบบ keyboard-accessible: click/Meta-Ctrl+K,
  Arrow Up/Down, Enter, Escape, click-outside, clear query และคืน focus
  พร้อม suggestion categories สำหรับ Places, Traces, Aevo Play และ Tracers
- [x] แยก map camera bounds ออกจาก committed search bounds; การขยับกล้องไม่เขียน
  URL หรือ refetch และให้ `Search this area` เป็นจุดเดียวที่ commit/re-fetch;
  multi-select filter debounce 400ms ก่อนเปลี่ยน query
- [x] OSM query ใช้เฉพาะ committed bounds หรือ fallback bounds จึงไม่ยิง
  Overpass ทุกครั้งที่ map ถูกลาก; MapLibre ใช้ instance/ref เดิมและ map filter
  แบบ multi-select ยังคงอยู่ใน URL

ไฟล์หลัก:

- `aevo-go/src/components/spotlight-search.tsx`
- `aevo-go/src/app/app-shell.tsx`
- `aevo-go/src/features/map/use-map-discovery.ts`
- `aevo-go/src/features/map/map-page.tsx`
- `aevo-go/src/features/discovery/explore-page.tsx`
- `aevo-go/src/styles/index.css`

หลักฐานตรวจสอบ: Explore desktop document height `5584px` ต่อ viewport `577px`,
Explore mobile document height `8341px` ต่อ viewport `844px`, Spotlight keyboard
flow ผ่าน, Map drag แสดง `Search this area` โดยไม่สร้าง Overpass request ใหม่,
และ multi-select `Cafe + Dining` สะท้อนเป็น `categoryIds=Cafe,Dining` ใน URL.

## 31.23 Explore seven-bug hardening — current implementation alignment

รอบนี้ปิดงาน refactor ตาม acceptance ล่าสุดของ Explore, Master–Detail และ
Trace Map โดยเน้นการรักษา scroll context, ขยายพื้นที่ใช้งาน และไม่ให้ camera
interaction กลายเป็น network loop:

- [x] การเลือก Trace, ปิด detail, ล้างตัวกรอง และการเปลี่ยน query state ใช้
  semantic button/URL update ที่มี `preventScrollReset: true`; การเลือก detail
  จึงไม่ดีดหน้า Explore กลับไปด้านบน และ `Escape` ปิดได้โดยรักษาตำแหน่งเดิม
- [x] เมื่อมี selected Trace workspace ใช้ `width: min(100%, 1600px)` พร้อม
  responsive gutters; master อยู่ที่ `minmax(420px, 520px)` และ detail ยืดด้วย
  `minmax(0, 1fr)` แทน narrow max-width shell
- [x] Explore ใช้ natural document flow; ไม่มี fixed `100vh`/`h-screen` หรือ
  `overflow: hidden` บน root ที่ทำให้ scrollbar หาย ส่วน detail desktop มี
  independent readable scroll และ mobile ใช้ full-height sheet
- [x] MapLibre ใช้ instance/ref เดิม, camera movement เปลี่ยนเฉพาะ local dirty
  state และ `Search this area` เป็นจุดเดียวที่ commit bounds และ refetch; filter
  multi-select debounce 400ms ก่อนเปลี่ยน query
- [x] Global header กว้างเต็มจอ โดยกลุ่ม brand + Explore/Trace Map/Saved/Activity
  อยู่ทางซ้าย และ Spotlight `⌘K` + profile อยู่ทางขวา; เอา city selector,
  Create และ long search field ออกจาก shell
- [x] Spotlight modal ใช้ dark backdrop blur และ keyboard flow เดิมครบทั้ง
  Meta/Ctrl+K, Arrow Up/Down, Enter, Escape, click-outside และ focus return
- [x] `DISCOVER FEED` heading และ tabs กลับสู่ normal document flow ไม่มี
  `sticky`/`top`/anchor layer; booking/search block `PLAN YOUR NEXT STOP` เป็น
  element แรก และ legacy Explore hero copy ถูกนำออก

ไฟล์ที่เกี่ยวข้อง:

- `aevo-go/src/app/app-shell.tsx`
- `aevo-go/src/features/discovery/explore-page.tsx`
- `aevo-go/src/features/discovery/explore-booking-portal.tsx`
- `aevo-go/src/features/map/use-map-discovery.ts`
- `aevo-go/src/styles/index.css`
- `.agents/skills/ux-ui-skill/SKILL.md`

หลักฐานตรวจสอบรอบนี้: `npm run typecheck`, `npm test -- --run` (15 test files,
57 tests) และ `npm run build` ผ่าน; runtime smoke ยืนยัน Explore scroll ได้,
เลือก/ปิด Trace โดยไม่ reset scroll, desktop split ขยายตามพื้นที่, header ใหม่,
map multi-select `Cafe + Dining` และ query `categoryIds=Cafe,Dining` ทำงานจริง.

## 31.24 Mobile-first Post/Trace cards และ Gesture-driven Trace Map — current implementation alignment

รอบนี้เพิ่ม interaction สำหรับหน้าจอสัมผัสโดยคง Dark Flat + Optical Colorless
Liquid Glass contract และไม่เปลี่ยน source-of-truth ของ feed/map:

- [x] Trace card บนจอเล็กซ่อน action row แบบข้อความยาว และแสดง primary CTA
  เดี่ยว `ดูรายละเอียด Trace นี้` พร้อม icon rail สำหรับ Save, Map, Remix,
  Comments และ Share; action ทุกตัวมี label, `aria-pressed`/`aria-busy` และ
  pending state ตาม action contract
- [x] Post card ใช้ primary CTA สำหรับเปิด discussion/detail surface และ icon
  rail สำหรับ Like, Comments, Share และเมนูเพิ่มเติม; desktop ยังคง action row
  เดิมโดยไม่สร้าง query/API tree ใหม่
- [x] Trace cover และ Post media เป็น horizontal touch carousel ที่ใช้
  `scroll-snap`, ซ่อน scrollbar บน mobile, มี dot indicator และป้องกัน swipe
  ไม่ให้กลายเป็น accidental tap; การแตะ Trace เปิด master/detail เดิม ส่วน
  media ของ Post เปิด discussion drawer ที่มีอยู่
- [x] Avatar/name ของ Trace creator และ Post author เป็นปุ่มขนาดสัมผัสขั้นต่ำ
  44px; เปิด profile bottom sheet แบบ neutral glass แสดง Bio, taste rationale,
  สถิติที่มีจริง และ Follow state ที่ผูกกับ `setTraceDeeTracerFollow` ผ่าน
  profile id เดียวกันทั้ง Trace/Post/detail
- [x] Trace Map mobile มี `isMapInteracting` state แยกจาก map data state;
  `touchstart`, `touchmove`, MapLibre `moveStart`/`moveEnd` และ blank-map tap
  ใช้สัญญาณเฉพาะสำหรับซ่อน/คืน chrome ไม่สั่ง fetch ข้อมูล
- [x] ขณะลากหรือ zoom แผนที่จะซ่อน search, mode, filter, Search this area,
  preview และ notice ด้วย GPU transform/opacity; result sheet ย่อลงเป็น peek
  และ bottom navigation ยังคงแสดงเสมอ
- [x] Map chrome คืนหลัง inactivity `1,800ms` หรือ blank-map tap; timer ถูก
  clear/replace ทุก interaction และ cleanup ตอน unmount; มี reduced-motion
  override สำหรับผู้ใช้ที่ขอลด animation
- [x] เขียน mobile interaction contract เพิ่มใน
  `.agents/skills/ux-ui-skill/SKILL.md` เพื่อให้ implementation ครั้งต่อไป
  รักษา carousel, profile sheet, map immersive mode และ explicit search commit

ไฟล์ implementation หลัก:

- `aevo-go/src/features/discovery/discovery-cards.tsx` — mobile Trace/Post
  actions, creator profile sheet และ swipe media
- `aevo-go/src/features/discovery/explore-page.tsx` — creator follow state
  ที่ใช้ร่วมกับ Trace/Post/detail
- `aevo-go/src/features/map/map-page.tsx` — mobile map chrome state/timer
- `aevo-go/src/features/map/maplibre-map.tsx` — map interaction signals และ
  one-instance/ref boundary
- `aevo-go/src/styles/index.css` — touch carousel, bottom sheet และ immersive
  transform states
- `.agents/skills/ux-ui-skill/SKILL.md` — reusable Aevo Go mobile contract

## 31.25 Monochrome Depth & High-Contrast Selection — current implementation alignment

รอบนี้ปรับ Aevo Go ให้ใช้ระบบสี Obsidian แบบ solid และแยกความหมายของ
“พื้นผิว” ออกจาก “สถานะที่เลือก” อย่างชัดเจน เพื่อให้ filter และ toggle อ่านได้
ทันทีบนหน้าจอขนาดเล็กและในสถานการณ์ที่มีข้อมูลหนาแน่น:

- [x] กำหนด token กลางใน `aevo-go/src/styles/index.css` เป็น canvas
  `#090b0e`, card `#12161c`, interactive `#191f27`, hover `#232b36`,
  border `#2c3644` และ high-contrast white `#ffffff`
- [x] เปลี่ยน control ที่เลือกได้ เช่น map filters, chips, booking slots,
  time slots, rating, save/action controls และ checkbox rows ให้ใช้ solid
  white + black bold text พร้อม white selection bloom ที่จำกัดขอบเขต
- [x] เพิ่ม Check icon ให้ toolbar filters ของ Trace Map เมื่อเลือก
  `เปิดอยู่`, `Aevo Play`, `ร้านอาหาร / คาเฟ่` และ `4.5+`; filter drawer
  รองรับ Check icon เดิมสำหรับ multi-select
- [x] คง `GlidingGroup` เป็น active lens เดียวสำหรับ tabs/mutually-exclusive
  modes แต่เปลี่ยน indicator เป็น solid white ไม่ใช้ translucent glass เป็น
  selected state ของ multi-select
- [x] จำกัด `backdrop-filter` ของ interaction controls และปรับ surface หลัก
  ของ Explore/detail/map ให้เป็น solid card layer; glass คงไว้เฉพาะ top bar,
  Spotlight และ floating media badges
- [x] ใช้ inner rim แบบคมชัด `inset 0 1px 0 rgba(255,255,255,0.08)` โดยไม่เพิ่ม
  gradient, colored glow หรือ exterior shadow glow
- [x] อัปเดต `.agents/skills/ux-ui-skill/SKILL.md` ด้วย Monochrome Depth and
  High-Contrast Selection Contract เพื่อใช้เป็นกติกากลางในการ implement ครั้งต่อไป

ไฟล์ implementation หลัก:

- `aevo-go/src/styles/index.css`
- `aevo-go/src/features/map/map-page.tsx`
- `.agents/skills/ux-ui-skill/SKILL.md`

เกณฑ์ตรวจสอบ: selected controls ต้องมี inverse polarity และ semantic state
(`aria-pressed`/`aria-selected`) เสมอ; map filter query และ selected-count ต้อง
ยังทำงานเหมือนเดิม; `npm run typecheck`, `npm test -- --run` และ `npm run build`
ต้องผ่านก่อนส่งมอบ
