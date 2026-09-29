# Aevo Production Runbook: Google Cloud Run

เอกสารนี้เป็นขั้นตอน deploy และ production configuration สำหรับ
aevo-core-api, aevo-background-worker และ aevo-edge-gateway
โดยตรวจจาก source และ Terraform ณ วันที่ 23 กันยายน 2026

Runbook นี้ยังไม่ได้รันคำสั่ง deploy ให้จริง และใช้ค่า placeholder
เพื่อไม่ให้ผูกกับ Google Cloud project หรือ secret ของ production

## 1. Architecture ที่ใช้ใน Production

| ส่วน | บริการ | ค่าเริ่มต้นใน repository |
| --- | --- | --- |
| Public edge | Cloudflare Worker | aevo-edge-gateway-production |
| Core API | Cloud Run service | aevo-core-api-production |
| Background worker | Cloud Run service | aevo-background-worker-production |
| Database | Cloud SQL for PostgreSQL | aevo-production-postgres / database aevo |
| Migration | Cloud Run Job | aevo-core-api-migration-production |
| Domain events | Pub/Sub | aevo-production-domain-events |
| Dead letter | Pub/Sub | aevo-production-domain-events-dead-letter |
| Commands | Cloud Tasks | aevo-production-commands |
| Images | Artifact Registry | repository aevo ใน asia-southeast1 |

แนะนำให้ Core API, Worker, Cloud SQL, Pub/Sub และ Cloud Tasks อยู่ region เดียวกัน
คือ asia-southeast1 ก่อน หาก latency หรือ data residency ต้องการ region อื่น
ให้เปลี่ยนทั้งชุด ไม่ควรย้ายเฉพาะ Cloud Run

## 2. สิ่งที่ต้องแก้ก่อน Production apply

ห้ามรัน production apply จาก state ปัจจุบันโดยไม่แก้รายการต่อไปนี้ก่อน

| รายการ | สถานะปัจจุบัน | สิ่งที่ต้องทำ |
| --- | --- | --- |
| Core API image | Dockerfile อ้างถึง Directory.Packages.props แต่ไฟล์นี้ไม่มีอยู่จริง | เพิ่มไฟล์ให้ถูกต้อง หรือเอาไฟล์นี้ออกจาก COPY แล้วทดสอบ Docker/Cloud Build |
| Worker event handler | POST /internal/pubsub validate payload แล้วตอบ 503 WORKER_NOT_CONFIGURED | เติม Pub/Sub decode, inbox/idempotency, handler และ success path ที่ตอบ 2xx |
| Pub/Sub subscription | Terraform สร้างเป็น pull subscription | เปลี่ยนเป็น push ไป Worker หรือเขียน pull subscriber จริง |
| Pub/Sub authentication | Worker คาดหวัง x-aevo-worker-token แต่ Pub/Sub push จะใช้ OIDC Authorization | ให้ Worker ตรวจ OIDC token หรือวาง authenticated adapter และคง shared secret เป็น defense-in-depth |
| Worker runtime env | Terraform มีตัวแปร worker_pubsub_topic/worker_task_queue แต่ไม่ได้ส่งเข้า worker container | เพิ่ม AEVO_PUBSUB_TOPIC และ AEVO_TASK_QUEUE ใน Worker |
| Cloud Tasks | ยังไม่มี task handler และ IAM ครบ | เพิ่ม task contract, retry policy, OIDC service account และ run.invoker |
| Migration | มี migrator project แต่ไม่มี migration image และ Cloud Run Job resource | สร้าง image ที่บรรจุ db/migrations และ Job แยกจาก API |
| Secret IDs | Terraform ใช้รูปแบบ aevo/production/name ซึ่งมี slash | เปลี่ยนเป็น ID ที่มีเฉพาะตัวอักษร ตัวเลข hyphen หรือ underscore เช่น aevo-production-core-api-session-secret |
| Secret versions | Terraform สร้าง secret container แต่ไม่สร้าง version และ Cloud Run ใช้ latest | ใส่ค่าผ่าน protected pipeline แล้ว pin เป็นเลข version |
| Secret IAM | ปัจจุบัน grant runtime accounts ทุกตัวเข้าถึงทุก secret | จำกัดเป็นราย service และให้ migration account เห็นเฉพาะ database secret |
| Core/Edge auth | Cloudflare Worker ไม่ส่ง Google ID token และ Core ingress ยังไม่กำหนด | เลือก public Cloud Run + strict HMAC หรือทำ load balancer/private auth ให้เสร็จก่อน |
| Edge production | AEVO_CORE_API_ORIGIN ยังว่าง และ workflow ไม่ใส่ signing secret | ตั้ง origin ที่เป็น Core API URL และ provision secret ใน Cloudflare environment |
| Database isolation | ยังไม่มี integration proof ของ transaction-local tenant context | ทดสอบ RLS/pool reuse กับ PostgreSQL จริงก่อนเปิดข้อมูลหลาย tenant |

