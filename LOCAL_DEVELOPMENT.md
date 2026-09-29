# Aevo ecosystem local development

The root scripts run the local applications with non-conflicting ports.
Each application still owns its own `.env` and database configuration.

| Application | Web | API |
| --- | --- | --- |
| Aevo Hub Modern Console | http://localhost:4330/modern (React Router) | http://localhost:4000 (Edge → Core) |
| Aevo Admin | http://localhost:4335 (standalone `aevo-admin` repo) | http://localhost:4001 |
| Aevo Core API | — | http://localhost:5099 (run `aevo-core-api`) |
| Aevo Play | http://localhost:4331/modern (React Router) | http://localhost:3002 |
| Aevo POS | http://localhost:4332 (React + Vite) | http://localhost:3003 |
| Aevo Go | http://localhost:4324 | Vite dev proxy to http://localhost:4000 |

Each local API uses a different app-scoped session cookie name so signing in to
one app does not overwrite another app's session on the shared `localhost`
domain. Browser cookies contain only an opaque session token; Supabase access
and refresh tokens stay encrypted in `app_sessions`. CSRF tokens are readable
only from the matching app cookie and are echoed in `X-CSRF-Token` for writes.

## Development data policy

This workspace is currently in development mode (`NODE_ENV=development` and
`AEVO_ENVIRONMENT=development`). For this development target, migrations,
seeding, creation, cleanup, and reset operations are allowed when the target
and scope are explicit. This policy does not include `aevo-digital-sing`, which
remains an independent application boundary. Production and staging must keep
their separate approval and migration safeguards.

The current development database has the ordered Core migration set applied
and verified. Aevo Hub runs with `AEVO_APP_CODE=HUB`; `APP_VERSION` is optional
in local development. The Hub launcher starts Accounts on `:8787`, the .NET
Core API on `:5099`, the Cloudflare Edge Gateway on `:4000`, and the Framework
Mode console on `:4330`. Hub contains no API gateway process and no legacy web
adapter. Open `http://localhost:4330/modern` for the canonical workspace. Home
navigation stays on the same modern origin. The old `/organize`, `/workspace`,
and `/setup` compatibility routes are removed. See
[`aevo-hub/docs/HUB_RUNTIME_FLOW.md`](aevo-hub/docs/HUB_RUNTIME_FLOW.md) for
the complete request and troubleshooting flow. The modern console calls the
versioned Core API boundary through the local Edge Gateway.

Aevo Admin is a separate privileged runtime. The standalone web/BFF runs from
`/Users/jayc/Project/aevo-ecosystem/aevo-admin` and can be started with
`bun run dev` in that repo. Open `http://localhost:4335`; only platform RBAC or
the configured platform-admin allowlist can enter this app. Its local
`AEVO_API_URL` points to the Edge boundary on `:4001`, which signs and forwards
requests to the Core API on `:5099`. The new Core API is the target authority;
the development launcher now passes the migrated development database and
app-scoped session configuration to it. Authentication still requires the
Accounts provider boundary to be running/configured when testing sign-in.

To run the connected Feed/Admin runtime smoke against the standalone Admin
surface, load the development environment and use:

```bash
cd /Users/jayc/Project/aevo-ecosystem/aevo-hub
bun run ../scripts/check-feed-admin-runtime.ts
```

The script is read-only. It checks Core-backed Feed/Admin API responses,
authenticated SSR routes, and the anonymous redirect. Set
`AEVO_ADMIN_WEB_ORIGIN` only when using an isolated standalone Admin port.

Run the new Core API independently when validating the target boundary:

```bash
cd /Users/jayc/Project/aevo-ecosystem/aevo-core-api
dotnet run --project src/Aevo.CoreApi/Aevo.CoreApi.csproj -- --urls http://127.0.0.1:5099
```

`/health/live` remains available without external credentials. In development,
`/ready` is now backed by the migrated database; session, Hub domain, Admin and
Go data routes still fail closed unless the required app-session rows, Core
projections, and Accounts provider are available. The Core API must not
fabricate tenant data while Hub domain parity is still being migrated.

Play starts its API and React Router merchant console together. Open
`http://localhost:4331/modern` for the venue and booking workspace.

POS starts its API and React + Vite operational console together. Open
`http://localhost:4332` for catalog, cart, idempotent order creation, online
cash payment, queue status, and IndexedDB draft recovery.

Hub is the identity entrypoint. Its modern login route supports password
registration and recovery. OAuth provider buttons remain disabled by default
(`AEVO_OAUTH_ENABLED=false`) until the versioned Accounts/Core start and
callback contract is deployed; when enabled, OAuth state and the PKCE verifier
must remain sealed in an HttpOnly Hub cookie and the callback must exchange the
provider code server-side. The browser never receives Supabase bearer tokens.

