# Aevo Runtime Architecture และ Deployment Assessment

ตรวจจาก source และ infrastructure ณ วันที่ 23 กันยายน 2026 ครอบคลุม
`aevo-background-worker`, `aevo-contracts`, `aevo-core-api`, `aevo-edge-gateway`
และ Terraform ใน `aevo-infrastructure`.

## สรุปคำแนะนำ

สำหรับ production ให้ใช้สถาปัตยกรรมแบบผสมดังนี้:

| ส่วน | แพลตฟอร์มที่แนะนำ | เหตุผล |
| --- | --- | --- |
| Public API edge | Cloudflare Workers (`aevo-edge-gateway`) | Source ใช้ Workers runtime และ Wrangler อยู่แล้ว ทำ HMAC/request-id ที่ edge |
| Core API | Google Cloud Run service | มี Dockerfile สำหรับ ASP.NET Core/.NET 10 และต้องเชื่อม Cloud SQL ผ่าน VPC |
| Database | Cloud SQL for PostgreSQL | เป็น database authority ที่ migration ระบุไว้โดยตรง |
| Event processing | Pub/Sub + Cloud Tasks + Cloud Run service | เป็น primitives ที่ repository และ Terraform ตั้งใจใช้ |
| Database migration | Cloud Run Job | migrator เป็น process แบบ run-to-completion ไม่ควรรันพร้อมทุก API replica |
| Shared contracts | npm package (`@aevocado/contracts`) | เป็น TypeScript/OpenAPI contract ไม่ใช่ runtime service |

ข้อสรุปคือ Cloud Run เหมาะกับระบบชุดนี้มากกว่า Zeabur สำหรับ production โดยเฉพาะ
`core-api` และ eventing. Zeabur ใช้ได้กับ demo หรือ staging ที่ต้องการ deploy เร็ว
แต่ไม่ควรเป็น production control plane ใน topology ปัจจุบัน เพราะ database เป็น
Cloud SQL private network และ eventing/auth/IAM ผูกกับ Google Cloud.

## ภาพรวมการทำงานปัจจุบัน

```text
Browser / Aevo applications
          |
          v
Cloudflare Worker: aevo-edge-gateway
  - /health, /ready
  - proxy เฉพาะ /api/*
  - สร้าง request id
  - HMAC(timestamp, method, path/query, body hash)
          |
          v
Cloud Run: aevo-core-api
  - ASP.NET Core/.NET 10, port 8080
  - app-scoped session และ CSRF
  - authorization / tenant / store scope
  - Cloud SQL PostgreSQL
  - เรียก Accounts boundary ตอน login
          |
          +--> intended: outbox -> Pub/Sub -> aevo-background-worker
                                      -> inbox/idempotency -> Cloud Tasks
          |
          +--> Cloud Run Job: Core API database migrator
```

เส้นทาง event ในภาพเป็น design ที่ README และ Terraform เตรียมไว้ แต่ยังไม่ใช่
เส้นทางที่ทำงานครบใน source ปัจจุบัน.

## รายละเอียดแต่ละ application

### 1. `aevo-edge-gateway`

ไฟล์หลัก: [`src/index.ts`](aevo-edge-gateway/src/index.ts),
[`wrangler.jsonc`](aevo-edge-gateway/wrangler.jsonc),
[`deploy.yml`](aevo-edge-gateway/.github/workflows/deploy.yml)

- เป็น Cloudflare Worker (`ExportedHandler`) ไม่ใช่ Node HTTP server และไม่ใช่ Docker service
- `/health` ตอบ liveness เสมอ
- `/ready` พร้อมเมื่อมี `AEVO_CORE_API_ORIGIN` และ `AEVO_GATEWAY_SIGNING_SECRET`
- รับเฉพาะ path ที่ขึ้นต้นด้วย `/api/`; path อื่นตอบ `404`
- ก่อนส่งต่อจะลบ gateway headers เดิม แล้วใส่ gateway identity, timestamp, HMAC signature และ `x-request-id`
- response ถูกบังคับ `cache-control: no-store` เพื่อไม่ cache personalized response
- secret ต้องเก็บด้วย `wrangler secret put`/secret store ไม่ใช่ `vars` หรือไฟล์ที่ commit
- มี environment `preview`, `staging`, `production` แต่ `AEVO_CORE_API_ORIGIN` ของทั้งสาม environment ยังเป็นค่าว่างใน config ปัจจุบัน

