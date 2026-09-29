Aevocado Framework Modernization Plan

สถานะเอกสาร: Authenticated Hub, Play, POS และ Go cutover ไปยัง surface ใหม่แล้ว; legacy dev entrypoints ถูก retire แล้ว; Hub identity entrypoint รองรับ password register, Google/Apple/LINE OAuth และ app-scoped SSO handoff
ชื่อแพลตฟอร์ม: Aevocado
ขอบเขต: การปรับปรุง frontend framework, monorepo, shared packages, deployment, quality gates และการย้ายแอปแบบต่อเนื่อง
นอกขอบเขตปัจจุบัน: Local Store Hub ประจำแต่ละร้าน ซึ่งถูกย้ายไปอยู่ใน Future Roadmap

1. Executive summary

Aevocado ควรเปลี่ยนจากการใช้ Astro เป็นศูนย์กลางของทุกแอป ไปสู่สถาปัตยกรรมที่แยกตามลักษณะงาน:

Product surface

Target stack

Rendering/runtime

Marketing และ public content

Astro

Static/SSR บน Cloudflare

Go public storefront

Astro + React

SSR/SEO พร้อม interactive islands

Go order/booking/queue flow

React + React Router

Web SPA/SSR และ Capacitor ในอนาคต

Hub

React Router Framework Mode

Cloudflare Workers SSR

Admin

React Router Framework Mode

Cloudflare Workers SSR แยก privileged boundary

Play merchant workspace

React Router Framework Mode

Cloudflare Workers SSR

POS

React + Vite + React Router Data Mode

Cloud-first SPA/PWA

Kiosk และ Queue display

React + Vite

SPA/PWA; Capacitor/Tauri เมื่อจำเป็น

แนวทางนี้ไม่ใช่การ rewrite ทั้งระบบ แต่เป็น Strangler Migration: แยก business logic ออกจาก Astro ก่อน แล้วค่อยย้ายทีละ bounded context และทีละ route โดยรักษา API, authentication, authorization, entitlement และข้อมูล production เดิมไว้

2. เป้าหมาย

2.1 เป้าหมายทางผลิตภัณฑ์

รองรับ Hub, Admin, Go, Play, POS, Kiosk และ Queue โดยไม่ผูกทุกแอปเข้ากับ rendering model เดียว

ให้ Go รองรับ QR, custom domain, guest session, customer account และ mobile packaging

ให้ POS/Kiosk รองรับการพัฒนา offline-ready โดยยังไม่สร้าง Local Store Hub ในระยะปัจจุบัน

ทำให้เพิ่มแอปใหม่ เช่น CRM, Inventory, Loyalty และ Analytics ได้โดย reuse platform capability

ทำให้ design language, loading state, error state, permission และ telemetry สม่ำเสมอทั้งแพลตฟอร์ม

2.2 เป้าหมายทางวิศวกรรม

ย้าย application UI หลักไป React + React Router + Vite

เก็บ Astro เฉพาะงาน content, SEO และหน้า public ที่ได้ประโยชน์จาก islands architecture

แยก domain/application logic ออกจาก framework

ทำ typed API contract และ generated client เป็นช่องทางมาตรฐาน

ใช้ organization/store context ที่ derive ฝั่ง server และไม่เชื่อ tenant identifier จาก client

รองรับ Cloudflare Workers, preview deployment และ environment isolation

สร้าง migration ที่ rollback ได้และไม่หยุด feature delivery

2.3 Non-goals ของรอบนี้

ไม่สร้าง Local Store Hub

ไม่ทำ multi-device offline coordination ภายในร้าน

ไม่เปิด peer-to-peer synchronization ระหว่าง POS/Kiosk

ไม่ rewrite backend หรือ database ทั้งหมดเพียงเพราะเปลี่ยน frontend

ไม่ย้าย marketing/public content ออกจาก Astro หากยังไม่มีเหตุผลด้านผลิตภัณฑ์

ไม่สร้าง native UI แยกด้วย Swift, Kotlin หรือ Flutter

3. หลักการตัดสินใจ

Framework is delivery, domain is product — business rules ต้องไม่อยู่ใน route component

Server owns trust — auth, membership, permission, entitlement, price, payment และ tenant scope ตรวจฝั่ง server

Cloud-first now, local-hub-ready later — ปัจจุบันใช้ Cloud API; เตรียม interface โดยไม่สร้าง infrastructure ล่วงหน้าเกินจำเป็น

One migration boundary at a time — ย้ายทีละ app/route และมี rollback

No shared database access from UI packages — UI เรียกผ่าน application service/repository/API client

Design system before mass migration — ลดการย้าย markup ซ้ำและป้องกัน UI แตกต่างกัน

Observability is a release requirement — ต้องมองเห็น error, latency, auth failure และ failed mutation ก่อน cutover

4. Target architecture

