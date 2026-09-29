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
  totalMs: number | null;
  dbQueryCount: number | null;
}

const edgeOrigin = (process.env.AEVO_BENCHMARK_EDGE_ORIGIN?.trim() || process.env.AEVO_BENCHMARK_HUB_ORIGIN?.trim() || "http://localhost:4000").replace(/\/+$/u, "");
const email = process.env.AEVO_BENCHMARK_EMAIL?.trim() || process.env.SEED_OWNER_EMAIL?.trim();
const password = process.env.AEVO_BENCHMARK_PASSWORD || process.env.SEED_OWNER_PASSWORD;
const sampleCount = Math.max(2, Math.min(50, Number.parseInt(process.env.AEVO_BENCHMARK_SAMPLES || "8", 10) || 8));

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

async function login(): Promise<CookieJar> {
  const jar: CookieJar = { values: new Map() };
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
  return jar;
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
    totalMs: headerNumber(response, "x-aevo-perf-total-ms"),
    dbQueryCount: headerNumber(response, "x-aevo-perf-db-query-count")
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

function report(samples: Sample[]): void {
  const groups = new Map<string, Sample[]>();
  for (const sampleValue of samples) {
    const key = `${sampleValue.phase}:${sampleValue.endpoint}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(sampleValue);
    else groups.set(key, [sampleValue]);
  }

  console.log("Aevo auth/cache benchmark");
  console.log(`edge=${edgeOrigin} samples=${sampleCount}`);
  console.log("phase endpoint status p50_ms p95_ms cache db_wall_ms db_aggregate_ms db_queries");
  for (const [key, group] of groups) {
    const [phase, endpoint] = key.split(":", 2);
    const elapsed = group.map((item) => item.elapsedMs);
    const dbWall = group.map((item) => item.dbWallMs).filter((value): value is number => value !== null);
    const dbAggregate = group.map((item) => item.dbAggregateMs).filter((value): value is number => value !== null);
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
      format(percentile(queryCounts, 0.5))
    ].join(" "));
  }
}

const endpoints = [
  "/api/auth/me",
  "/api/v1/access?application=HUB"
] as const;
const samples: Sample[] = [];

const coldJar = await login();
for (const endpoint of endpoints) samples.push(await sample(coldJar, "cold", endpoint));

for (let index = 0; index < sampleCount; index += 1) {
  for (const endpoint of endpoints) samples.push(await sample(coldJar, "warm", endpoint));
}

report(samples);