ดังนั้น service นี้ควร deploy ด้วย Wrangler ต่อไป ไม่ควรย้ายไป Zeabur หรือ Cloud Run
โดยไม่เขียน runtime adapter ใหม่.

### 2. `aevo-core-api`

ไฟล์หลัก: [`Program.cs`](aevo-core-api/src/Aevo.CoreApi/Program.cs),
[`HubApiEndpoints.cs`](aevo-core-api/src/Aevo.CoreApi/HubApiEndpoints.cs),
[`CoreDataStore.cs`](aevo-core-api/src/Aevo.CoreApi/Data/CoreDataStore.cs),
[`Dockerfile`](aevo-core-api/Dockerfile)

เป็น ASP.NET Core/.NET 10 container ฟัง port `8080` และทำหน้าที่เป็น authority boundary:

- liveness: `/health/live`, `/health`
- readiness: `/ready` ตรวจ configuration และเชื่อมต่อ PostgreSQL จริง
- session/user: `/v1/me`, `/v1/access`
- login/refresh/logout และ compatibility routes ใต้ `/api/auth/*`
- Admin: connections, audit logs, application status, Aevo Go settings/feature flags
- internal auth boundary สำหรับ Accounts ที่ `/internal/auth/sessions*`
- internal connection probe ที่ `/internal/application-connections/probe`
- Hub API ใต้ `/api/v1/hub/*` โดยมี route implementation ใน `HubApiEndpoints.cs`

รูปแบบ auth คือ browser ถือ opaque app-scoped session cookie และ CSRF cookie;
Core API เก็บ hash ของ session/CSRF token ใน Cloud SQL ไม่ส่ง provider bearer token
ไปให้ browser. Production จะตรวจ HMAC gateway header สำหรับ `/api/*` แล้วจึงตรวจ
session, platform role, application assignment และ permission.

Migration `0001` ถึง `0006` อยู่ใน [`db/migrations`](aevo-core-api/db/migrations)
และมี migrator แยกที่
[`Aevo.CoreApi.Migrator`](aevo-core-api/src/Aevo.CoreApi.Migrator). API replica
ไม่ควร apply migration ตอน startup.

### 3. `aevo-background-worker`

ไฟล์หลัก: [`src/index.ts`](aevo-background-worker/src/index.ts),
[`Dockerfile`](aevo-background-worker/Dockerfile),
[`README.md`](aevo-background-worker/README.md)

ปัจจุบันเป็น Node HTTP server ที่ใช้ Bun build แล้วรันด้วย Node 22:

- `/health` ตอบ `healthy`
- `/ready` ต้องมี `AEVO_DATABASE_URL`, `AEVO_PUBSUB_TOPIC` และ `AEVO_TASK_QUEUE`
- `POST /internal/pubsub` ตรวจ `x-aevo-worker-token` และ payload `eventId/eventType`
- `POST /internal/probe` ตรวจ shared secret, probe health URL ที่ allowlist เป็น HTTPS/localhost แล้วเขียนผลไป Core API

แต่ `POST /internal/pubsub` ยังตอบ `503 WORKER_NOT_CONFIGURED` หลัง validate
payload ทุกกรณี และยังไม่พบโค้ดที่:

- consume หรือ decode Pub/Sub message จริง
- persist inbox/idempotency ก่อน acknowledge
- อ่าน outbox จาก database
- สร้างหรือ handle Cloud Tasks
- ทำ dead-letter handling/metrics