Users and devices
├── Customer browser / Go app
├── Owner/Manager browser / Hub
├── Booking staff browser / Play
├── Sales staff browser / POS
├── Kiosk device
└── Platform operator / Admin
│
▼
Identity and entry
├── Aevocado Accounts / SSO
├── App-aware sign-in and callback
├── Organization/store context selector
└── Access decision and safe redirect
│
▼
Frontend applications
├── Astro public surfaces
├── React Router SSR workspaces
└── React + Vite operational SPAs
│
▼
Shared application packages
├── auth-client
├── tenant-context
├── api-client
├── permissions
├── entitlements
├── domain packages
├── design-system
└── observability
│
▼
Aevocado Core API
├── Identity and sessions
├── App access and memberships
├── Organization and stores
├── Subscription and entitlement
├── Orders, booking and queue
├── Customer gateway
└── Audit and jobs
│
▼
PostgreSQL/Supabase + RLS, Stripe and supporting services

5. Target monorepo

aevocado/
├── apps/
│ ├── marketing/ # Astro
│ ├── go-public/ # Astro + React islands
│ ├── go-app/ # React + Vite/React Router
│ ├── hub/ # React Router Framework Mode
│ ├── admin/ # React Router Framework Mode
│ ├── play/ # React Router Framework Mode
│ ├── pos/ # React + Vite
│ ├── kiosk/ # React + Vite
│ └── api/ # Existing Aevocado Core API
├── packages/
│ ├── design-system/
│ ├── icons/
│ ├── api-contract/
│ ├── api-client/
│ ├── auth-client/
│ ├── tenant-context/
│ ├── permissions/
│ ├── entitlements/
│ ├── organization-domain/
│ ├── catalog-domain/
│ ├── order-domain/
│ ├── booking-domain/
│ ├── queue-domain/
│ ├── customer-domain/
│ ├── billing-domain/
│ ├── local-repository/ # Browser/device local persistence only
│ ├── sync-contract/ # Contract only; no Local Store Hub
│ ├── device-bridge/
│ ├── observability/
│ └── test-utils/
├── services/
│ ├── customer-gateway/
│ ├── webhook/
│ ├── notification/
│ └── background-jobs/
├── tooling/
│ ├── eslint-config/
│ ├── typescript-config/
│ ├── vitest-config/
│ └── playwright-config/
├── pnpm-workspace.yaml
└── turbo.json

Package dependency rules

apps → application/domain packages → contracts/utilities

Allowed:
hub → order-domain → api-contract

Forbidden:
order-domain → React
order-domain → Astro
order-domain → Cloudflare
design-system → Supabase service role
frontend app → database table directly for sensitive mutations

ใช้ lint rule หรือ dependency boundary checker บังคับกฎนี้ใน CI

6. Standard frontend stack

Concern

Standard

Language

TypeScript strict mode

Application UI

React

Routing/SSR

React Router Framework Mode

Operational SPA

React Router Data Mode + Vite

Public content

Astro

Server state

TanStack Query เฉพาะ cloud/server data

Tables

TanStack Table

Forms

React Hook Form

Validation

Zod และ schema จาก API contract

UI state

Zustand เฉพาะ cross-component client state

Workflow

State machine สำหรับ order/booking/payment transition

Web local storage

IndexedDB ผ่าน repository abstraction

Styling

Shared tokens + reusable design-system components

Testing

Vitest, Testing Library, Playwright

Documentation

Storybook และ ADRs

Mobile packaging

Capacitor เมื่อ Go/POS mobile พร้อม

Desktop packaging

Tauri เมื่อมี device/hardware use case

7. Application boundaries

7.1 Aevocado Hub

หน้าที่:

Organization/store/member management

App provisioning, entitlement และ manager-only launcher

Billing และ subscription self-service

Customer experience configuration

Domain, branding และ integration settings

เชิญพนักงาน กำหนด app assignment, store scope, role และสถานะการเข้าถึง

ข้อกำหนด:

React Router Framework Mode

HttpOnly session

จำกัดผู้ใช้งานปกติเป็น Organization Owner/Manager หรือผู้ที่ได้รับ Hub permission โดยตรง

Route loader ตรวจ membership, Hub assignment และ permission

Mutation สำคัญตรวจ entitlement ซ้ำใน Core API

ไม่ใช้ Admin API หรือ service-role credentials

พนักงานทั่วไปไม่ต้องผ่าน Hub เพื่อเริ่มงาน และไม่มีสิทธิ์เห็นหน้าบริหารองค์กรโดยปริยาย

7.2 Aevocado Admin

หน้าที่:

Platform operations

Organization/user/subscription inspection

Webhook/job/system health

Audited support actions

ข้อกำหนด:

แยก deployment และ hostname จาก Hub

Platform roles แยกจาก organization roles

Impersonation เป็น temporary session มี expiration, banner และ audit

Dangerous actions ต้อง reason, confirmation และ before/after audit

ห้าม client เข้าถึง service-role key

7.3 Aevocado Go

แบ่งเป็นสองส่วน:

go-public: ร้าน, SEO, custom domain, QR landing และ public catalog

go-app: order, cart, checkout, booking, queue และ customer account

ข้อกำหนด:

QR ใช้ public-link resolver ไม่ encode internal identifier ที่แก้ไม่ได้

Domain resolver ฝั่ง server map host → organization/store

Guest-first; login เป็น optional upgrade

ราคา ส่วนลด ภาษี availability และยอดชำระคำนวณ/ยืนยันฝั่ง server

Shared UI/domain package เดียวกันพร้อมสำหรับ Capacitor

7.4 Aevocado Play

Merchant booking workspace ใช้ React Router Framework Mode