จุดอ้างอิงหลักคือ
aevo-infrastructure/modules/cloud-run/main.tf,
aevo-infrastructure/modules/eventing/main.tf,
aevo-infrastructure/modules/secret-manager/main.tf
และ aevo-core-api/Dockerfile

## 3. Production naming และตัวแปรที่ใช้ในคำสั่ง

กำหนดค่าเฉพาะ deployment นี้ใน terminal หรือ CI environment
อย่าใส่ secret ลงใน shell history, terraform.tfvars หรือ git

    export GCP_PROJECT_ID="REPLACE_WITH_PRODUCTION_PROJECT_ID"
    export GCP_BOOTSTRAP_PROJECT_ID="REPLACE_WITH_STATE_PROJECT_ID"
    export GCP_REGION="asia-southeast1"
    export TF_STATE_BUCKET="REPLACE_WITH_GLOBALLY_UNIQUE_STATE_BUCKET"
    export TF_STATE_PREFIX="aevo/prod"
    export AR_REPOSITORY="aevo"
    export RELEASE="20260923-01"

ถ้าใช้ project เดียวเป็นทั้ง runtime และ state ให้ตั้ง
GCP_BOOTSTRAP_PROJECT_ID เท่ากับ GCP_PROJECT_ID ได้ แต่ production ที่จริงจัง
ควรแยก project สำหรับ Terraform state และจำกัด IAM ให้แคบที่สุด

## 4. สิทธิ์และเครื่องมือ

ผู้ deploy ต้องมีสิทธิ์ตามหน้าที่ ไม่ควรใช้ owner account เป็นค่า default

- Terraform operator: จัดการ service, network, SQL, IAM, Pub/Sub, Tasks และ Secret Manager ตาม stack
- Image builder: Cloud Build และ Artifact Registry writer
- Runtime service accounts: secret accessor และสิทธิ์ของ service ที่จำเป็นเท่านั้น
- GitHub Actions: Workload Identity Federation ไม่ใช้ service-account JSON key
- Cloudflare deployer: API token ที่จำกัด account/worker scope

ติดตั้งหรือยืนยันเครื่องมือก่อนเริ่ม:

    gcloud version
    terraform version
    docker version
    bun --version

Docker daemon ไม่จำเป็นถ้าใช้ Cloud Build แต่ต้องแก้ Dockerfile และให้ Cloud Build
build สำเร็จก่อนนำ digest ไปใส่ Terraform

## 5. เปิด Google APIs และสร้าง Artifact Registry

ตั้ง project ปัจจุบันให้ตรงก่อน:

    gcloud auth login
    gcloud config set project "$GCP_PROJECT_ID"

เปิด API ที่ runtime และ pipeline ใช้:

    gcloud services enable artifactregistry.googleapis.com cloudbuild.googleapis.com run.googleapis.com cloudsqladmin.googleapis.com secretmanager.googleapis.com pubsub.googleapis.com cloudtasks.googleapis.com vpcaccess.googleapis.com servicenetworking.googleapis.com compute.googleapis.com iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com logging.googleapis.com monitoring.googleapis.com serviceusage.googleapis.com --project="$GCP_PROJECT_ID"

สร้าง Docker repository ครั้งเดียว:

    gcloud artifacts repositories create "$AR_REPOSITORY" --repository-format=docker --location="$GCP_REGION" --project="$GCP_PROJECT_ID"

Terraform envs/prod เปิด API หลักไว้แล้ว แต่ปัจจุบันยังไม่มี
cloudbuild.googleapis.com ใน enabled_services; ให้เพิ่มใน Terraform หรือเปิดด้วย
คำสั่งด้านบนและคง source of truth ให้ชัดเจน

## 6. สร้าง Terraform state และเชื่อม backend

### 6.1 Bootstrap state bucket

ใช้ bootstrap project และ bucket ที่ชื่อไม่ซ้ำทั้ง Google Cloud:

    terraform -chdir=aevo-infrastructure/bootstrap init -backend=false
    terraform -chdir=aevo-infrastructure/bootstrap apply -var="project_id=$GCP_BOOTSTRAP_PROJECT_ID" -var="state_bucket_name=$TF_STATE_BUCKET" -var="region=$GCP_REGION"

ตรวจว่า bucket เปิด versioning, uniform access, public access prevention
และ retention policy ตามที่ bootstrap กำหนด

### 6.2 ตั้งค่า production backend

สร้างไฟล์ local ชื่อ aevo-infrastructure/envs/prod/terraform.tfvars
จาก terraform.tfvars.example แล้วเติมเฉพาะ project, image digest และ origin ที่อนุญาต
ไฟล์นี้ต้องอยู่ใน .gitignore และห้ามใส่ secret value