จึงยังไม่ควรเรียกว่า background worker ที่พร้อมรับ production event แม้ container
จะ build ได้แล้ว. รูปแบบ HTTP ที่มีอยู่เหมาะกับ Pub/Sub push และ Cloud Tasks HTTP target
หลังจากเติม handler และ IAM ให้ครบ.

### 4. `aevo-contracts`

ไฟล์หลัก: [`src/index.ts`](aevo-contracts/src/index.ts),
[`src/client.ts`](aevo-contracts/src/client.ts),
[`openapi/v1.json`](aevo-contracts/openapi/v1.json)

เป็น package `@aevocado/contracts` สำหรับ:

- application code และ typed response models
- shared `ApiClient`/`ContractsClient`
- Hub route inventory
- OpenAPI v1 ที่ review ได้

Release workflow จะ publish ไป npm เมื่อ push tag รูปแบบ `v*.*.*`. Package นี้ไม่ต้อง
deploy เป็น service และไม่ควรมี database credentials หรือ Supabase service key.

## Flow สำคัญ

### Request และ login

1. Browser เรียก `/api/*` ที่ edge gateway
2. Edge สร้าง request id และ HMAC แล้วส่งต่อไป Core API
3. Core API ตรวจ gateway identity/signature ใน production
4. Login ส่งต่อไป Accounts ด้วย `x-aevo-accounts-secret`
5. Core API รับ identity/session projection แล้ว set app-specific session และ CSRF cookies
6. Request ถัดไป resolve session จาก hash ใน Cloud SQL, touch idle timeout และเช็ค scope/permission

### Connection probe

1. Operator ตั้ง `AEVO_PROBE_TARGETS` เป็น JSON ของ app health URLs
2. Worker เรียก `/internal/probe` ด้วย shared secret
3. Worker เรียก `/health` ของแต่ละ application เฉพาะ HTTPS/localhost
4. Worker ส่งผลจริงไป Core API `/internal/application-connections/probe`
5. Core API upsert status/latency/error ลง `aevo_application_connections`

### Event processing ที่ตั้งใจไว้

Business write ควร commit outbox record ใน transaction เดียวกับข้อมูลหลัก จากนั้น
Pub/Sub ส่ง event ไป worker; worker ต้องบันทึก inbox/idempotency ก่อนตอบ 2xx และใช้
Cloud Tasks สำหรับ command ที่ต้อง retry. ถ้าทำไม่สำเร็จต้องตอบ non-2xx หรือปล่อย
ack deadline หมดเพื่อให้ Pub/Sub retry/DLQ ทำงาน.

## สิ่งที่พร้อมและสิ่งที่ยังไม่พร้อม

### ผ่านการตรวจในเครื่อง

- `aevo-background-worker`: typecheck, 3 tests และ build ผ่าน
- `aevo-edge-gateway`: typecheck, 2 tests และ Wrangler dry-run ผ่าน
- `aevo-contracts`: OpenAPI validation, typecheck, tests และ build ผ่าน
- `aevo-core-api`: Release build ผ่าน ไม่มี warning/error
- Core API migrator: Release build ผ่าน
- `aevo-infrastructure`: manifest check และ Terraform validate ของ bootstrap/nonprod/prod ผ่าน

Docker image build ยังไม่ได้ทดสอบจริง เพราะ Docker daemon ของเครื่องนี้ไม่ทำงาน.
ยังไม่มีการ deploy ไป cloud หรือทดสอบกับ credentials/database จริง.

### Blocker ก่อน production

