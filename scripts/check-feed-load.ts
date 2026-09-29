type JsonRecord = Record<string, unknown>;

export interface FeedLoadOptions {
  endpoint: string;
  requests: number;
  concurrency: number;
  limit: number;
  timeoutMs: number;
  cookie?: string;
  maxP95Ms?: number;
  maxErrorRatePercent?: number;
  allowRemote: boolean;
}

export interface FeedLoadSample {
  ok: boolean;
  status: number | null;
  latencyMs: number;
  itemCount: number;
  degraded: boolean;
  error?: string;
}

export interface FeedLoadReport {
  endpoint: string;
  total: number;
  successful: number;
  failed: number;
  errorRatePercent: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  totalItems: number;
  degradedResponses: number;
  statuses: Record<string, number>;
  samples: FeedLoadSample[];
}

const forbiddenPublicKeys = new Set([
  "source",
  "score",
  "rawScore",
  "privateAffinity",
  "moderationState",
  "exactLocation",
  "sql"
]);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function percentile(values: number[], percentage: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentage) - 1));
  return sorted[index] ?? 0;
}

function itemKey(value: JsonRecord): string {
  return `${String(value.itemType)}:${String(value.id)}:${String(value.itemToken)}`;
}

function validatePublicItem(value: unknown): JsonRecord {
  if (!isRecord(value)) throw new Error("Feed item is not an object.");
  if (value.itemType !== "TRACE" && value.itemType !== "PLACE") {
    throw new Error("Feed item has an unsupported itemType.");
  }
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.itemToken)) {
    throw new Error("Feed item is missing id or itemToken.");
  }
  for (const key of forbiddenPublicKeys) {
    if (key in value) throw new Error(`Feed item exposes forbidden field ${key}.`);
  }
  return value;
}

export function validateFeedResponse(payload: unknown): { itemCount: number; degraded: boolean } {
  if (!isRecord(payload)
      || !isNonEmptyString(payload.feedSessionId)
      || !isNonEmptyString(payload.configVersion)
      || !isNonEmptyString(payload.rankingVersion)
      || typeof payload.degraded !== "boolean"
      || !Array.isArray(payload.items)) {
    throw new Error("Feed response is missing the typed v1 envelope.");
  }

  const items = payload.items.map(validatePublicItem);
  const uniqueItems = new Set(items.map(itemKey));
  if (uniqueItems.size !== items.length) throw new Error("Feed response contains duplicate items.");

  if (payload.modules !== undefined) {
    if (!Array.isArray(payload.modules)) throw new Error("Feed modules must be an array.");
    for (const module of payload.modules) {
      if (!isRecord(module) || !isNonEmptyString(module.moduleId) || !Array.isArray(module.items)) {
        throw new Error("Feed module is malformed.");
      }
      for (const reference of module.items) {
        if (!isRecord(reference)
            || (reference.itemType !== "TRACE" && reference.itemType !== "PLACE")
            || !isNonEmptyString(reference.itemId)
            || !isNonEmptyString(reference.itemToken)) {
          throw new Error("Feed module reference is malformed.");
        }
        const matchingItem = items.find((item) =>
          item.itemType === reference.itemType
          && item.id === reference.itemId
          && item.itemToken === reference.itemToken);
        if (!matchingItem) throw new Error("Feed module references an item outside the public page.");
      }
    }
  }

  return { itemCount: items.length, degraded: payload.degraded };
}

function localEndpoint(url: URL): boolean {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
}

function buildRequestUrl(endpoint: string, limit: number): URL {
  const url = new URL(endpoint);
  if (!url.searchParams.has("surface")) url.searchParams.set("surface", "explore");
  if (!url.searchParams.has("tab")) url.searchParams.set("tab", "for_you");
  url.searchParams.set("limit", String(limit));
  return url;
}