ตัวอย่างค่า:

    project_id = "REPLACE_WITH_PRODUCTION_PROJECT_ID"
    region = "asia-southeast1"
    api_image = "asia-southeast1-docker.pkg.dev/REPLACE_WITH_PRODUCTION_PROJECT_ID/aevo/core-api@sha256:REPLACE_WITH_DIGEST"
    worker_image = "asia-southeast1-docker.pkg.dev/REPLACE_WITH_PRODUCTION_PROJECT_ID/aevo/background-worker@sha256:REPLACE_WITH_DIGEST"
    accounts_api_origin = "https://REPLACE_WITH_ACCOUNTS_ORIGIN"

ต่อ production stack กับ GCS backend:

    terraform -chdir=aevo-infrastructure/envs/prod init -reconfigure -backend-config="bucket=$TF_STATE_BUCKET" -backend-config="prefix=$TF_STATE_PREFIX"

ถ้าเคยรันด้วย local state แล้ว ให้สำรอง state และใช้ -migrate-state
หลังตรวจ bucket และสิทธิ์เรียบร้อย ห้ามคัดลอก state ไปเก็บใน git

ตรวจ format และ validate:

    terraform -chdir=aevo-infrastructure fmt -check -recursive
    terraform -chdir=aevo-infrastructure/envs/prod validate
    bun --cwd aevo-infrastructure run check

## 7. Build และ push image แบบ immutable digest

### 7.1 Core API

แก้ Dockerfile ที่อ้างถึงไฟล์ไม่มีอยู่จริงก่อน แล้วทดสอบด้วย Docker หรือ Cloud Build:

    gcloud builds submit aevo-core-api --tag "$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/$AR_REPOSITORY/core-api:$RELEASE" --project="$GCP_PROJECT_ID"

### 7.2 Background worker

    gcloud builds submit aevo-background-worker --tag "$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/$AR_REPOSITORY/background-worker:$RELEASE" --project="$GCP_PROJECT_ID"

อ่าน digest ที่ registry แล้วใช้ digest แทน tag ใน production:

    export API_TAG="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/$AR_REPOSITORY/core-api:$RELEASE"
    export WORKER_TAG="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/$AR_REPOSITORY/background-worker:$RELEASE"
    export API_DIGEST="$(gcloud artifacts docker images describe "$API_TAG" --format='value(image_summary.digest)' --project="$GCP_PROJECT_ID")"
    export WORKER_DIGEST="$(gcloud artifacts docker images describe "$WORKER_TAG" --format='value(image_summary.digest)' --project="$GCP_PROJECT_ID")"
    export API_IMAGE="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/$AR_REPOSITORY/core-api@$API_DIGEST"
    export WORKER_IMAGE="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/$AR_REPOSITORY/background-worker@$WORKER_DIGEST"

อัปเดตค่า api_image และ worker_image ในไฟล์ tfvars ให้เป็น $API_IMAGE
และ $WORKER_IMAGE แล้วรัน terraform plan ใหม่

ห้ามใช้ tag latest ใน production เพราะทำให้ระบุ revision ที่ rollback ได้ยาก

## 8. Cloud SQL และ network configuration

Terraform ปัจจุบันออกแบบให้:

- Cloud SQL PostgreSQL 17 อยู่ใน asia-southeast1
- production ใช้ REGIONAL availability
- private IP เท่านั้น และปิด public IPv4
- database ชื่อ aevo
- เปิด backup, point-in-time recovery, transaction log 7 วัน และเก็บ backup 14 ชุด
- Cloud Run ใช้ VPC connector aevo-production-serverless และ egress PRIVATE_RANGES_ONLY

หลัง Terraform สร้าง instance ให้ตรวจ private network และ connector:

    gcloud sql instances describe aevo-production-postgres --project="$GCP_PROJECT_ID" --format="yaml(name,region,ipAddresses,settings.ipConfiguration)"
    gcloud compute networks vpc-access connectors describe aevo-production-serverless --region="$GCP_REGION" --project="$GCP_PROJECT_ID"

สร้าง database user แยกสำหรับ runtime และ migration ผ่าน Cloud SQL/approved
secret process อย่าใช้ user postgres ใน application. ค่า database secret ควรเป็น
Npgsql connection string แบบ key/value เพื่อคง pool และ timeout options:

    Host=PRIVATE_IP;Port=5432;Database=aevo;Username=RUNTIME_USER;Password=ROTATED_PASSWORD;Ssl Mode=Require;Maximum Pool Size=10;Timeout=15;Command Timeout=30

นำ string นี้เข้า Secret Manager จากไฟล์ที่มี permission จำกัด
อย่าใส่ค่า password ในคำสั่งที่อยู่ใน shell history