1. **Worker ยังไม่ทำงานจริง**: Pub/Sub boundary เป็น scaffold และไม่มี inbox/outbox/task implementation
2. **Terraform eventing ไม่ตรงกับ worker runtime**: subscription ปัจจุบันเป็น pull subscription แต่ worker เป็น HTTP server; ไม่มี `push_config`/OIDC หรือ subscriber loop
3. **Terraform ไม่ส่ง topic/queue ให้ worker**: `AEVO_PUBSUB_TOPIC` และ `AEVO_TASK_QUEUE` ถูกใส่ใน Core API container แต่ไม่ได้ใส่ใน worker container ทำให้ worker `/ready` เป็น 503
4. **ยังไม่มี Cloud Run Job resource สำหรับ migrator**: มี migration project และ migrate service account แต่ Terraform ยังไม่ได้สร้าง job/image/deploy sequence
5. **Secret Manager ยังไม่มี secret version ใน Terraform**: สร้าง secret และ IAM แล้ว แต่ต้องเติมค่าผ่าน secure pipeline; production ควร pin version แทนการใช้ `latest` กับ environment variable
6. **Edge production config ยังไม่ครบ**: `AEVO_CORE_API_ORIGIN` ว่างและ workflow deploy ยังไม่ provision `AEVO_GATEWAY_SIGNING_SECRET`
7. **Core/Edge ingress ยังไม่ถูกกำหนดใน Terraform**: ต้องตัดสินใจว่าจะให้ Cloudflare เรียก Cloud Run ผ่าน public endpoint ที่ตรวจ HMAC หรือวาง authenticated/private load-balancing path; ถ้า Cloud Run เป็น private อย่างเดียว Edge code ปัจจุบันไม่ได้ส่ง Google identity token
8. **Contract metadata ยังเสี่ยง drift**: `aevo-core-api` มี Hub endpoint implementation และ `HubApiContracts` ระบุ route inventory ปัจจุบัน แต่ `aevo-contracts/openapi/v1.json` ยังประกาศ implemented route count เป็น `1` และ status `partial`; ต้องเลือก source of truth และ update ให้ตรงก่อน release
9. **RLS context ยังต้องตรวจให้จบ**: migration README กำหนด `set_config('aevo.user_id'...)` แบบ transaction-local แต่จาก source ที่ตรวจไม่พบการเรียก `set_config`/`SET LOCAL`; ต้องทำ integration test กับ PostgreSQL เพื่อยืนยัน tenant isolation และ pool reuse
10. **Test ยังไม่ใช่ end-to-end**: tests ปัจจุบันเน้น config gate/contract shape; ยังไม่มี test จริงของ Cloud SQL, HMAC end-to-end, Pub/Sub retry/DLQ, Cloud Tasks และ cookie domain ผ่าน edge

## ประเมิน Cloud Run เทียบกับ Zeabur

### Google Cloud Run — เหมาะกับ production

Cloud Run deploy container ที่มีอยู่ได้โดยตรง, ต่อ Cloud SQL, รับ Pub/Sub push และให้
Cloud Tasks ยิง HTTP target พร้อม OIDC ได้. Cloud Run ยังมี Jobs สำหรับ migration และ
batch ที่ run จนจบ จึงเข้ากับ separation ที่ repository ออกแบบไว้.

ข้อควรทำเพิ่มคือกำหนด IAM/service accounts แยก `core-api`, `worker`, `migrate`,
กำหนด ingress/authentication ให้ชัด, จำกัด max instances/DB connections และสร้าง
Pub/Sub push subscription พร้อม dead-letter IAM ให้ครบ.

### Zeabur — เหมาะกับ demo/staging มากกว่า

Zeabur deploy Dockerfile และตั้ง environment variables ได้ง่าย รวมถึงมี private
network สำหรับ service ที่อยู่ใน project เดียวกัน. แต่ private network นั้นไม่ใช่
เส้นทางเข้า Cloud SQL private VPC ของ Google Cloud. ถ้าเอา Core API ไป Zeabur จะต้อง
เปลี่ยน database เป็น endpoint ที่ Zeabur เข้าถึงได้, เปิด network path เพิ่ม หรือ
ใช้ database อื่น และยังต้องคง Pub/Sub/Cloud Tasks/Secret Manager/IAM ไว้ที่ GCP
แยกต่างหาก.

จึงแนะนำ Zeabur เฉพาะกรณีต่อไปนี้:

- demo หรือ preview ชั่วคราว
- worker/API ที่ใช้ database ภายนอกแบบ public TLS และไม่มีข้อมูล production
- ทีมต้องการลดเวลาตั้งค่าและยอมรับการดูแลสอง cloud