พนักงาน Play เข้าที่ play.aevocado.app โดยตรงและใช้ Aevocado SSO

ตรวจ Play app assignment, organization membership, store/resource scope และ Play permission ก่อนเข้า workspace

Availability และ reservation hold อยู่ฝั่ง server

Timezone/DST เป็น explicit domain data

ไม่ยืนยัน booking แบบ offline ในระยะปัจจุบัน

7.5 Aevocado POS/Kiosk/Queue

React + Vite SPA

พนักงาน POS เข้าที่ pos.aevocado.app โดยตรงและใช้ Aevocado SSO

ตรวจ POS app assignment, organization membership, store scope, role และ device policy ก่อนเริ่มกะ

Cloud API เป็น shared authority ในระยะปัจจุบัน

ใช้ client-generated UUID และ idempotency key สำหรับ mutation ที่เหมาะสม

IndexedDB ใช้ cache, pending UI state และ recoverable draft ได้

ไม่รับประกัน multi-device offline consistency จนกว่าจะมี Local Store Hub

Payment, refund, entitlement refresh และ permission escalation ต้อง online

7.6 Aevocado SSO and application access

Product access model

ความสัมพันธ์ระดับ ecosystem คือ:

                         Aevocado Accounts
                                │
                 authenticate once / authorize per app
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼

Aevocado Go Aevocado Hub Staff applications
customer identity Owner / Manager ├── Play
guest or customer organization control └── POS

Go ← Hub → Play/POS ใช้อธิบายความสัมพันธ์ด้านการตั้งค่าและข้อมูล แต่ Hub ไม่ใช่ทางผ่านบังคับสำหรับพนักงาน:

Owner/Organization Manager เข้า Hub เพื่อสร้างองค์กร/ร้าน เปิดใช้แอป เชิญสมาชิก และกำหนดสิทธิ์

Booking staff เปิด Play โดยตรง

Cashier/Manager/Operator เปิด POS โดยตรง

ผู้ที่ได้รับสิทธิ์หลายแอปสามารถเปิดแต่ละแอปโดยตรง หรือใช้ manager-only launcher ใน Hub

Go เป็น customer surface แยก identity และ authorization จาก workforce apps

Admin เป็น privileged platform surface และไม่รวมอยู่ใน workforce SSO trust โดยอัตโนมัติ

Recommended hostnames

Surface

Canonical hostname

Audience

Accounts

accounts.aevocado.app

Sign-in, callback, recovery, MFA และ session management

Hub

hub.aevocado.app

Owner และ Organization Manager

Play

play.aevocado.app

Booking/resource staff

POS

pos.aevocado.app

Cashier, store manager และ operator

Go

go.aevocado.app และ verified custom domains

Guest/customer

Admin

admin.aevocado.app

Aevocado platform roles เท่านั้น

Core API

api.aevocado.app

Trusted API boundary

hostname เป็นตัวอย่าง canonical name และสามารถเปลี่ยน TLD ได้ แต่ควรรักษาหลักการแยก application boundary

Identity domains

Aevocado แยก identity ออกเป็นสามประเภท:

Identity type

ใช้กับ

Membership model

Workforce identity

Hub, Play, POS

User → Organization membership → App assignment → Scope → Role/Permission

Customer identity

Go

Guest session หรือ customer profile; ไม่เป็น organization member

Platform identity

Admin

Platform role/permission; แยกจาก organization role

ผู้ใช้หนึ่งคนอาจมี workforce memberships หลายองค์กร แต่ access decision ต้องประเมินต่อ organization + app + store/resource scope ทุกครั้ง ห้ามถือว่า login สำเร็จแล้วใช้ได้ทุกแอป

Authentication architecture

ใช้ Supabase Auth เป็น identity provider ในระยะปัจจุบัน และวาง Aevocado Accounts เป็น auth broker/BFF ของทุก first-party app:

App entry URL
↓
App checks first-party session
├── valid → request app access decision
└── missing/expired → redirect to Accounts
↓
authenticate / MFA
↓
one-time authorization code
↓
app callback exchanges code
↓
app-scoped HttpOnly session

ข้อกำหนด:

Web ใช้ Authorization Code + PKCE-style handoff หรือ equivalent one-time server exchange

ห้ามส่ง access token/refresh token ใน query string, fragment หรือ localStorage

แต่ละแอปถือ app-scoped HttpOnly, Secure cookie ของตัวเอง

Accounts session ทำให้ผู้ใช้ไม่ต้องกรอกรหัสซ้ำ แต่ไม่ใช้ cookie กว้างตัวเดียวเป็น authorization ของทุกแอป

Callback ตรวจ state, PKCE verifier, intended app และ allowlisted return path

Authorization code ใช้ครั้งเดียว อายุสั้น และผูกกับ browser flow/app

Native Capacitor/Tauri ใช้ system browser + deep/universal link callback ไม่ฝัง login credentials ใน WebView

External enterprise SAML/OIDC สามารถเพิ่มภายหลังที่ Accounts layer โดยไม่เปลี่ยน authorization model ภายใน

Why app-scoped sessions

การมี SSO ไม่ได้หมายถึงทุกแอปต้องแชร์ cookie เดียวกัน การใช้ app-scoped session ให้ประโยชน์ดังนี้:

