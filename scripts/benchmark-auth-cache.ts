interface CookieJar {
  values: Map<string, string>;
}

interface Sample {
  phase: "cold" | "warm";
  endpoint: string;
  status: number;
  elapsedMs: number;
  cache: string;
  dbWallMs: number | null;
  dbAggregateMs: number | null;
  dbOpenMs: number | null;
  totalMs: number | null;
  dbQueryCount: number | null;
  dbOps: string;
}

interface LoginResult {
  jar: CookieJar;
  elapsedMs: number;
}

const edgeOrigin = (process.env.AEVO_BENCHMARK_EDGE_ORIGIN?.trim() || process.env.AEVO_BENCHMARK_HUB_ORIGIN?.trim() || "http://localhost:4000").replace(/\/+$/u, "");
const email = process.env.AEVO_BENCHMARK_EMAIL?.trim() || process.env.SEED_OWNER_EMAIL?.trim();
const password = process.env.AEVO_BENCHMARK_PASSWORD || process.env.SEED_OWNER_PASSWORD;
const sampleCount = Math.max(2, Math.min(50, Number.parseInt(process.env.AEVO_BENCHMARK_SAMPLES || "8", 10) || 8));
const coldSampleCount = Math.max(2, Math.min(20, Number.parseInt(process.env.AEVO_BENCHMARK_COLD_SAMPLES || "4", 10) || 4));

if (!email || !password) {
  console.error("Set AEVO_BENCHMARK_EMAIL and AEVO_BENCHMARK_PASSWORD (or load a local .env with SEED_OWNER_EMAIL/SEED_OWNER_PASSWORD).");
  process.exit(2);
}

