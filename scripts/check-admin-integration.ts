type JsonObject = Record<string, unknown>;

class CookieJar {
  private readonly values = new Map<string, string>();

  set(name: string, value: string): void {
    this.values.set(name, value);
  }

  get(name: string): string | undefined {
    return this.values.get(name);
  }

  names(): string[] {
    return [...this.values.keys()];
  }

  header(): string {
    return [...this.values.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }
}

function asObject(value: unknown, label: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} did not return a JSON object`);
  }
  return value as JsonObject;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} is missing`);
  return value;
}

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function recordPass(label: string, detail?: string): void {
  console.log(`PASS  ${label}${detail ? `  ${detail}` : ""}`);
}

function setCookieHeaders(response: Response, jar: CookieJar): void {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const values = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : (response.headers.get("set-cookie") ? [response.headers.get("set-cookie") as string] : []);

  for (const header of values) {
    const match = /^([^=;]+)=([^;]*)/u.exec(header);
    if (!match) continue;
    const [, name, value] = match;
    if (value === "") jar.set(name, value);
    else jar.set(name, value);
  }
}

async function request(
  baseUrl: string,
  path: string,
  jar: CookieJar,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  const cookie = jar.header();
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(15_000)
  });
  setCookieHeaders(response, jar);
  return response;
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

async function expectStatus(response: Response, expected: number, label: string): Promise<unknown> {
  const payload = await readJson(response);
  if (response.status !== expected) {
    const object = typeof payload === "object" && payload !== null ? payload as JsonObject : undefined;
    const error = object?.error;
    const errorObject = typeof error === "object" && error !== null ? error as JsonObject : undefined;
    const code = typeof errorObject?.code === "string" ? ` (${errorObject.code})` : "";
    throw new Error(`${label}: expected HTTP ${expected}, received ${response.status}${code}`);
  }
  return payload;
}

function sessionCookie(jar: CookieJar): { name: string; value: string } {
  const name = jar.names().find((candidate) => candidate.includes("session") && !candidate.includes("csrf"));
  if (!name) throw new Error("Login did not set an application session cookie");
  const value = jar.get(name);
  if (!value) throw new Error("Application session cookie is empty");
  return { name, value };
}

function renamedSessionCookie(name: string, value: string): CookieJar {
  const jar = new CookieJar();
  jar.set(name, value);
  return jar;
}

function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