ลด blast radius หาก app หนึ่งมีช่องโหว่

Play/POS ตั้ง session lifetime และ device policy ต่างกันได้

Logout/revoke รายแอปได้

Admin ไม่ได้รับ session จาก Hub/POS โดยอัตโนมัติ

เปลี่ยน hosting หรือ custom domain โดยไม่ต้องแจก refresh token ข้าม origin

Authorization chain

ทุก protected request ใช้ chain เดียวกัน:

Authenticated identity
↓
Active user/account
↓
Active organization membership
↓
App assignment: HUB | PLAY | POS
↓
Scope: organization | store | resource/device
↓
Role and permission
↓
Organization entitlement/subscription
↓
Action-specific policy

frontend ใช้ access decision เพื่อแสดง UX เท่านั้น ส่วน Core API ต้องตรวจซ้ำก่อน mutation หรืออ่านข้อมูลสำคัญ

Recommended access data model

users
organizations
stores

organization_memberships

- id
- user_id
- organization_id
- status # INVITED | ACTIVE | SUSPENDED | REVOKED
- default_store_id
- joined_at

applications

- id
- code # HUB | PLAY | POS
- status

member_app_assignments

- id
- membership_id
- application_id
- status # ACTIVE | SUSPENDED | REVOKED
- starts_at
- expires_at

member_scopes

- id
- app_assignment_id
- scope_type # ORGANIZATION | STORE | RESOURCE | DEVICE_GROUP
- scope_id

roles
permissions
role_permissions
member_app_roles

user_sessions

- id
- user_id
- app_code
- device_id
- assurance_level
- last_seen_at
- expires_at
- revoked_at

app_authorization_codes

- id
- code_hash
- user_id
- app_code
- return_path
- pkce_challenge
- expires_at
- consumed_at

role ต้องผูกกับ app/context ไม่ใช้ role = admin กลางทั้งแพลตฟอร์ม

Initial role and access matrix

Role

Hub

Play

POS

Typical scope

Organization Owner

Full organization management

Optional

Optional

Organization/all stores

Organization Manager

Delegated management

Optional

Optional

Organization/assigned stores

Booking Manager

No access by default

Manage booking/resources

No access by default

Assigned stores/resources

Booking Staff

No access

Operate booking

No access

Assigned stores/resources

Store Manager

No Hub access by default

Optional

Manage store operations

Assigned stores

Cashier

No access

No access

Sell/receive permitted payments

Assigned stores/registers

Queue Operator

No access

Optional

Operate queue only

Assigned stores/queues

Owner/Manager ที่ต้องทำงานใน Play/POS ต้องมี assignment ของแอปนั้นด้วย ไม่ควรได้สิทธิ์ operational action อัตโนมัติเพียงเพราะเข้า Hub ได้

Direct-entry flows

พนักงานเปิด Play/POS โดยตรง

open play.aevocado.app/bookings/123
→ no app session
→ Accounts sign-in
→ access decision for PLAY
→ if one valid context: return to original safe path
→ if several organizations/stores: context selector
→ enter Play at /bookings/123

ผู้ใช้ login สำเร็จแต่ไม่มีสิทธิ์ในแอป

ไม่ส่งไป Hub อัตโนมัติโดยไม่อธิบาย

แสดง Access unavailable พร้อม organization/app ที่ร้องขอ

ให้เปลี่ยน organization, request access หรือ logout

ถ้าเป็น Owner/Manager อาจแสดงลิงก์ไป Hub เพื่อจัดการ assignment

ห้ามเปิดเผยชื่อองค์กรหรือข้อมูลร้านที่ผู้ใช้ไม่มี membership

Invitation flow

Owner/Manager invites email
→ choose applications
→ choose stores/resources
→ choose app-specific roles
→ invite link opens Accounts
→ authenticate matching identity
→ accept membership
→ redirect to the assigned app, not Hub by default

Multiple organizations/stores

จดจำ last-used context แยกต่อ app

URL/deep link ที่มี context ต้องตรวจ membership ก่อนใช้

context switcher แสดงเฉพาะ assignment ที่ active

เปลี่ยน context ต้อง invalidate app caches, active queries และ sensitive selections

POS ต้องยืนยัน store/register/shift context ก่อนรับ transaction

Session lifecycle and logout

Idle/absolute lifetime กำหนดตามความเสี่ยงของแต่ละ app

POS shared terminal รองรับ explicit lock screen, user switch และ server-side revoke

Password reset, account suspension และ membership revoke ต้อง revoke/disable affected sessions

Permission/assignment change ต้องมี version หรือ authz_updated_at เพื่อบังคับ refresh access decision

Logout app ออกจาก app ปัจจุบันเท่านั้นเป็นค่าเริ่มต้น

Sign out everywhere revoke ทุก Aevocado session

Accounts logout ไม่ควรถูกตีความว่า transaction ฝั่ง API ถูกยกเลิก

หลัง timeout ของ mutation ที่ไม่ทราบผล ให้ reconcile จาก server ก่อน retry

Access UX contract

ทุกแอปใช้หน้าจอและข้อความมาตรฐานร่วมกัน:

Signing in / Verifying access

Choose organization

Choose store/workspace

Access unavailable

Invitation expired or already used

Session expired พร้อมกลับไป route เดิมหลัง login