On password login, `Remember this device` is off by default and creates a
browser-session cookie. Enabling it creates a persistent, bounded cookie using
Core's idle and absolute session policy. The preference is carried through
server-side SSO handoff, but a transient Hub session can never be upgraded into
a persistent Play, POS, or Go session. Logout, password changes, refresh-token
rotation, idle expiry, and administrative revocation are resolved against
Core's current session state rather than a cross-request session cache.

Play and POS use direct-entry SSO. Opening `/modern` (Play) or `/` (POS)
creates a short-lived, signed flow cookie at the app API, redirects to Hub
login, and returns to `/auth/callback`. Hub exchanges the one-time code only
over the configured server-to-server boundary. Aevo Go uses the same Hub
handoff with a browser-generated PKCE verifier and receives a separate
`aevo_go_session` cookie through `/api/auth/go/handoff/complete`.

A user must have an active `PLAY` or `POS` assignment and the relevant
organization/store scope after the workforce handoff. Go keeps its customer
session app-scoped and does not require a workforce assignment for the public
customer surface.

The default development billing projection is the permanent `Free` tier
(`starter`). It keeps the first-party application feature entitlements active,
but Core enforces one active store/application binding for the organization
through the `store_application_bindings` quota. Enabling a second app or a
second store returns `ENTITLEMENT_LIMIT_EXCEEDED`; disabling the existing
binding releases the slot. The current plan, quota, and usage are visible in
Hub under `Applications & entitlements`.

Store deletion uses the Core-owned retention lifecycle. A delete request only
marks the store inactive, writes Core and organization audit records, and
creates an outbox event; it never purges data synchronously. The default local
recovery window is seven days. During that window the store remains visible in
Hub with a live countdown and an authorized owner/manager can cancel the
request to restore it. A retention worker is the only component allowed to
process due requests after `scheduled_purge_at`; Hub and browser code cannot
purge rows directly. Store settings, the Aevo Go public profile, app bindings,
typed app configuration, and catalog writes are paused while the request is
pending.

To test a Hub-to-app launch, start the target Play/POS API as well as Hub,
ensure the local handshake secret is shared, enable the application on the
target store, and open it from the Store workspace Apps & features tab. The
launch is rejected when the target API is offline, the store binding is
disabled, the assignment is missing, the entitlement is inactive, or the Free
tier quota is exhausted. Hub does not open a configured app URL directly.

Core API/Infrastructure owns the target database migration lifecycle. Preview
and apply the ordered Core migration set with the migration-only runner:

```bash
cd /Users/jayc/Project/aevo-ecosystem/aevo-core-api
dotnet run --project src/Aevo.CoreApi.Migrator/Aevo.CoreApi.Migrator.csproj -- --dry-run
dotnet run --project src/Aevo.CoreApi.Migrator/Aevo.CoreApi.Migrator.csproj
dotnet run --project src/Aevo.CoreApi.Migrator/Aevo.CoreApi.Migrator.csproj -- --verify
```

From `aevo-hub`, the same Core-owned runner is available without manually
exporting the database URL; it reads the development `DATABASE_URL` only for
the child process:

```bash
cd /Users/jayc/Project/aevo-ecosystem/aevo-hub
bun run db:migrate:dry-run
bun run db:migrate
bun run db:migrate:verify
```

The runner uses an advisory lock and checksums, so an interrupted deploy can
resume safely and an edited applied migration fails closed. There is no Hub
migration write path and no legacy migration command; the normal `db:migrate`
command always targets the Core API owner.
Do not push the Play/POS copies of the shared auth schema to the Core database.

Play and POS use Core/Accounts app sessions in normal local development. Use
`AEVO_TEST_MODE=1` only for isolated in-memory UI tests; it is not an auth
fallback and is rejected in production.

Before starting a service, make sure its `.env` contains valid Supabase
configuration. The root launcher passes local port and app-link overrides. If
Play has no local Supabase credentials, the launcher can temporarily read them
from `aevo-hub/.env` or `aevo-pos/.env` for the child process; it never writes
or copies secrets into another `.env` file.

Hub and Admin consume the local `@aevocado/contracts` package through a
versioned `file:` dependency. After changing `aevo-contracts`, rebuild and
refresh both consumer installs before starting an SSR dev server:

```bash
bun run sync:contracts
```

This only updates local build output and dependency links; it does not change
application data or run database migrations.

For temporary UI/API testing without a Supabase project, enable the explicit
local test mode. It creates a synthetic user, organization/store, catalog and
domain records in memory; nothing is written to Supabase and all state resets
when the process restarts. The flag is rejected in production:

```bash
AEVO_TEST_MODE=1 bun run dev:play
AEVO_TEST_MODE=1 bun run dev:pos
```

Open Play at `http://localhost:4331/modern` or POS at `http://localhost:4332`.
Both surfaces show a test-mode banner while this mode is active.

`aevo-play` uses the shared Supabase application boundary. Provide
`SUPABASE_URL` plus `SUPABASE_SECRET_KEY` in its environment; to disable the
temporary shared-env fallback, set `AEVO_DISABLE_SHARED_ENV=1`.

