Aevocado Go — Web & Capacitor Implementation Plan

สถานะเอกสาร: Adopted implementation plan; current Web/PWA vertical-slice status is recorded in section 31
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

Aevo Go ใช้ Dark Flat + Optical Colorless Liquid Glass เป็น default: matte black
canvas, neutral translucent glass, inner specular rim และไม่มี gradient, neon,
exterior glow หรือ colored halo; เตรียม neutral flat light variant สำหรับ
accessibility/user preference

Tabs, filters และ category controls ใช้ shared gliding glass capsule ที่วัด
ตำแหน่ง/ขนาดใหม่หลัง selection และ resize พร้อม reduced-motion fallback

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

31. Current implementation alignment — 2026-09-19

`aevo-go` now implements the first shared Web/PWA + Capacitor application
slice described by this plan. This section records what is real in the
current codebase so the remaining plan phases are not mistaken for completed
production capabilities.

Delivered in the current app core:

- React + TypeScript + Vite + React Router shell with the planned customer
  routes, Dark Flat + Optical Colorless Liquid Glass default theme, safe-area shell, desktop navigation,
  mobile navigation and accessible recovery states.
- TanStack Query server reads, typed Zod contracts, request timeout/error
  normalization, CSRF header support, request IDs and mutation idempotency
  headers.
- IndexedDB-backed local repository with memory fallback for recent searches,
  viewed stores, guest favorites, cart drafts, reservation snapshots and
  opaque order tracking references.
- Web/Capacitor platform bridge for location, haptics, share, push permission /
  registration, non-secret Preferences and native secure storage. Browser
  fallbacks remain explicit and non-blocking where possible.
- Explore/search/store/saved/map vertical slices, including URL filters,
  server discovery reads, optional public `venueSlug`, lazy Mapbox loading,
  viewport `bbox` queries, GeoJSON clustering, marker selection, selected-place
  preview and list fallback. Discovery reads receive query cancellation signals
  so stale map results are not applied after a viewport change. Search now has
  typed store/category/area suggestions, server facet metadata and cursor
  pagination; Near me sends a bounded real-location viewport.
- Live data mode is the default for Aevo Go. Customer records are expected to
  be created and enabled through Admin/Hub public projections; demo fixtures
  remain an explicit opt-in for isolated shell work and are not used to claim
  real customer outcomes.
- Booking vertical slice using server availability, explicit timezone and
  server-time contract, party-size filtering, 10-minute server slot holds,
  expiry countdown, Zod detail validation, same-key idempotent hold/confirmation,
  opaque reservation tracking and local activity recovery. Demo mode never
  claims a booking success.
- Catalog/menu/cart/checkout vertical slice using live public catalog and
  modifier validation, durable variant-aware cart lines, same-key public order
  submission and server order tracking refresh. Checkout now requests an
  authoritative cart price and uses a hosted payment-session handoff; displayed
  client totals remain drafts until the server response is present.
- PWA shell registration and Capacitor configuration without embedding service
  credentials or treating local data as business authority.

Remaining plan gates before production MVP:

- ETag/cache policy, richer marker/card bottom-sheet gestures and device-level
  map validation; current location consent/retention policy must be approved.
- Booking cancellation/refund policy, calendar/reminder actions, push deep link
  and broader timezone/concurrency E2E coverage.
- Configure hosted payment provider secrets/webhook verification in each target
  environment, replace zero tax/coupon/policy extension fields with approved
  rules, and run payment/order kill-relaunch recovery.
- Customer OAuth Code + PKCE callback lifecycle, guest-to-member merge,
  push-token backend registration, loyalty/quest/coupon read models and
  server reservation/order history for authenticated accounts.
- Native iOS/Android projects, deep links, icons/splash, privacy manifests,
  device matrix, Storybook/MSW/Playwright coverage, native smoke tests and
  release observability.

The implementation is therefore a connected, testable vertical-slice
foundation—not a claim that all Phase 3–8 server and release gates are done.