Account suspended

App unavailable because organization entitlement is inactive

Step-up authentication required

ข้อกำหนด UX:

รักษา intended route เฉพาะ same-origin/allowlisted path

แสดงชื่อ app, organization และ store ที่กำลังเข้าอย่างชัดเจน

ไม่วน redirect ระหว่าง Accounts กับ app; ใช้ correlation ID และ terminal error state

keyboard/mobile/Thai long text ต้องใช้งานได้

async access check มี pending, timeout, failure และ retry โดยไม่สร้าง session ซ้ำ

Admin separation

admin.aevocado.app ใช้ platform assignment แยกต่างหาก

Organization Owner ไม่มี Admin access

Admin ต้องรองรับ MFA/step-up ตาม action risk

Impersonation ไม่สร้าง session เหมือนผู้ใช้จริง แต่เป็น audited delegated session มี expiration และ visible banner

Admin session/cookie/audience ห้ามนำไปใช้ที่ Hub, Play หรือ POS

SSO implementation milestones

สร้าง Accounts service และ canonical callback contract

สร้าง app registry, membership, assignment, scope, role และ permission schema

ทำ Hub Owner/Manager access gate

ทำ Play/POS direct-entry SSO และ safe return path

ทำ invitation flow ที่ redirect ไป assigned app

ทำ context selector และ last-used context ต่อ app

ทำ app logout, global logout, revoke และ user switching

เพิ่ม MFA/step-up และ enterprise SAML/OIDC ภายหลัง

SSO acceptance criteria

Login หนึ่งครั้งที่ Accounts แล้วเข้า app ที่ได้รับ assignment ได้โดยไม่กรอกรหัสซ้ำ

ผู้ไม่มี Hub assignment เข้า Hub ไม่ได้แม้มี Play/POS access

ผู้มี Play assignment เข้า Play ตรงได้โดยไม่ผ่าน Hub

ผู้มี POS assignment เข้า POS ตรงได้โดยไม่ผ่าน Hub

ผู้มี membership แต่ไม่มี app assignment ได้ 403/access-unavailable ไม่ใช่ app shell เปล่า

Store/resource scope ถูกบังคับทั้ง UI, API และ RLS/policy layer

Open redirect, code replay, token leakage และ cross-app cookie tests ผ่าน

Membership/assignment revoke มีผลต่อ session ตาม SLA ที่กำหนด

Admin session ไม่ให้สิทธิ์ workforce app โดยอัตโนมัติ และกลับกัน

8. Migration program

ระยะเวลาต่อไปนี้เป็นกรอบประมาณการสำหรับทีมขนาดเล็ก 2–4 คน และปรับตาม codebase จริงหลัง discovery

Phase 0 — Inventory and freeze boundaries (สัปดาห์ 1–2)

งาน:

ทำ inventory routes, Astro pages, islands, API calls และ direct database access

ระบุ business logic ที่ฝังใน .astro, UI component และ route handler

บันทึก auth/session flow ของทุกแอป

บันทึก deployment, environment variables, Cloudflare bindings และ CORS origins

สร้าง dependency graph และรายการ duplicate components

นิยาม baseline metrics: build time, JS size, route error rate, Core Web Vitals และ critical-flow success rate

ระบุ critical journeys: login, switch organization/store, create order, payment, booking, queue และ subscription

Deliverables:

Current architecture map

Route migration inventory

API/security gap list

ADR-001: Framework allocation

ADR-002: Monorepo boundary rules

Migration dashboard

Exit criteria:

ทุก route มี owner และ target disposition: keep Astro / migrate / retire

Critical flows มี automated smoke test อย่างน้อยหนึ่งเส้นทาง

ไม่มี secret/service-role key อยู่ใน client bundle

Phase 1 — Platform foundation (สัปดาห์ 3–5)

งาน:

ตั้ง pnpm workspace และ Turborepo pipeline

ล็อก Node runtime และ package manager version

เปิด TypeScript strict mode สำหรับ package ใหม่

สร้าง shared ESLint/format/test configuration

สร้าง api-contract และ generated/typed api-client

สร้าง standard error shape, request ID และ idempotency header

สร้าง Accounts/SSO foundation, app registry และ callback contract

สร้าง auth-client, tenant-context, app-access, permissions, entitlements

สร้าง membership, app assignment, scope และ app-specific role schema

ทำ safe return-path validation และ app-scoped session lifecycle

สร้าง observability package และ release metadata

ตั้ง preview deployment ต่อ app

Exit criteria:

App ใหม่ import shared packages ได้โดยไม่มี circular dependency

API client มี auth refresh, timeout, cancellation และ normalized errors

Hub, Play และ POS ใช้ SSO contract เดียวกันแต่ถือ app-scoped session

พนักงาน Play/POS เข้าแอปโดยตรงและถูกบังคับด้วย app assignment/store scope

ทุก request log มี request ID, app, version และ tenant context ที่ปลอดภัย

CI ทำ typecheck, lint, unit test และ build แยกทุก workspace

Phase 2 — Design system and interaction standards (สัปดาห์ 4–7; ทำคู่ Phase 1 ได้)

สร้าง:

Semantic color, spacing, typography, elevation และ motion tokens

Button, Input, Select, Combobox, FormField, Dialog, Drawer, Toast