ไม่แนะนำให้ใช้ Zeabur เป็นที่ deploy `core-api` production ใน topology ปัจจุบัน.
ถ้าต้องการลดจำนวนผู้ให้บริการ ให้ใช้ GCP ทั้ง backend แล้วคง Cloudflare เฉพาะ edge;
ถ้าต้องการลดความซับซ้อนมากที่สุดสำหรับ MVP ให้ย้ายทั้ง backend/database/eventing ไป
แพลตฟอร์มเดียว แต่จะเป็นการเปลี่ยน architecture ไม่ใช่แค่เปลี่ยนที่ deploy.

## Deployment plan ที่แนะนำ

ขั้นตอน production แบบลงรายละเอียด คำสั่ง และ configuration matrix อยู่ใน
[GOOGLE_CLOUD_RUN_PRODUCTION_RUNBOOK.md](GOOGLE_CLOUD_RUN_PRODUCTION_RUNBOOK.md)

1. ทำให้ Pub/Sub เป็น **push subscription ไป worker Cloud Run** หรือ implement pull subscriber ให้เป็น runtime ที่เหมาะสม; แนะนำ push เพราะ worker ปัจจุบันเป็น HTTP server
2. เติม worker event handler, inbox/idempotency, Cloud Tasks handler, retry และ DLQ observability
3. เพิ่ม `AEVO_PUBSUB_TOPIC`/`AEVO_TASK_QUEUE` ใน worker Cloud Run env และเพิ่ม IAM สำหรับ Pub/Sub invoker/Cloud Tasks invoker
4. เพิ่ม Cloud Run Job `aevo-db-migration` ที่ใช้ migrator image และ migration-only service account
5. สร้าง Artifact Registry/build pipeline และ deploy images ด้วย immutable digest
6. เติม Secret Manager versions ผ่าน protected pipeline และ pin version ใน Cloud Run
7. Apply migrations แบบ `dry-run -> apply -> verify` ก่อนเปิด protected route; ห้ามให้ API replica migrate เอง
8. กำหนด Core API ingress/auth path และทดสอบว่า request ตรงเข้า Cloud Run ไม่ bypass policy
9. Deploy Core API non-prod แล้ว smoke test `/health`, `/ready`, `/v1/meta`, login/session และ `/api/v1/hub/contract`
10. ทดสอบ Pub/Sub duplicate/retry/DLQ และ Cloud Tasks retry ก่อนเปิด worker production
11. ตั้งค่า Cloudflare Worker origin + signing secret แยก environment แล้ว deploy edge เป็นขั้นสุดท้าย
12. Update/publish `@aevocado/contracts` ให้ OpenAPI metadata ตรงกับ Core API แล้วค่อย migrate consumers

## แหล่งอ้างอิงแพลตฟอร์ม

- [Cloud Run: deploy container images](https://docs.cloud.google.com/run/docs/deploying)
- [Cloud Run กับ Cloud SQL for PostgreSQL](https://docs.cloud.google.com/sql/docs/postgres/connect-run)
- [Cloud Run กับ Pub/Sub push](https://docs.cloud.google.com/run/docs/tutorials/pubsub)
- [Cloud Tasks HTTP target และ OIDC](https://docs.cloud.google.com/tasks/docs/creating-http-target-tasks)
- [Cloud Run Jobs](https://docs.cloud.google.com/run/docs/create-jobs)
- [Cloud Run ingress](https://docs.cloud.google.com/run/docs/securing/ingress)
- [Cloud Run secrets](https://docs.cloud.google.com/run/docs/configuring/services/secrets)
- [Cloudflare Workers deployment](https://developers.cloudflare.com/workers/get-started/guide/)
- [Cloudflare Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Zeabur Dockerfile deployment](https://zeabur.com/docs/en-US/deploy/methods/dockerfile)
- [Zeabur private networking](https://zeabur.com/docs/en-US/deploy/networking/private-networking)