Cloud SQL ที่เป็น private IP ต้องให้ Cloud Run และ database อยู่ใน VPC path เดียวกัน
และ region เดียวกัน; อ้างอิง [Cloud Run กับ Cloud SQL](https://docs.cloud.google.com/sql/docs/postgres/connect-run)

## 9. Secret Manager และ production environment

### 9.1 Secret ID ที่ถูกต้อง

Google Secret Manager secret ID อนุญาตเฉพาะตัวอักษร ตัวเลข hyphen และ underscore
ดังนั้นรูปแบบที่มี slash เช่น aevo/production/core-api-session-secret ใช้ไม่ได้
ดู [ข้อกำหนด Secret ID ของ Google](https://docs.cloud.google.com/secret-manager/docs/reference/rest/v1/projects.secrets/create)

ให้แก้ Terraform ให้ใช้ mapping ลักษณะนี้:

| Canonical key | Secret ID | ใช้โดย |
| --- | --- | --- |
| core-api-database-url | aevo-production-core-api-database-url | Core, Worker, Migrator |
| core-api-session-secret | aevo-production-core-api-session-secret | Core |
| origin-signing-secret | aevo-production-origin-signing-secret | Core และ Edge |
| connection-probe-token | aevo-production-connection-probe-token | Core และ Worker |
| worker-shared-secret | aevo-production-worker-shared-secret | Worker/approved internal callers |
| accounts-service-secret | aevo-production-accounts-service-secret | Core |
| stripe-webhook-secret | aevo-production-stripe-webhook-secret | Core ถ้ามี webhook route |

ใช้ labels แยก environment/component แทนการใส่ slash ใน ID

### 9.2 เพิ่ม version หลัง secret container ถูกสร้าง

Terraform ควรสร้าง secret container และ IAM binding; ค่า secret ให้ใส่ผ่าน
protected CI หรือ Secret Manager console หลังตรวจชื่อแล้ว ตัวอย่างต่อไปนี้
ใช้ไฟล์ที่สร้างจาก password manager/secure workstation:

    gcloud secrets versions add aevo-production-core-api-database-url --data-file=/secure/aevo-prod/core-api-database-url --project="$GCP_PROJECT_ID"
    gcloud secrets versions add aevo-production-core-api-session-secret --data-file=/secure/aevo-prod/core-api-session-secret --project="$GCP_PROJECT_ID"
    gcloud secrets versions add aevo-production-origin-signing-secret --data-file=/secure/aevo-prod/origin-signing-secret --project="$GCP_PROJECT_ID"
    gcloud secrets versions add aevo-production-connection-probe-token --data-file=/secure/aevo-prod/connection-probe-token --project="$GCP_PROJECT_ID"
    gcloud secrets versions add aevo-production-worker-shared-secret --data-file=/secure/aevo-prod/worker-shared-secret --project="$GCP_PROJECT_ID"
    gcloud secrets versions add aevo-production-accounts-service-secret --data-file=/secure/aevo-prod/accounts-service-secret --project="$GCP_PROJECT_ID"

ลบไฟล์ชั่วคราวด้วยวิธีที่องค์กรอนุมัติหลัง upload และตรวจว่าไม่ถูก backup
หรือส่งเข้า log

ใน Cloud Run ให้ pin version เป็นเลข เช่น 1 หรือ 2 ไม่ใช้ latest
เพื่อให้ revision และ rollback มีความหมาย

### 9.3 Core API environment

ตั้งค่า plain environment:

| Key | Production value |
| --- | --- |
| AEVO_ENVIRONMENT | production |
| AEVO_BUILD_VERSION | release หรือ image digest สั้น |
| AEVO_IDENTITY_PLATFORM_PROJECT_ID | Google/Identity project ที่ใช้จริง |
| AEVO_ACCOUNTS_API_ORIGIN | HTTPS origin ของ Aevo Accounts |
| AEVO_SESSION_COOKIE_NAMES | ADMIN=aevo_admin_session,GO=aevo_go_session,PLAY=aevo_play_session,POS=aevo_pos_session |
| AEVO_CSRF_COOKIE_NAMES | ADMIN=aevo_admin_csrf,GO=aevo_go_csrf,PLAY=aevo_play_csrf,POS=aevo_pos_csrf |
| AEVO_SESSION_IDLE_TIMEOUT_SECONDS | 1800 เป็นค่าเริ่มต้นที่ repository กำหนด |
| AEVO_SESSION_ABSOLUTE_TIMEOUT_SECONDS | 28800 เป็นค่าเริ่มต้นที่ repository กำหนด |
| AEVO_REQUIRE_GATEWAY_SIGNATURE | true |
| AEVO_TRUSTED_GATEWAYS | aevo-edge-gateway |

ตั้งค่าเป็น Secret Manager reference:

| Key | Secret |
| --- | --- |
| AEVO_DATABASE_URL | aevo-production-core-api-database-url |
| AEVO_SESSION_SECRET | aevo-production-core-api-session-secret |
| AEVO_ACCOUNTS_SERVICE_SECRET | aevo-production-accounts-service-secret |
| AEVO_ORIGIN_SIGNING_SECRET | aevo-production-origin-signing-secret |
| AEVO_CONNECTION_PROBE_TOKEN | aevo-production-connection-probe-token |

Terraform ปัจจุบันยังไม่ได้ตั้ง AEVO_BUILD_VERSION และ cookie map ทั้งหมด
ให้เติมใน cloud-run module ก่อน deploy

### 9.4 Worker environment

ตั้งค่า plain environment:

| Key | Production value |
| --- | --- |
| AEVO_ENVIRONMENT | production |
| AEVO_CORE_API_ORIGIN | status.url ของ aevo-core-api-production หรือ stable internal origin |
| AEVO_PUBSUB_TOPIC | aevo-production-domain-events |
| AEVO_TASK_QUEUE | aevo-production-commands |
| AEVO_PROBE_TARGETS | JSON allowlist เช่น [{"appCode":"GO","baseUrl":"https://go.example.com","healthPath":"/health"}] |

ตั้งค่าเป็น Secret Manager reference:

| Key | Secret |
| --- | --- |
| AEVO_DATABASE_URL | aevo-production-core-api-database-url |
| AEVO_WORKER_SHARED_SECRET | aevo-production-worker-shared-secret |
| AEVO_CONNECTION_PROBE_TOKEN | aevo-production-connection-probe-token |

AEVO_PROBE_TARGETS ต้องเป็น HTTPS หรือ localhost เท่านั้นตาม code ปัจจุบัน
และทุก target ต้องได้รับอนุมัติ เพราะ Worker จะส่ง request ไปยัง URL เหล่านั้น

### 9.5 Edge environment

ค่า non-secret ใน wrangler.jsonc environment production:

| Key | Value |
| --- | --- |
| AEVO_GATEWAY_NAME | aevo-edge-gateway |
| AEVO_APP_CODE | EDGE |
| AEVO_ENVIRONMENT | production |
| AEVO_CORE_API_ORIGIN | URL ของ aevo-core-api-production |

ค่า secret ใน Cloudflare:

    cd aevo-edge-gateway
    wrangler secret put AEVO_GATEWAY_SIGNING_SECRET --env production

ค่าของ AEVO_GATEWAY_SIGNING_SECRET ต้องเท่ากับ
AEVO_ORIGIN_SIGNING_SECRET ใน Core API แต่ไม่ควร commit ค่า secret ลงใน
wrangler.jsonc หรือ GitHub YAML

## 10. IAM ที่ต้องมี

ใช้ service account แยกตาม workload:

| Principal | สิทธิ์สำคัญ |
| --- | --- |
| aevo-core-api-production | Secret accessor เฉพาะ Core secrets; ไม่มีสิทธิ์ deploy |
| aevo-worker-production | Secret accessor เฉพาะ Worker secrets; Cloud Tasks enqueuer ถ้าเป็นผู้สร้าง task |
| aevo-migrate-production | Secret accessor เฉพาะ database; ไม่มี public URL |
| Pub/Sub push invoker | run.invoker เฉพาะ aevo-background-worker-production |
| Cloud Tasks OIDC service account | run.invoker เฉพาะ Worker target |
| Terraform/GitHub deployer | run.developer, artifactregistry.reader/writer ตาม job, iam.serviceAccountUser และสิทธิ์ infra ที่อนุมัติ |

สำหรับ Pub/Sub push ต้องทำให้ Pub/Sub service agent สร้าง OIDC token
แทน push service account ได้ และให้ push service account มี run.invoker
ดู [Pub/Sub authenticated push](https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions)
และตัวอย่าง [Pub/Sub ไป Cloud Run](https://docs.cloud.google.com/run/docs/tutorials/pubsub)

สำหรับ Cloud Tasks ให้ task creator สร้าง HTTP task ที่มี OIDC token
และ target service account มี run.invoker ดู
[Cloud Tasks HTTP target](https://docs.cloud.google.com/tasks/docs/creating-http-target-tasks)

ห้ามให้ Worker service account เป็น owner/editor และห้ามเปิด Worker
ด้วย allow unauthenticated

## 11. Eventing configuration

### 11.1 Pub/Sub

รูปแบบที่แนะนำคือ push subscription:

    Topic: aevo-production-domain-events
    Subscription: aevo-production-worker
    Push endpoint: https://WORKER_ORIGIN/internal/pubsub
    OIDC service account: aevo-pubsub-invoker-production
    Dead-letter topic: aevo-production-domain-events-dead-letter
    Max delivery attempts: 5
    Retry backoff: 10s ถึง 600s

สิ่งที่ต้องทำใน Terraform:

1. เพิ่ม push_config และ oidc_token.service_account_email
2. เพิ่ม run.invoker ให้ push service account ที่ Worker
3. เพิ่ม iam.serviceAccountTokenCreator ให้ Pub/Sub service agent บน push service account
4. เพิ่ม publisher/subscriber IAM สำหรับ dead-letter topic และ source subscription
5. ตั้ง ack deadline ให้ยาวกว่าการประมวลผลปกติ
6. ทำให้ handler ตอบ 2xx เฉพาะเมื่อ persist inbox และ business action สำเร็จ
7. ตอบ non-2xx เมื่อ retry ได้ และมี metric/log สำหรับ DLQ

Worker code ปัจจุบันตรวจ x-aevo-worker-token อย่างเดียว จึงยังรับ Pub/Sub
push ที่ authenticate ด้วย Google OIDC ไม่ได้จนกว่าจะเติม JWT verification
หรือ adapter ที่แปลง OIDC เป็น internal token อย่างปลอดภัย

### 11.2 Cloud Tasks

Queue:

    aevo-production-commands

ทุก task ควรมี:

- idempotency key
- deadline และ retry policy
- OIDC token ไปยัง Worker
- payload version และ request id
- การแยก retryable กับ permanent failure

อย่าให้ task handler ยิงงานซ้ำโดยไม่มี inbox/idempotency guard

## 12. Ingress และ authentication decision

มีสองทางเลือก:

### ทางเลือก A: ทำให้เข้ากับ code ปัจจุบันเร็วที่สุด

- Core API เปิด Cloud Run ingress ที่รับ request จาก Cloudflare
- Core API อาจต้อง allow unauthenticated ที่ Cloud Run เพราะ Edge ยังไม่ส่ง Google ID token
- บังคับ AEVO_REQUIRE_GATEWAY_SIGNATURE=true
- แก้/ทดสอบ middleware ให้ทุก business route ที่เปิดผ่าน public origin ตรวจ HMAC
- ตรวจว่า request เข้า run.app โดยไม่มี signature ไม่สามารถอ่านหรือแก้ข้อมูลได้
- Worker ยังคง no-allow-unauthenticated และรับเฉพาะ OIDC/IAM

ทางเลือกนี้พึ่ง application-level HMAC อย่างมาก จึงต้องมี direct-origin
negative test ก่อนเปิด production

### ทางเลือก B: ปลอดภัยกว่าในระยะยาว

- วาง external HTTPS Load Balancer/Cloud Armor หรือ origin auth ที่ Cloudflare รองรับ
- ตั้ง Core API เป็น internal หรือ internal-and-cloud-load-balancing
- ให้ origin path ส่ง Google identity token หรือใช้ load balancer เป็น auth boundary
- ไม่ให้ public client เรียก Cloud Run URL โดยตรง

อย่าตั้ง Core API เป็น private อย่างเดียวแล้ว deploy Edge code ปัจจุบัน
เพราะ Edge จะไม่มี Google ID token และ request จะได้ 401/403

อ้างอิง [Cloud Run ingress](https://docs.cloud.google.com/run/docs/securing/ingress)
และ [Cloud Run service-to-service authentication](https://docs.cloud.google.com/run/docs/authenticating/service-to-service)

## 13. Terraform plan และ apply

### Cloud Run baseline configuration

ค่าที่ repository ตั้งใจไว้ตอนนี้มีดังนี้:

| Service | Port | Production scaling | Network | Public access |
| --- | --- | --- | --- | --- |
| aevo-core-api-production | 8080 | min 1 / max 20 | VPC connector, PRIVATE_RANGES_ONLY | ต้องเลือกตาม Section 12; ถ้าไม่มี Google ID token จาก Edge ต้องใช้ public + strict HMAC ชั่วคราว |
| aevo-background-worker-production | 8080 | min 0 / max 10 | VPC connector, PRIVATE_RANGES_ONLY | no-allow-unauthenticated, Pub/Sub/Tasks ใช้ OIDC |
| aevo-core-api-migration-production | image entrypoint | run-to-completion | VPC connector ถ้าต่อ private SQL | ไม่มี public URL |

ปัจจุบัน Terraform ยังไม่ได้ประกาศ CPU, memory, concurrency และ timeout อย่างชัดเจน
ให้กำหนดหลัง load test ก่อน production โดยต้องเทียบกับ connection budget ด้วย:
Core max 20 instances กับ Npgsql pool สูงสุด 10 ต่อ instance อาจใช้ database
connection ได้ประมาณ 200 ยังไม่รวม Worker และ Migration Job

หลังแก้ blockers ใน Section 2:

    terraform -chdir=aevo-infrastructure/envs/prod fmt -check
    terraform -chdir=aevo-infrastructure/envs/prod plan -var-file=terraform.tfvars -out=tfplan

ตรวจ plan ด้วยคนอีกหนึ่งคน โดยเฉพาะ:

- Cloud SQL instance deletion protection และ private IP
- VPC connector และ egress
- Cloud Run min/max instances, CPU/memory, concurrency
- service account ของแต่ละ container
- Secret Manager IDs, IAM และ numeric versions
- ingress และ invoker policy
- Pub/Sub push/OIDC/DLQ IAM
- Cloud Tasks queue และ target IAM
- ไม่มี secret value ใน plan output

เมื่อ approved:

    terraform -chdir=aevo-infrastructure/envs/prod apply tfplan

อย่าใช้ terraform apply -target เป็น deployment workflow ปกติ
เพราะอาจทำให้ dependency และ IAM ของ eventing ไม่ครบ

## 14. Migration Job

Migration image ต้องทำงานจบแล้ว exit ไม่ใช่ process server
และต้องบรรจุ:

- Aevo.CoreApi.Migrator.dll
- db/migrations/*.sql
- AEVO_MIGRATIONS_PATH ที่ชี้ไปยัง directory จริงใน image

ตัวอย่าง operational sequence:

    gcloud run jobs create aevo-core-api-migration-production --image="$MIGRATION_IMAGE" --region="$GCP_REGION" --service-account="aevo-migrate-production@$GCP_PROJECT_ID.iam.gserviceaccount.com" --set-env-vars="AEVO_ENVIRONMENT=production,AEVO_MIGRATIONS_PATH=/app/db/migrations" --set-secrets="AEVO_DATABASE_URL=aevo-production-core-api-database-url:1" --project="$GCP_PROJECT_ID"
    gcloud run jobs execute aevo-core-api-migration-production --args=--dry-run --region="$GCP_REGION" --wait --project="$GCP_PROJECT_ID"
    gcloud run jobs execute aevo-core-api-migration-production --region="$GCP_REGION" --wait --project="$GCP_PROJECT_ID"
    gcloud run jobs execute aevo-core-api-migration-production --args=--verify --region="$GCP_REGION" --wait --project="$GCP_PROJECT_ID"

ถ้า Job มีอยู่แล้ว ให้ใช้ jobs update กับ image/env/secret version แทน create
และให้ Cloud Run Job เป็น resource ใน Terraform เพื่อป้องกัน configuration drift

ห้ามให้ API replica apply migration ตอน startup
ดู [Cloud Run Jobs](https://docs.cloud.google.com/run/docs/create-jobs)

## 15. Deploy และ smoke test

Terraform ควรเป็นผู้สร้าง Cloud Run service; คำสั่งต่อไปนี้ใช้ตรวจหรือ
manual deploy ในกรณีฉุกเฉินเท่านั้น และไม่ควรใช้สลับกับ Terraform โดยไม่ reconcile state

### 15.1 Core API

ตรวจ service และ URL:

    gcloud run services describe aevo-core-api-production --region="$GCP_REGION" --project="$GCP_PROJECT_ID" --format="yaml(status.url,status.latestReadyRevisionName)"
    export CORE_URL="$(gcloud run services describe aevo-core-api-production --region="$GCP_REGION" --project="$GCP_PROJECT_ID" --format='value(status.url)')"

Smoke test:

    curl -fsS "$CORE_URL/health"
    curl -i "$CORE_URL/ready"
    curl -i "$CORE_URL/v1/meta"

คาดหวัง /ready เป็น 200 หลัง database, required env และ migration พร้อม
ถ้าเป็น public HMAC path ให้ทดสอบ direct request ที่ไม่มี signature ต้องถูกปฏิเสธ
สำหรับ protected route

### 15.2 Worker

ตรวจว่า Worker ไม่ได้เปิด anonymous และ env ครบ:

    gcloud run services describe aevo-background-worker-production --region="$GCP_REGION" --project="$GCP_PROJECT_ID" --format="yaml(status.url,template.containers.env,template.scaling)"

ถ้าใช้ authenticated request เพื่อทดสอบ health:

    export WORKER_URL="$(gcloud run services describe aevo-background-worker-production --region="$GCP_REGION" --project="$GCP_PROJECT_ID" --format='value(status.url)')"
    export ID_TOKEN="$(gcloud auth print-identity-token --audiences="$WORKER_URL")"
    curl -fsS -H "Authorization: Bearer $ID_TOKEN" "$WORKER_URL/health"

ห้ามพิมพ์ ID_TOKEN หรือ response ที่มี secret ลงใน CI log

### 15.3 Logs และ revision

    gcloud run services logs read aevo-core-api-production --region="$GCP_REGION" --limit=100 --project="$GCP_PROJECT_ID"
    gcloud run services logs read aevo-background-worker-production --region="$GCP_REGION" --limit=100 --project="$GCP_PROJECT_ID"
    gcloud run revisions list --service=aevo-core-api-production --region="$GCP_REGION" --project="$GCP_PROJECT_ID"

ตรวจ structured log ให้มี request id, release, service, environment และไม่ log
cookie, session token, database URL หรือ secret

## 16. Deploy Edge Gateway

ก่อน deploy ต้องเปลี่ยน AEVO_CORE_API_ORIGIN ใน production environment
จากค่าว่างเป็น Core API origin ที่ทดสอบแล้ว และเพิ่ม secret ใน Cloudflare

จาก aevo-edge-gateway:

    bun install --frozen-lockfile
    bun run typecheck
    bun test
    bun run build
    wrangler secret put AEVO_GATEWAY_SIGNING_SECRET --env production
    bun run deploy:production

workflow ปัจจุบันตรวจ build แล้ว deploy แต่ยังไม่ provision origin/secret
ให้เพิ่ม Cloudflare environment secrets และ protected production approval
ใน CI ก่อนใช้ workflow เป็น release path

หลัง deploy:

    curl -fsS https://EDGE_HOST/health
    curl -i https://EDGE_HOST/ready

ทดสอบ login/session ผ่าน domain จริง, cookie domain/path, CSRF และ request id
จาก edge ถึง Core API ไม่ควร cache response ที่เป็น personalized

## 17. Release order ที่ปลอดภัย

1. แก้ blockers และให้ unit/type/build checks ผ่าน
2. Build image และ pin digest
3. Bootstrap state, APIs, Artifact Registry และ Terraform backend
4. Terraform apply network, Cloud SQL, IAM, secret containers, queues และ services
5. เพิ่ม secret versions และปรับ Cloud Run references เป็น numeric versions
6. Run migration Job dry-run, apply และ verify
7. เปิด Core API revision แล้วตรวจ /health, /ready และ direct-origin policy
8. Deploy Worker ที่มี handler จริงและตรวจ authenticated health
9. ทดสอบ Pub/Sub event สำเร็จ, duplicate, retry และ DLQ
10. ทดสอบ Cloud Tasks สำเร็จ, timeout, duplicate และ permanent failure
11. Deploy Edge production และชี้ origin ไปยัง Core API
12. Smoke test ผ่าน domain จริง
13. Publish @aevocado/contracts เมื่อ OpenAPI metadata ตรงกับ Core route inventory

## 18. Rollback และ secret rotation

Cloud Run revision ใช้ image digest ที่ immutable; rollback โดยชี้ traffic
กลับไป revision ที่ผ่าน smoke test:

    gcloud run services update-traffic aevo-core-api-production --to-revisions=REVISION_NAME=100 --region="$GCP_REGION" --project="$GCP_PROJECT_ID"

Migration เป็น forward-only policy:

- ใช้ expand, migrate, contract สำหรับ schema ที่เปลี่ยน
- อย่าลบ column ที่ revision เก่ายังใช้
- rollback application ก่อน แล้วแก้ migration ใหม่แบบ forward
- อย่าพยายาม restore database เป็นขั้นตอนแรกถ้ายังไม่ประเมิน data loss

การ rotate secret:

1. เพิ่ม Secret Manager version ใหม่
2. เปลี่ยน Cloud Run reference ไป version ใหม่
3. deploy revision และ smoke test
4. ตรวจ error rate และ session/login
5. disable version เก่าเมื่อไม่มี workload ใช้แล้ว
6. เปลี่ยน Cloudflare secret ให้ตรงกับ Core หากเป็น signing secret

## 19. Production release checklist

- [ ] Core Dockerfile build ผ่านจริง
- [ ] Worker handler ไม่ตอบ WORKER_NOT_CONFIGURED
- [ ] Pub/Sub เป็น push/OIDC หรือมี pull subscriber ที่ทำงานจริง
- [ ] Inbox/idempotency และ DLQ test ผ่าน
- [ ] Cloud Tasks OIDC/retry/idempotency test ผ่าน
- [ ] Cloud Run Job migration dry-run/apply/verify ผ่าน
- [ ] Cloud SQL private IP, backup และ PITR ตรวจแล้ว
- [ ] Secret IDs ไม่มี slash และทุก secret มี version
- [ ] Runtime service accounts ได้ least privilege
- [ ] Core ingress/auth decision ถูก implement และ direct-origin test ผ่าน
- [ ] Edge origin ไม่ว่างและ signing secret ตรงกัน
- [ ] /health และ /ready ผ่านจาก deployment environment
- [ ] Login, refresh, logout, CSRF และ cookie ผ่าน domain จริง
- [ ] HMAC failure, unauthorized worker และ invalid event test ผ่าน
- [ ] Logs/metrics/alert ไม่มี secret และมี request/release correlation
- [ ] Terraform state อยู่ใน protected GCS bucket
- [ ] Production deploy ใช้ image digest และมี rollback revision

## 20. Official references

- [Cloud Run deploy container images](https://docs.cloud.google.com/run/docs/deploying)
- [Cloud Run environment variables](https://cloud.google.com/run/docs/configuring/services/environment-variables)
- [Cloud Run secrets](https://docs.cloud.google.com/run/docs/configuring/services/secrets)
- [Cloud Run ingress](https://docs.cloud.google.com/run/docs/securing/ingress)
- [Cloud Run service identity](https://docs.cloud.google.com/run/docs/securing/service-identity)
- [Cloud SQL PostgreSQL from Cloud Run](https://docs.cloud.google.com/sql/docs/postgres/connect-run)
- [Pub/Sub push to Cloud Run](https://docs.cloud.google.com/run/docs/tutorials/pubsub)
- [Pub/Sub push authentication](https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions)
- [Cloud Tasks HTTP targets](https://docs.cloud.google.com/tasks/docs/creating-http-target-tasks)
- [Cloud Run Jobs](https://docs.cloud.google.com/run/docs/create-jobs)
- [Workload Identity Federation for deployment pipelines](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines)
- [Google Secret Manager secret ID rules](https://docs.cloud.google.com/secret-manager/docs/reference/rest/v1/projects.secrets/create)
- [Cloudflare Workers deployment](https://developers.cloudflare.com/workers/get-started/guide/)
- [Cloudflare Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