DataTable, SearchBar, Filter, Group, Sort และ pagination primitives

Loading, empty, error, permission-denied, offline และ retry states

Async action pattern ป้องกัน duplicate submit

Responsive shell, navigation, breadcrumbs และ command menu

Accessibility baseline ตาม WCAG 2.2 และ reduced motion

กฎ:

Business permission ไม่ซ่อนด้วย CSS อย่างเดียว

Component ที่ทำ mutation ต้องรองรับ pending/success/error/retry

Form error ไม่ทำให้ข้อมูลผู้ใช้หาย

Thai, long text, mobile width และ browser zoom ต้องอยู่ใน visual tests

Exit criteria:

Storybook ครอบคลุม core components

Hub/POS ใช้ token เดียวกันได้

Critical components ผ่าน keyboard และ accessibility test

Phase 3 — Extract domain and application logic (สัปดาห์ 6–10)

ย้าย logic ออกจาก Astro ไป package:

Order totals, modifiers และ state transitions

Booking availability DTO และ validation

Queue state and actions

Organization/store selection

Permission/entitlement evaluation result model

Customer session และ public-link context

รูปแบบมาตรฐาน:

UI component
↓
Application service
↓
Repository/API interface
↓
HTTP client or browser local adapter

Exit criteria:

Domain packages import ได้ใน Vitest โดยไม่ต้องมี browser/React/Astro runtime

Critical business rules มี unit tests

Existing Astro flow ใช้ package ใหม่ได้ก่อน migration UI

Phase 4 — Migrate POS pilot (สัปดาห์ 9–14)

เลือก POS เป็น pilot เพราะมี interactivity สูงและได้ประโยชน์จาก Astro ต่ำที่สุด

ขอบเขต pilot:

App shell, login/session recovery

Organization/store selection

Product catalog

Cart and modifiers

Create order

Order list/detail

Basic queue/status update

ยังไม่รวม:

Local Store Hub

Multi-device offline collaboration

Fully offline payment/refund

Printer/native hardware integration หากยังไม่มี requirement ยืนยัน

Migration strategy:

เปิด React POS ภายใต้ feature flag หรือ pilot hostname

ใช้ Core API เดิมและ idempotency contract เดิม

ทำ shadow telemetry เปรียบเทียบ success/error/latency

Pilot กับ internal/test organization ก่อน

Canary rollout ตาม organization

Exit criteria:

Critical POS E2E ผ่าน

ไม่มี duplicate order จาก retry/double submit

Auth refresh/logout ถูกต้องบน shared terminal

Price, permission, modifier และ state transition parity ผ่าน contract tests

Rollback เป็น Astro POS ได้โดยไม่ย้อน database

Phase 5 — Migrate Hub and Admin (สัปดาห์ 13–19)

Hub:

Workspace shell

Organization/store/member

App launcher

Billing/entitlement display

Customer experience configuration

Admin:

แยก app/deployment

Platform role enforcement

Organization/user/subscription views

Audit log และ system health

Dangerous-action guard

Exit criteria:

Hub user เข้า Admin API ไม่ได้

Admin route และ Admin API ตรวจ platform permission independently

Cross-organization access tests ผ่าน

RLS enabled สำหรับ tenant tables และ policy tests ผ่าน

Logout สำเร็จฝั่ง server ก่อน redirect

Phase 6 — Migrate Play merchant workspace (สัปดาห์ 18–23)

งาน:

Calendar/resource management

Availability rules

Reservation hold/confirm/cancel UI

Timezone-aware rendering

Notification and job states

Exit criteria:

Atomic hold tests ผ่าน

DST and timezone test matrix ผ่าน

Duplicate booking และ adjacent-slot concurrency tests ผ่าน

Online-only state ถูกสื่อสารใน UX ชัดเจน

Phase 7 — Build Aevocado Go surfaces (สัปดาห์ 20–27)

งาน:

เก็บ public/SEO shell ใน Astro

ย้าย cart/order/booking/queue เป็น React application flow

Public-link resolver และ domain resolver

Guest session และ verified customer

Custom theme tokens

Deep-link contract สำหรับ Capacitor ในอนาคต

Exit criteria:

QR เดียวเปิด web flow ได้ถูก store/table/intent

Custom domain ไม่สามารถสลับ tenant ด้วย client parameter

Guest checkout/order recovery ผ่าน

Public page SEO และ performance ไม่ถดถอยจาก baseline

Phase 8 — Consolidation and Astro retirement by surface (สัปดาห์ 26–30)

งาน:

ลบ Astro routes ที่ถูก cutover และไม่มี traffic

ลบ duplicate component/API wrapper

ตรวจ bundle และ dependency

ปิด compatibility adapter ตามกำหนด

อัปเดต onboarding, runbooks และ incident procedures

Astro ที่ยังคงไว้:

Marketing

Documentation/content

Go public storefront/SEO pages ที่ได้ประโยชน์จริง

Exit criteria:

ไม่มี business logic สำคัญซ้ำใน Astro และ React

Ownership และ deployment ของแต่ละ app ชัดเจน

Migration flags เก่าถูกลบ

9. Security gates

ทุก phase ที่มี production cutover ต้องผ่าน:

Authentication และ session refresh tests

Authorization Code/PKCE flow, state, one-time code และ replay protection tests