```bash
# From /Users/jayc/Project/aevo-ecosystem
bun run dev:hub
bun run dev:admin
bun run dev:play
bun run dev:pos
bun run dev:go
# Common combinations
bun run dev:hub+play
bun run dev:hub+admin
bun run dev:hub+pos
bun run dev:play+pos
bun run dev:all

# Probe health, readiness, and the web shell
bun run check:local:hub+play
bun run check:local:hub+admin
bun run check:local:admin
bun run check:local:play+pos
bun run check:local:go
bun run check:local

# Contract, integration, and tenant-security matrix
bun run test:all
bun run test:tenant-security
# Requires the local Edge/Core boundary to be running on :4000.
bun run test:integration

# Authenticated Admin ↔ Hub/Play/POS/Go integration and session-isolation check
bun run check:admin:integration
```

The standalone Aevo Go app runs on port 4324 as a Vite React application. In
local development, Vite proxies `/health`, `/ready`, and `/api/*` to the local
Edge/Core API boundary. Set `aevo-go/.env.local` with `VITE_API_BASE_URL` when
using another deployment. The app never exposes Supabase secrets or calls
Supabase directly from the browser.

All first-party Vite surfaces now support the same Cloudflare development
tunnel capability as Aevo Go: Hub (`4330`), Admin (`4335`), Play (`4331`), POS
(`4332`), and Go (`4324`). Tunnel startup is opt-in because it exposes a local
development server publicly:

```bash
# Start one surface with a Cloudflare Quick Tunnel
bun run dev:go:tunnel
bun run dev:hub:tunnel
bun run dev:play:tunnel
bun run dev:pos:tunnel

# Start the complete local boundary and Hub/Admin/Play/POS surfaces
bun run dev:all:tunnel

# Go is a standalone surface
bun run dev:go:tunnel
```

The root launcher now starts one Wrangler Quick Tunnel per requested web
surface before starting the shared Core/Accounts boundary. It captures the
generated origins, injects them into local CORS and redirect allowlists, prints
the URLs, and stops the tunnels together with the rest of the local process
tree. `bun run dev:*:tunnel` therefore works from another device without
manually pressing `t` or copying an origin into `.env` first. A direct
per-repository Vite command can still start or close a tunnel with `t` followed
by Enter when auto-start is not enabled. `cloudflared` is managed by Wrangler
or the Cloudflare Vite plugin; no Supabase or application secret is placed in
the browser.

The root launcher uses the Wrangler binary from `aevo-edge-gateway` or
`aevo-go`. If those dependencies are installed elsewhere, set
`AEVO_WRANGLER_BIN=/absolute/path/to/wrangler` before running the tunnel command.

For authenticated cross-app testing, use stable named tunnel hostnames and
declare them in the relevant `.env` file. The root launcher reads these values
without copying secrets and applies exact origins to the local Edge CORS and
Accounts redirect allowlists:

```dotenv
AEVO_HUB_TUNNEL_URL=https://hub-dev.example.com
AEVO_ADMIN_TUNNEL_URL=https://admin-dev.example.com
AEVO_PLAY_TUNNEL_URL=https://play-dev.example.com
AEVO_POS_TUNNEL_URL=https://pos-dev.example.com
AEVO_GO_TUNNEL_URL=https://go-dev.example.com
```

Quick Tunnel hostnames are random and change on restart, so they are suitable
for UI/device previews. Use stable hostnames for login, OAuth, passkeys, and
Play/POS/Go SSO callbacks; those flows intentionally remain exact-origin and
fail closed.

When Hub, Play, and POS are running, the Hub launcher uses the local Play and
POS URLs. `AEVO_PLAY_URL` and `AEVO_POS_URL` can be overridden in the Hub
environment when testing another local or preview deployment. Aevo Go is a
standalone app and is started separately with `bun run dev:go`.

The following values are reserved for a future OAuth activation. Do not enable
local social sign-in until the versioned provider routes are deployed and the
redirect/security tests pass. When that gate is satisfied, configure the
providers in the Supabase Auth dashboard and keep these Hub values aligned:

    AEVO_HUB_OAUTH_CALLBACK_URL=http://localhost:4330/api/auth/oauth/callback
    AEVO_LINE_OAUTH_PROVIDER=custom:line
    AEVO_ALLOWED_WEB_ORIGINS=http://localhost:4330,http://localhost:4331,http://localhost:4332,http://localhost:4324
    AEVO_GO_URL=http://localhost:4324

Add `http://localhost:4330/api/auth/oauth/callback` to the Supabase Auth URL
allowlist. Google and Apple use Supabase's built-in providers. LINE is a
Supabase custom OAuth/OIDC provider named `custom:line`; configure its LINE
Login authorization, token, and userinfo endpoints and request `openid
profile email` so the identity can create the required Aevo profile.