async function completeWorkforceSso(
  application: "PLAY" | "POS",
  targetApiUrl: string,
  targetMePath: string,
  targetLabel: string,
  hubJar: CookieJar,
  expectedMeStatus = 200,
  storeId?: string
): Promise<void> {
  const targetJar = new CookieJar();
  const startPath = storeId
    ? `/api/auth/start?returnTo=%2F&storeId=${encodeURIComponent(storeId)}`
    : "/api/auth/start?returnTo=%2F";
  const start = await request(targetApiUrl, startPath, targetJar);
  await expectStatus(start, 302, `${targetLabel} SSO start`);
  const location = start.headers.get("location");
  expect(location, `${targetLabel} SSO start did not return a redirect location`);
  const loginUrl = new URL(location);
  expect(loginUrl.origin === new URL(hubWebUrl).origin, `${targetLabel} SSO points to the wrong Hub origin`);
  expect(loginUrl.pathname === "/modern/login", `${targetLabel} SSO points to the wrong Hub login path`);
  expect(loginUrl.searchParams.get("app") === application, `${targetLabel} SSO points to the wrong application`);
  const loginPage = await fetch(loginUrl, { headers: { accept: "text/html" }, signal: AbortSignal.timeout(15_000) });
  const loginBody = await loginPage.text();
  expect(loginPage.status === 200 && loginBody.includes("Aevo Hub"), `${targetLabel} Hub login page was not reachable`);
  expect(
    loginBody.includes("aevo-sso-handoff-loading") && !loginBody.includes('type="password"'),
    `${targetLabel} SSO handoff rendered the credential form instead of a loading state`
  );

  const csrfName = hubJar.names().find((name) => name.includes("csrf"));
  const csrfToken = csrfName ? hubJar.get(csrfName) : undefined;
  expect(csrfToken, "Hub session did not include a CSRF token for SSO handoff");
  const handoff = await request(hubApiUrl, "/api/auth/handoff", hubJar, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: hubOrigin,
      "x-csrf-token": csrfToken
    },
    body: JSON.stringify({
      application,
      returnTo: "/auth/callback",
      ...(storeId ? { storeId } : {}),
      state: loginUrl.searchParams.get("state"),
      codeChallenge: loginUrl.searchParams.get("code_challenge")
    })
  });
  const handoffPayload = asObject(await expectStatus(handoff, 200, `${targetLabel} SSO handoff`), `${targetLabel} SSO handoff`);
  const code = asString(handoffPayload.code, `${targetLabel} SSO authorization code`);
  const state = asString(loginUrl.searchParams.get("state"), `${targetLabel} SSO state`);
  const exchange = await request(targetApiUrl, "/api/auth/exchange", targetJar, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, state })
  });
  await expectStatus(exchange, 200, `${targetLabel} SSO exchange`);
  const targetSession = sessionCookie(targetJar);
  expect(targetSession.name !== "aevo_hub_session" && targetSession.name !== "aevo_admin_session", `${targetLabel} received a shared control-plane session cookie`);
  try {
    await expectStatus(await request(targetApiUrl, targetMePath, targetJar), expectedMeStatus, `${targetLabel} authenticated session`);
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}; target URL: ${new URL(targetMePath, targetApiUrl).toString()}; target cookies: ${targetJar.names().join(", ")}`);
  }
  recordPass(
    `${targetLabel} end-to-end SSO`,
    expectedMeStatus === 200 ? `${targetSession.name} session accepted by target API` : `${targetSession.name} session created; target policy returned HTTP ${expectedMeStatus}`
  );
}

async function checkHubApplicationLaunch(
  application: "PLAY" | "POS",
  storeId: string,
  hubJar: CookieJar
): Promise<void> {
  const csrfName = hubJar.names().find((name) => name.includes("csrf"));
  const csrfToken = csrfName ? hubJar.get(csrfName) : undefined;
  expect(csrfToken, "Hub session did not include a CSRF token for application launch");
  const launch = await request(hubApiUrl, `/api/v1/hub/applications/${application}/launch`, hubJar, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: hubOrigin,
      "x-csrf-token": csrfToken
    },
    body: JSON.stringify({ storeId })
  });
  const payload = asObject(await expectStatus(launch, 200, `${application} Hub launch`), `${application} Hub launch`);
  const launchObject = asObject(payload.launch, `${application} launch metadata`);
  const launchUrl = new URL(asString(launchObject.url, `${application} launch URL`));
  expect(launchUrl.pathname.endsWith("/api/auth/start"), `${application} launch did not return the target auth start endpoint`);
  expect(launchUrl.searchParams.get("storeId") === storeId, `${application} launch lost its store context`);
  const targetStart = await fetch(launchUrl, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
  expect(targetStart.status === 302, `${application} target auth start returned HTTP ${targetStart.status}`);
  const targetLocation = targetStart.headers.get("location");
  expect(targetLocation, `${application} target auth start did not return an Accounts redirect`);
  const accountsUrl = new URL(targetLocation);
  expect(accountsUrl.pathname === "/v1/auth/start", `${application} target auth start pointed to the wrong Accounts path`);
  expect(accountsUrl.searchParams.get("application") === application, `${application} target auth start used the wrong application code`);
  expect(accountsUrl.searchParams.get("store_id") === storeId, `${application} Accounts flow lost its store context`);
  recordPass(`${application} store-scoped Hub launch`, `${launchObject.readiness ?? "ready"} handshake + Accounts state/PKCE`);
}

const adminApiUrl = process.env.AEVO_ADMIN_API_URL?.trim() || "http://localhost:4001";
const hubApiUrl = process.env.AEVO_HUB_API_URL?.trim() || "http://localhost:4000";
const adminOrigin = process.env.AEVO_ADMIN_WEB_ORIGIN?.trim() || "http://localhost:4335";
const hubOrigin = process.env.AEVO_HUB_WEB_ORIGIN?.trim() || "http://localhost:4330";
const hubWebUrl = process.env.AEVO_HUB_WEB_URL?.trim() || hubOrigin;
const goOrigin = process.env.AEVO_GO_WEB_ORIGIN?.trim() || "http://localhost:4324";
const email = process.env.AEVO_ADMIN_TEST_EMAIL?.trim() || process.env.SEED_OWNER_EMAIL?.trim();
const password = process.env.AEVO_ADMIN_TEST_PASSWORD || process.env.SEED_OWNER_PASSWORD;

if (!email || !password) {
  throw new Error("Set AEVO_ADMIN_TEST_EMAIL/AEVO_ADMIN_TEST_PASSWORD or load aevo-hub/.env before running this check");
}

const adminJar = new CookieJar();
const adminLogin = await request(adminApiUrl, "/api/auth/login", adminJar, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: adminOrigin
  },
  body: JSON.stringify({ email, password })
});
await expectStatus(adminLogin, 200, "Admin login");
const adminSession = sessionCookie(adminJar);
expect(adminSession.name === "aevo_admin_session", `Admin login used unexpected session cookie ${adminSession.name}`);
expect(adminJar.names().includes("aevo_admin_csrf"), "Admin login did not set the Admin CSRF cookie");
recordPass("Admin authenticated login", "separate session + CSRF cookies");

const adminMe = asObject(
  await expectStatus(await request(adminApiUrl, "/api/auth/me", adminJar), 200, "Admin /api/auth/me"),
  "Admin /api/auth/me"
);
const adminUser = asObject(adminMe.user, "Admin identity");
expect(typeof adminUser.id === "string", "Admin identity did not include a user id");
recordPass("Admin session verification");

const adminAccess = asObject(
  await expectStatus(
    await request(adminApiUrl, "/api/v1/access?application=ADMIN", adminJar),
    200,
    "Admin access decision"
  ),
  "Admin access decision"
);
expect(adminAccess.allowed === true, "Platform admin access was denied");
expect(adminAccess.application === "ADMIN", "Admin access decision returned the wrong application");
recordPass("Admin platform RBAC", "ADMIN access allowed");

const universalSearch = asObject(
  await expectStatus(
    await request(adminApiUrl, "/api/v1/admin/query/execute", adminJar, {
      method: "POST",
      headers: { origin: adminOrigin, "content-type": "application/json" },
      body: JSON.stringify({
        version: 1,
        model: "admin.directory",
        where: { type: "text", value: "owner" },
        pagination: { limit: 20, offset: 0 }
      })
    }),
    200,
    "Admin universal search"
  ),
  "Admin universal search"
);
expect(Array.isArray(universalSearch.items), "Admin universal search did not return items");
recordPass("Admin universal query AST", `${(universalSearch.items as unknown[]).length} results`);

for (const path of [
  "/api/v1/admin/overview",
  "/api/v1/admin/applications",
  "/api/v1/admin/connections",
  "/api/v1/admin/audit-logs?limit=50",
  "/api/v1/admin/organizations?limit=50",
  "/api/v1/admin/subscriptions?limit=50",
  "/api/v1/admin/users?limit=50",
  "/api/v1/admin/map/places?limit=50",
  "/api/v1/admin/map/workflows?limit=50"
]) {
  await expectStatus(await request(adminApiUrl, path, adminJar, { headers: { origin: adminOrigin } }), 200, path);
  recordPass(`Admin read ${path}`);
}

const organizationsPayload = asObject(
  await expectStatus(await request(adminApiUrl, "/api/v1/admin/organizations?limit=50", adminJar, { headers: { origin: adminOrigin } }), 200, "Admin organization directory"),
  "Admin organization directory"
);
expect(Array.isArray(organizationsPayload.organizations), "Admin organization directory did not return an organizations array");
recordPass("Admin organization directory", `${(organizationsPayload.organizations as unknown[]).length} organizations`);

const subscriptionsPayload = asObject(
  await expectStatus(await request(adminApiUrl, "/api/v1/admin/subscriptions?limit=50", adminJar, { headers: { origin: adminOrigin } }), 200, "Admin subscription directory"),
  "Admin subscription directory"
);
expect(Array.isArray(subscriptionsPayload.subscriptions), "Admin subscription directory did not return a subscriptions array");
recordPass("Admin subscription directory", `${(subscriptionsPayload.subscriptions as unknown[]).length} subscriptions`);

const usersPayload = asObject(
  await expectStatus(await request(adminApiUrl, "/api/v1/admin/users?limit=50", adminJar, { headers: { origin: adminOrigin } }), 200, "Admin user directory"),
  "Admin user directory"
);
expect(Array.isArray(usersPayload.users), "Admin user directory did not return a users array");
recordPass("Admin user directory", `${(usersPayload.users as unknown[]).length} users`);

for (const path of ["/api/v1/admin/stores", "/api/v1/admin/query/models", "/api/v1/admin/system"]) {
  await expectStatus(await request(adminApiUrl, path, adminJar, { headers: { origin: adminOrigin } }), 404, `Removed Admin route ${path}`);
  recordPass(`Admin removed legacy route ${path}`, "404 by contract");
}

const applicationsPayload = asObject(
  await expectStatus(
    await request(adminApiUrl, "/api/v1/admin/applications", adminJar, { headers: { origin: adminOrigin } }),
    200,
    "Admin application registry"
  ),
  "Admin application registry"
);
expect(Array.isArray(applicationsPayload.applications), "Admin application registry did not return an applications array");
const applicationCodes = (applicationsPayload.applications as unknown[])
  .map((application) => {
    if (typeof application !== "object" || application === null) return undefined;
    const code = (application as JsonObject).code;
    return typeof code === "string" ? code : undefined;
  })
  .filter((code): code is string => code !== undefined);
for (const code of ["HUB", "ADMIN", "PLAY", "POS", "GO"]) {
  expect(applicationCodes.includes(code), `Application registry is missing ${code}`);
}
recordPass("Admin ↔ application registry", `${applicationCodes.length} registered applications`);

for (const application of ["HUB", "PLAY", "POS", "GO"]) {
  const response = await request(adminApiUrl, `/api/v1/access?application=${application}`, adminJar);
  const decision = asObject(
    await expectStatus(response, 401, `${application} access decision from Admin session`),
    `${application} access decision from Admin session`
  );
  const error = asObject(decision.error, `${application} access decision error`);
  expect(error.code === "AUTHENTICATION_REQUIRED", `${application} access decision did not enforce app-scoped authentication`);
  recordPass(`Admin session rejects ${application} access`, "app-scoped session boundary enforced");
}

const hubJar = new CookieJar();
const hubLogin = await request(hubApiUrl, "/api/auth/login", hubJar, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: hubOrigin
  },
  body: JSON.stringify({ email, password })
});
await expectStatus(hubLogin, 200, "Hub login");
const hubSession = sessionCookie(hubJar);
recordPass("Hub authenticated login", `${hubSession.name} cookie`);

const hubStores = asObject(
  await expectStatus(await request(hubApiUrl, "/api/v1/hub/stores", hubJar), 200, "Hub stores for launch coverage"),
  "Hub stores for launch coverage"
);
const storeRecords = Array.isArray(hubStores.stores) ? hubStores.stores : [];
const configuredLaunchStoreId = process.env.AEVO_HUB_TEST_STORE_ID?.trim();
const launchStoreId = configuredLaunchStoreId
  || (storeRecords[0] && typeof storeRecords[0] === "object" && storeRecords[0] !== null && typeof (storeRecords[0] as JsonObject).id === "string"
    ? (storeRecords[0] as JsonObject).id as string
    : undefined);
if (launchStoreId) {
  await checkHubApplicationLaunch("PLAY", launchStoreId, hubJar);
  await checkHubApplicationLaunch("POS", launchStoreId, hubJar);
} else {
  recordPass("Hub store-scoped launch coverage", "skipped because the integration identity has no store; set AEVO_HUB_TEST_STORE_ID to require it");
}

await completeWorkforceSso(
  "PLAY",
  process.env.AEVO_PLAY_API_URL?.trim() || "http://localhost:3002",
  "/api/v1/auth/me",
  "Aevo Play",
  hubJar,
  200,
  launchStoreId
);
await completeWorkforceSso(
  "POS",
  process.env.AEVO_POS_API_URL?.trim() || "http://localhost:3003",
  "/api/auth/me",
  "Aevo POS",
  hubJar,
  401,
  launchStoreId
);

const goVerifier = randomBase64Url(48);
const goState = randomBase64Url(32);
const goChallenge = await sha256Base64Url(goVerifier);
const goLoginUrl = new URL("/modern/login", hubWebUrl);
goLoginUrl.searchParams.set("app", "GO");
goLoginUrl.searchParams.set("next", "/modern");
goLoginUrl.searchParams.set("returnTo", "/auth/callback");
goLoginUrl.searchParams.set("state", goState);
goLoginUrl.searchParams.set("code_challenge", goChallenge);
const goLoginPage = await fetch(goLoginUrl, { headers: { accept: "text/html" }, signal: AbortSignal.timeout(15_000) });
const goLoginBody = await goLoginPage.text();
expect(goLoginPage.status === 200 && goLoginBody.includes("Aevo Hub"), "Aevo Go Hub login page was not reachable");
const hubCsrfName = hubJar.names().find((name) => name.includes("csrf"));
const hubCsrfToken = hubCsrfName ? hubJar.get(hubCsrfName) : undefined;
expect(hubCsrfToken, "Hub session did not include a CSRF token for Go handoff");
const goHandoff = await request(hubApiUrl, "/api/auth/handoff", hubJar, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: hubOrigin,
    "x-csrf-token": hubCsrfToken
  },
  body: JSON.stringify({ application: "GO", returnTo: "/auth/callback", state: goState, codeChallenge: goChallenge })
});
const goHandoffPayload = asObject(await expectStatus(goHandoff, 200, "Aevo Go SSO handoff"), "Aevo Go SSO handoff");
const goCode = asString(goHandoffPayload.code, "Aevo Go SSO authorization code");
const goJar = new CookieJar();
const goComplete = await request(hubApiUrl, "/api/auth/go/handoff/complete", goJar, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    origin: goOrigin
  },
  body: JSON.stringify({ code: goCode, state: goState, codeVerifier: goVerifier })
});
await expectStatus(goComplete, 200, "Aevo Go SSO exchange");
const goSession = sessionCookie(goJar);
expect(goSession.name === "aevo_go_session", `Aevo Go used unexpected session cookie ${goSession.name}`);
await expectStatus(await request(hubApiUrl, "/api/auth/go/me", goJar), 200, "Aevo Go authenticated session");
recordPass("Aevo Go end-to-end SSO", "GO-scoped session accepted by Hub Go API");

const hubTokenPresentedToAdmin = renamedSessionCookie(adminSession.name, hubSession.value);
await expectStatus(
  await request(adminApiUrl, "/api/auth/me", hubTokenPresentedToAdmin),
  401,
  "Hub session presented to Admin"
);
recordPass("Cross-app session isolation", "Hub session rejected by Admin");

const adminTokenPresentedToHub = renamedSessionCookie(hubSession.name, adminSession.value);
await expectStatus(
  await request(hubApiUrl, "/api/auth/me", adminTokenPresentedToHub),
  401,
  "Admin session presented to Hub"
);
recordPass("Reverse session isolation", "Admin session rejected by Hub");

console.log("\nAdmin integration checks passed without mutating application, organization, subscription, or user state.");