App-scoped cookie, audience และ cross-app isolation tests

Organization membership validation

App assignment validation

Store scope validation

Permission และ entitlement server-side check

RLS enabled และ policy tests

IDOR negative tests

Same-origin/allowlist validation สำหรับ redirect และ mutation

Safe intended-route restoration โดยไม่มี open redirect

Account, membership และ assignment revocation propagation

CORS รองรับ required methods/headers เช่น PATCH และ idempotency key

Service-role credential ไม่มีใน frontend

Rate limit สำหรับ public/customer endpoints

Audit log สำหรับ privileged action

Dependency and secret scanning

Subscription model คงหลักเดิม:

Stripe = billing state
Aevocado Core = entitlement/authorization
PostgreSQL RLS = tenant data isolation

10. Testing strategy

Unit tests

Domain rules

State transitions

Price/tax/discount calculations

Permission display model

Tenant/domain/public-link parsing

Date/time/timezone conversion

Contract tests

API request/response schema

Error shape

Idempotency behavior

Auth refresh/revocation

Entitlement result

Legacy Astro and new React client parity

Integration tests

Supabase/PostgreSQL RLS policies

Stripe webhook → subscription → entitlement

Booking hold concurrency

Order state transitions

Customer domain resolver

E2E tests

Merchant signup/login

Accounts SSO → Hub/Play/POS direct entry

Staff invitation → assigned app

User with POS-only access denied from Hub and Play

Multi-organization/store context selection

App logout, global logout, session expiry และ safe route restoration

Create/select organization and store

POS order lifecycle

Go QR order

Play booking

Admin support/audit flow

Subscription access denied/allowed

Non-functional tests

Accessibility

Mobile/responsive

Performance budgets

Error recovery

Network interruption/retry

Cross-browser

11. CI/CD and release strategy

Pipeline ต่อ app:

Install
→ Dependency boundary check
→ Typecheck
→ Lint
→ Unit tests
→ Contract tests
→ Build
→ Security checks
→ Preview deployment
→ E2E smoke
→ Manual/automated promotion

Release requirements:

Preview URL ต่อ branch/commit

Environment variables validated ก่อน build/deploy

Database migration แยกจาก app rollout

Backward-compatible API อย่างน้อยหนึ่ง release window

Feature flag และ organization canary

Rollback ไม่ต้อง revert database migration ที่ destructive

Source maps, version tag และ release marker ใน error monitoring

12. Observability

มาตรฐาน event/context:

request_id

trace_id

app_name

app_version

environment

organization_id และ store_id เมื่อปลอดภัย

user/session type

route/action

error code

latency

retry/idempotency metadata

Dashboard ขั้นต่ำ:

Login/session refresh failure

401/403/429/5xx rate

Order creation success/duplicate/failure

Booking conflict/failure

Payment webhook lag/failure

Frontend route crash

Deployment comparison ก่อนและหลัง migration

13. Data and compatibility policy

Frontend migration ห้ามเปลี่ยน data ownership โดยไม่ทำ ADR

API field deprecation ต้องมี warning และ removal date

Database migration ต้องมี checksum และ concurrency-safe recording

Legacy duplicate data ต้อง cleanup ก่อนเพิ่ม unique index

Client-generated ID ใช้ UUID/ULID ตาม contract เดียวกัน

Mutation ที่ retry ได้ต้องมี idempotency key

Event schema ต้อง versioned

14. Offline scope ก่อน Local Store Hub

ระยะปัจจุบันรองรับเฉพาะ single-device resilience และ cloud reconciliation:

อนุญาต:

Cache catalog/configuration

Recover cart/draft หลัง refresh/crash

Pending mutation queue สำหรับ action ที่ประกาศว่า retry-safe

Connection indicator

Read-only stale data พร้อม timestamp

Idempotent retry เมื่อกลับ online

ไม่รับประกัน:

POS และ Kiosk หลายเครื่องเห็น state ตรงกันขณะ internet ล่ม

Queue ordering ข้ามหลายอุปกรณ์เมื่อ offline

Offline payment/refund

Offline entitlement/permission escalation

Booking confirmation แบบ offline

UX ต้องสื่อสถานะ ONLINE, DEGRADED, OFFLINE_READ_ONLY หรือ SYNC_PENDING อย่างชัดเจน ห้ามแสดงว่า transaction เสร็จสมบูรณ์หาก server ยังไม่ยืนยัน

15. Future roadmap: Local Store Hub

Local Store Hub จะเริ่มเมื่อมี business trigger อย่างน้อยหนึ่งข้อ:

ร้านต้องทำงานหลายเครื่องขณะ internet ล่มอย่างต่อเนื่อง

Kiosk, POS, Kitchen และ Queue ต้อง share authority ผ่าน LAN

มี SLA ด้าน offline operation ที่วัดได้

มีลูกค้า pilot และ hardware/network profile ชัดเจน

Future phases:

Future A — Discovery and protocol design

Store topology และ device inventory

LAN discovery/security model

Command/event contract

Conflict and authority rules

Device enrollment/certificate

Threat model

Future B — Local Hub MVP

Per-store edge service

SQLite เริ่มต้น

REST commands + WebSocket events

Local ordering/queue authority

Outbox และ idempotent cloud sync

