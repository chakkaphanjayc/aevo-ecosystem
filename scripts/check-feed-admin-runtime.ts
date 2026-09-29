type JsonObject = Record<string, unknown>;

class CookieJar {
  private readonly values = new Map<string, string>();

  set(name: string, value: string): void {
    this.values.set(name, value);
  }

  header(): string {
    return [...this.values.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }
}

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function pass(label: string, detail?: string): void {
  console.log(`PASS  ${label}${detail ? `  ${detail}` : ""}`);
}

function setCookies(response: Response, jar: CookieJar): void {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  for (const header of headers.getSetCookie?.() ?? []) {
    const match = /^([^=;]+)=([^;]*)/u.exec(header);
    if (match) jar.set(match[1], match[2]);
  }
}

async function request(baseUrl: string, path: string, jar: CookieJar, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("accept")) headers.set("accept", "application/json");
  const cookie = jar.header();
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(15_000)
  });
  setCookies(response, jar);
  return response;
}

async function json(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

async function expectStatus(response: Response, expected: number, label: string): Promise<unknown> {
  const payload = await json(response);
  expect(response.status === expected, `${label}: expected HTTP ${expected}, received ${response.status}`);
  return payload;
}

function object(value: unknown, label: string): JsonObject {
  expect(typeof value === "object" && value !== null && !Array.isArray(value), `${label} must be an object`);
  return value as JsonObject;
}

const adminApiUrl = process.env.AEVO_ADMIN_API_URL?.trim() || "http://localhost:4001";
const adminWebUrl = process.env.AEVO_ADMIN_WEB_ORIGIN?.trim() || "http://localhost:4335";
const email = process.env.AEVO_ADMIN_TEST_EMAIL?.trim() || process.env.SEED_OWNER_EMAIL?.trim();
const password = process.env.AEVO_ADMIN_TEST_PASSWORD || process.env.SEED_OWNER_PASSWORD;
expect(email && password, "Set AEVO_ADMIN_TEST_EMAIL/AEVO_ADMIN_TEST_PASSWORD or load aevo-hub/.env");

const jar = new CookieJar();
const login = await request(adminApiUrl, "/api/auth/login", jar, {
  method: "POST",
  headers: { "content-type": "application/json", origin: adminWebUrl },
  body: JSON.stringify({ email, password })
});
await expectStatus(login, 200, "Admin login");
expect(jar.header().includes("aevo_admin_session="), "Admin login did not issue an Admin session cookie");
expect(jar.header().includes("aevo_admin_csrf="), "Admin login did not issue an Admin CSRF cookie");
pass("Feed Admin authenticated login", "separate Admin session + CSRF cookies");

const access = object(await expectStatus(await request(adminApiUrl, "/api/v1/access?application=ADMIN", jar), 200, "Admin access"), "Admin access");
expect(access.allowed === true, "Admin platform access was denied");
pass("Feed Admin platform access", String(access.platformRole ?? "role"));

const apiPaths = [
  "/api/v1/admin/go/feed/config",
  "/api/v1/admin/go/feed/guardrails",
  "/api/v1/admin/go/feed/propagation",
  "/api/v1/admin/go/feed/config/revisions?limit=12",
  "/api/v1/admin/go/feed/events/health",
  "/api/v1/admin/go/feed/discovery-evaluation?days=30",
  "/api/v1/admin/go/feed/projections/health",
  "/api/v1/admin/go/feed/sources/health",
  "/api/v1/admin/go/feed/moderation?status=OPEN&limit=50"
] as const;

for (const path of apiPaths) {
  const payload = await expectStatus(await request(adminApiUrl, path, jar), 200, path);
  expect(payload !== null, `${path} returned an empty payload`);
  pass(`Feed Admin API ${path}`);
}

const config = object(await json(await request(adminApiUrl, "/api/v1/admin/go/feed/config", jar)), "Feed config");
expect(typeof config.config === "object" && config.config !== null, "Feed config did not include a runtime config document");
pass("Feed config payload shape");

const sourcesHealth = object(await json(await request(adminApiUrl, "/api/v1/admin/go/feed/sources/health", jar)), "Feed source health");
expect(Array.isArray(sourcesHealth.sources), "Feed source health did not include source entries");
pass("Feed source health payload shape");

for (const [path, heading] of [["/go/feed", "Feed operations"], ["/go/feed/moderation", "Moderation queue"], ["/go/settings", "Go settings"]] as const) {
  const page = await request(adminWebUrl, path, jar, { headers: { accept: "text/html" } });
  const body = await page.text();
  expect(page.status === 200, `${path}: expected HTTP 200, received ${page.status}`);
  expect(body.includes(`<h1>${heading}</h1>`), `${path}: SSR heading is missing`);
  expect(!body.includes("temporarily unavailable"), `${path}: SSR rendered the temporary-error boundary`);
  pass(`Feed Admin SSR ${path}`);
}

const anonymousPage = await request(adminWebUrl, "/go/feed", new CookieJar(), { headers: { accept: "text/html" } });
expect(anonymousPage.status === 302, `Unauthenticated /go/feed should redirect to login, received ${anonymousPage.status}`);
pass("Feed Admin unauthenticated redirect");

console.log("\nConnected Feed/Admin runtime checks passed without mutating Feed, config, moderation, or user data.");