function rememberCookies(jar: CookieJar, response: Response): void {
  for (const header of response.headers.getSetCookie?.() ?? []) {
    const pair = header.split(";", 1)[0] ?? "";
    const separator = pair.indexOf("=");
    if (separator <= 0) continue;
    jar.values.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

function cookieHeader(jar: CookieJar): string {
  return [...jar.values.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function login(): Promise<LoginResult> {
  const jar: CookieJar = { values: new Map() };
  const startedAt = performance.now();
  const response = await fetch(`${edgeOrigin}/api/auth/login`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-aevo-app": "HUB"
    },
    body: JSON.stringify({ email, password, rememberMe: false })
  });
  rememberCookies(jar, response);
  if (!response.ok || !jar.values.has("aevo_hub_session")) {
    const body = await response.text();
    throw new Error(`Hub benchmark login failed (${response.status}): ${body.slice(0, 240)}`);
  }
  return { jar, elapsedMs: performance.now() - startedAt };
}

function headerNumber(response: Response, name: string): number | null {
  const value = response.headers.get(name);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function sample(jar: CookieJar, phase: Sample["phase"], endpoint: string): Promise<Sample> {
  const startedAt = performance.now();
  const response = await fetch(`${edgeOrigin}${endpoint}`, {
    headers: {
      accept: "application/json",
      cookie: cookieHeader(jar),
      "x-aevo-app": "HUB"
    }
  });
  const elapsedMs = performance.now() - startedAt;
  await response.arrayBuffer();
  return {
    phase,
    endpoint,
    status: response.status,
    elapsedMs,
    cache: response.headers.get("x-aevo-perf-cache") ?? "unavailable",
    dbWallMs: headerNumber(response, "x-aevo-perf-db-wall-ms"),
    dbAggregateMs: headerNumber(response, "x-aevo-perf-db-aggregate-ms"),
    dbOpenMs: headerNumber(response, "x-aevo-perf-db-open-ms"),
    totalMs: headerNumber(response, "x-aevo-perf-total-ms"),
    dbQueryCount: headerNumber(response, "x-aevo-perf-db-query-count"),
    dbOps: response.headers.get("x-aevo-perf-db-ops") ?? "unavailable"
  };
}

function percentile(values: number[], percentileValue: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(percentileValue * sorted.length) - 1));
  return sorted[index] ?? null;
}

function format(value: number | null): string {
  return value === null ? "—" : value.toFixed(1);
}

function report(samples: Sample[], loginElapsedMs: number[]): void {
  const groups = new Map<string, Sample[]>();
  for (const sampleValue of samples) {
    const key = `${sampleValue.phase}:${sampleValue.endpoint}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(sampleValue);
    else groups.set(key, [sampleValue]);
  }

  console.log("Aevo auth/cache benchmark");
  console.log(`edge=${edgeOrigin} cold_samples=${coldSampleCount} warm_samples=${sampleCount}`);
  console.log("phase endpoint status p50_ms p95_ms cache db_wall_ms db_aggregate_ms db_open_ms db_queries db_ops");
  for (const [key, group] of groups) {
    const [phase, endpoint] = key.split(":", 2);
    const elapsed = group.map((item) => item.elapsedMs);
    const dbWall = group.map((item) => item.dbWallMs).filter((value): value is number => value !== null);
    const dbAggregate = group.map((item) => item.dbAggregateMs).filter((value): value is number => value !== null);
    const dbOpen = group.map((item) => item.dbOpenMs).filter((value): value is number => value !== null);
    const queryCounts = group.map((item) => item.dbQueryCount).filter((value): value is number => value !== null);
    const cacheCounts = group.reduce<Record<string, number>>((counts, item) => {
      counts[item.cache] = (counts[item.cache] ?? 0) + 1;
      return counts;
    }, {});
    const status = [...new Set(group.map((item) => item.status))].join(",");
    console.log([
      phase,
      endpoint,
      status,
      format(percentile(elapsed, 0.5)),
      format(percentile(elapsed, 0.95)),
      Object.entries(cacheCounts).map(([name, count]) => `${name}:${count}`).join(","),
      format(percentile(dbWall, 0.5)),
      format(percentile(dbAggregate, 0.5)),
      format(percentile(dbOpen, 0.5)),
      format(percentile(queryCounts, 0.5)),
      group[0]?.dbOps ?? "unavailable"
    ].join(" "));
  }
  console.log(`login_samples count=${loginElapsedMs.length} p50_ms=${format(percentile(loginElapsedMs, 0.5))} p95_ms=${format(percentile(loginElapsedMs, 0.95))}`);
}

function verifyTarget(samples: Sample[], phase: Sample["phase"], targetMs: number): void {
  const groups = new Map<string, Sample[]>();
  for (const sampleValue of samples.filter((item) => item.phase === phase)) {
    const bucket = groups.get(sampleValue.endpoint);
    if (bucket) bucket.push(sampleValue);
    else groups.set(sampleValue.endpoint, [sampleValue]);
  }

  const failures: string[] = [];
  for (const [endpoint, group] of groups) {
    const p95 = percentile(group.map((item) => item.elapsedMs), 0.95) ?? Number.POSITIVE_INFINITY;
    const status = p95 <= targetMs ? "PASS" : "FAIL";
    console.log(`${phase}_slo endpoint=${endpoint} p95_ms=${format(p95)} target_ms=${format(targetMs)} status=${status}`);
    if (p95 > targetMs) failures.push(`${endpoint}=${p95.toFixed(1)}ms`);
  }

  if (failures.length > 0) {
    throw new Error(`${phase} performance target exceeded: ${failures.join(", ")}`);
  }
}

const endpoints = [
  "/api/auth/me?includeStores=true",
  "/api/v1/hub/stores",
  "/api/v1/hub/overview/organization",
  "/api/v1/access?application=HUB"
] as const;
const samples: Sample[] = [];
const loginElapsedMs: number[] = [];

// Give every cold sample a fresh session so one endpoint cannot reuse the
// session/principal cache from another sample. Core primes the server-side
// read models during login; login is measured separately from the first route.
for (let index = 0; index < coldSampleCount; index += 1) {
  for (const endpoint of endpoints) {
    const loginResult = await login();
    loginElapsedMs.push(loginResult.elapsedMs);
    samples.push(await sample(loginResult.jar, "cold", endpoint));
  }
}

const warmLogin = await login();
loginElapsedMs.push(warmLogin.elapsedMs);
const warmJar = warmLogin.jar;
// Prime one request per route before collecting warm samples. The warm phase
// measures reusable-cache latency, while the cold phase measures the first
// authenticated route request after a fresh session is issued.
for (const endpoint of endpoints) await sample(warmJar, "warm", endpoint);
for (let index = 0; index < sampleCount; index += 1) {
  for (const endpoint of endpoints) samples.push(await sample(warmJar, "warm", endpoint));
}

report(samples, loginElapsedMs);
const targetMs = Number.parseFloat(process.env.AEVO_BENCHMARK_TARGET_MS || "100");
verifyTarget(samples, "cold", targetMs);
verifyTarget(samples, "warm", targetMs);