Health/backup/update mechanism

Future C — Pilot

ร้านทดสอบจำนวนจำกัด

Failure injection: internet loss, reboot, duplicate event และ clock drift

Remote diagnostics

Recovery runbook

Future D — General availability

Signed update

Fleet/device management

Observability และ support tooling

PostgreSQL option เฉพาะสาขาที่ scale สูง

สิ่งที่ทำตอนนี้เพื่อไม่ให้รื้อภายหลังมีเพียง:

Repository interface

Idempotency key

Stable entity/event ID

Versioned command/event schema

Explicit sync status

Device identity placeholder

ห้ามสร้าง Local Hub process, LAN discovery หรือ multi-master synchronization ใน migration ปัจจุบัน

16. Risks and mitigations

Risk

Mitigation

Big-bang rewrite

Route/app-level strangler migration

Feature delivery หยุดนาน

Phase overlap และ shared packages ใช้กับ Astro เดิมได้

Logic parity ไม่ครบ

Contract tests และ shadow telemetry

Auth regression

Session lifecycle E2E และ canary rollout

Tenant data leak

RLS/IDOR tests เป็น release gate

UI แตกต่างหลายแอป

Design system ก่อน mass migration

React state กระจัดกระจาย

กำหนด state ownership และห้าม global store เป็น default

Offline ถูกคาดหวังเกินจริง

ประกาศ scope/status ชัดเจนและ defer Local Hub

Cloudflare/runtime mismatch

Runtime-compatible packages และ preview tests

Migration flags ค้างถาวร

ใส่ owner และ expiration ทุก flag

17. Team ownership

แนะนำ ownership ตาม capability:

Platform foundation: monorepo, CI, contracts, auth, observability

Design system: tokens, components, accessibility

Commerce: catalog, order, POS, payment presentation

Scheduling: Play, availability, booking

Customer experience: Go, QR, domain, guest/customer identity

Platform operations: Admin, audit, system health

ทุก package/app ต้องมี:

Owner

README และ boundary

Test command

Deploy/runbook

SLO หรืออย่างน้อย critical metrics

18. Milestones

Milestone

Outcome

M0 Architecture locked

Inventory, ADRs, boundaries และ baseline พร้อม

M1 Foundation ready

Monorepo, typed API, auth/tenant packages และ CI พร้อม

M2 Design system ready

Core components และ UX states พร้อมใช้

M3 Domain extraction

Logic สำคัญไม่ผูก Astro

M4 POS pilot

React POS ใช้งาน pilot และ rollback ได้

M5 Hub/Admin cutover

Merchant/platform workspaces ย้ายสำเร็จ

M6 Play cutover

Booking workspace ย้ายพร้อม concurrency tests

M7 Go transaction flow

QR/order/booking/queue ทำงานบน shared React layer

M8 Consolidation

ลบ legacy และคง Astro เฉพาะ public surfaces

Future M9 Local Hub discovery

เริ่มเมื่อ business trigger ผ่านเท่านั้น

19. Definition of done สำหรับการย้ายหนึ่ง feature

Feature ถือว่าย้ายเสร็จเมื่อ:

Business rules อยู่ใน domain/application layer

React UI ใช้ design system

Loading/error/empty/permission/retry states ครบ

API contract typed

Server-side auth/permission/entitlement ผ่าน

Unit + integration + E2E critical path ผ่าน

Observability และ error code พร้อม

Accessibility และ responsive ผ่าน

Feature flag/canary plan พร้อม

Rollback path ผ่านการทดสอบ

Legacy implementation ถูกกำหนด removal date

20. Immediate next actions

ลำดับงาน 10 รายการแรก:

เปลี่ยน naming ในเอกสารและ package scope เป็น Aevocado/@aevocado/\*

สร้าง ADR สำหรับ framework allocation, SSO boundary และ Local Hub deferral

ทำ route/API/auth inventory ของ Hub, Admin, Go, Play และ POS

นิยาม Accounts host, app registry, callback และ app-scoped session contract

ออกแบบ membership, app assignment, scope, role และ permission schema

ตั้ง monorepo boundary และ CI baseline

สร้าง api-contract, api-client, auth-client, app-access, tenant-context

สร้าง design tokens และ shared access UX states

ทำ Play/POS direct-entry SSO pilot พร้อม Hub access isolation

เพิ่ม security/contract/E2E gates แล้วจึงเริ่ม React POS migration

21. Final decision

Aevocado จะไม่ย้ายจาก Astroไป framework เดียวทั้งแพลตฟอร์ม แต่ใช้ fit-for-purpose frontend architecture:

Astro = public content and SEO
React Router Framework = authenticated web workspaces
React + Vite = operational SPA and future packaged apps
Capacitor/Tauri = packaging layer when product requirements justify it
Aevocado Core = trusted business and authorization layer
Aevocado Accounts = shared authentication and app-aware SSO entry
Hub = Owner/Organization Manager control plane, not mandatory staff entry
Play/POS = direct staff entry with app-specific assignment and scope
Local Store Hub = future roadmap, not current dependency

แผนนี้ให้ความสำคัญกับการแยก domain, typed contract, security, migration safety และ operational visibility มากกว่าการ rewrite ด้วย framework ใหม่เพียงอย่างเดียว