async function requestFeed(url: URL, options: FeedLoadOptions): Promise<FeedLoadSample> {
  const startedAt = performance.now();
  try {
    const headers = new Headers({ accept: "application/json" });
    if (options.cookie) headers.set("cookie", options.cookie);
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(options.timeoutMs)
    });
    const latencyMs = Math.round(performance.now() - startedAt);
    const body = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        latencyMs,
        itemCount: 0,
        degraded: false,
        error: `HTTP ${response.status}`
      };
    }

    let payload: unknown;
    try {
      payload = JSON.parse(body) as unknown;
    } catch {
      return { ok: false, status: response.status, latencyMs, itemCount: 0, degraded: false, error: "Response was not JSON." };
    }
    const summary = validateFeedResponse(payload);
    return { ok: true, status: response.status, latencyMs, ...summary };
  } catch (error) {
    return {
      ok: false,
      status: null,
      latencyMs: Math.round(performance.now() - startedAt),
      itemCount: 0,
      degraded: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function runFeedLoad(options: FeedLoadOptions): Promise<FeedLoadReport> {
  if (!Number.isInteger(options.requests) || options.requests < 1 || options.requests > 10_000) {
    throw new Error("requests must be an integer between 1 and 10000.");
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 100) {
    throw new Error("concurrency must be an integer between 1 and 100.");
  }
  if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 50) {
    throw new Error("limit must be an integer between 1 and 50.");
  }

  const target = buildRequestUrl(options.endpoint, options.limit);
  if (!options.allowRemote && !localEndpoint(target)) {
    throw new Error("Remote load is disabled. Set AEVO_FEED_LOAD_ALLOW_REMOTE=true only for an approved environment.");
  }

  const samples: FeedLoadSample[] = [];
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex++;
      if (index >= options.requests) return;
      samples[index] = await requestFeed(target, options);
    }
  }

  await Promise.all(Array.from({ length: Math.min(options.concurrency, options.requests) }, () => worker()));

  const latencies = samples.map((sample) => sample.latencyMs);
  const successful = samples.filter((sample) => sample.ok).length;
  const statuses: Record<string, number> = {};
  for (const sample of samples) {
    const key = String(sample.status ?? "network_error");
    statuses[key] = (statuses[key] ?? 0) + 1;
  }
  const report: FeedLoadReport = {
    endpoint: `${target.origin}${target.pathname}`,
    total: samples.length,
    successful,
    failed: samples.length - successful,
    errorRatePercent: ((samples.length - successful) / samples.length) * 100,
    p50Ms: percentile(latencies, 0.5),
    p95Ms: percentile(latencies, 0.95),
    maxMs: Math.max(...latencies, 0),
    totalItems: samples.reduce((total, sample) => total + sample.itemCount, 0),
    degradedResponses: samples.filter((sample) => sample.degraded).length,
    statuses,
    samples
  };

  if (report.errorRatePercent > (options.maxErrorRatePercent ?? 0)) {
    throw new Error(`Feed load error rate ${report.errorRatePercent.toFixed(2)}% exceeds ${options.maxErrorRatePercent ?? 0}%.`);
  }
  if (options.maxP95Ms !== undefined && report.p95Ms > options.maxP95Ms) {
    throw new Error(`Feed load p95 ${report.p95Ms}ms exceeds ${options.maxP95Ms}ms.`);
  }
  return report;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function optionalNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function argumentValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export function parseFeedLoadOptions(args: string[], environment: NodeJS.ProcessEnv = process.env): FeedLoadOptions {
  const endpoint = argumentValue(args, "--url") ?? environment.AEVO_FEED_LOAD_URL;
  if (!endpoint) throw new Error("Set AEVO_FEED_LOAD_URL or pass --url <endpoint>.");
  return {
    endpoint,
    requests: positiveInteger(argumentValue(args, "--requests") ?? environment.AEVO_FEED_LOAD_REQUESTS, 50),
    concurrency: positiveInteger(argumentValue(args, "--concurrency") ?? environment.AEVO_FEED_LOAD_CONCURRENCY, 5),
    limit: positiveInteger(argumentValue(args, "--limit") ?? environment.AEVO_FEED_LOAD_LIMIT, 24),
    timeoutMs: positiveInteger(argumentValue(args, "--timeout-ms") ?? environment.AEVO_FEED_LOAD_TIMEOUT_MS, 5_000),
    cookie: environment.AEVO_FEED_LOAD_COOKIE?.trim() || undefined,
    maxP95Ms: optionalNumber(argumentValue(args, "--max-p95-ms") ?? environment.AEVO_FEED_LOAD_MAX_P95_MS),
    maxErrorRatePercent: optionalNumber(argumentValue(args, "--max-error-rate-percent") ?? environment.AEVO_FEED_LOAD_MAX_ERROR_RATE_PERCENT),
    allowRemote: environment.AEVO_FEED_LOAD_ALLOW_REMOTE === "true"
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: AEVO_FEED_LOAD_URL=http://localhost:4000/api/v1/public/feed bun run scripts/check-feed-load.ts [--requests 50] [--concurrency 5] [--limit 24] [--max-p95-ms 500]");
    console.log("Remote targets require AEVO_FEED_LOAD_ALLOW_REMOTE=true; no remote load is enabled by default.");
    return;
  }
  const options = parseFeedLoadOptions(args);
  const report = await runFeedLoad(options);
  console.log(JSON.stringify({
    endpoint: report.endpoint,
    total: report.total,
    successful: report.successful,
    failed: report.failed,
    errorRatePercent: Number(report.errorRatePercent.toFixed(2)),
    p50Ms: report.p50Ms,
    p95Ms: report.p95Ms,
    maxMs: report.maxMs,
    totalItems: report.totalItems,
    degradedResponses: report.degradedResponses,
    statuses: report.statuses
  }, null, 2));
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
