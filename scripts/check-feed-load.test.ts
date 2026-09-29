import { describe, expect, test } from "bun:test";
import { parseFeedLoadOptions, runFeedLoad, validateFeedResponse } from "./check-feed-load";

describe("Feed load harness", () => {
  test("validates the public envelope and module references", () => {
    expect(validateFeedResponse({
      feedSessionId: "session-1",
      configVersion: "1",
      rankingVersion: "deterministic-v1",
      degraded: false,
      items: [{ itemType: "TRACE", id: "trace-1", itemToken: "opaque-1" }],
      modules: [{
        moduleId: "FOR_YOU",
        title: "For you",
        reasonCode: "PERSONALIZED_DISCOVERY",
        items: [{ itemType: "TRACE", itemId: "trace-1", itemToken: "opaque-1" }]
      }]
    })).toEqual({ itemCount: 1, degraded: false });
  });

  test("rejects private fields and references outside the page", () => {
    expect(() => validateFeedResponse({
      feedSessionId: "session-1",
      configVersion: "1",
      rankingVersion: "deterministic-v1",
      degraded: false,
      items: [{ itemType: "PLACE", id: "place-1", itemToken: "opaque-1", score: 0.9 }]
    })).toThrow("forbidden field score");

    expect(() => validateFeedResponse({
      feedSessionId: "session-1",
      configVersion: "1",
      rankingVersion: "deterministic-v1",
      degraded: false,
      items: [{ itemType: "PLACE", id: "place-1", itemToken: "opaque-1" }],
      modules: [{ moduleId: "FOR_YOU", items: [{ itemType: "PLACE", itemId: "place-2", itemToken: "opaque-2" }] }]
    })).toThrow("outside the public page");
  });

  test("runs bounded concurrent requests and computes an observable report", async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return Response.json({
        feedSessionId: `session-${calls}`,
        configVersion: "1",
        rankingVersion: "deterministic-v1",
        degraded: false,
        items: [{ itemType: "PLACE", id: `place-${calls}`, itemToken: `opaque-${calls}` }]
      });
    }) as typeof globalThis.fetch;

    try {
      const report = await runFeedLoad({
        endpoint: "http://127.0.0.1:5099/api/v1/public/feed",
        requests: 4,
        concurrency: 2,
        limit: 3,
        timeoutMs: 1_000,
        maxErrorRatePercent: 0,
        allowRemote: false
      });
      expect(report.successful).toBe(4);
      expect(report.failed).toBe(0);
      expect(report.totalItems).toBe(4);
      expect(report.statuses["200"]).toBe(4);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("keeps remote load opt-in", () => {
    const options = parseFeedLoadOptions(["--url", "https://production.example"], {});
    expect(options.allowRemote).toBe(false);
    expect(runFeedLoad(options)).rejects.toThrow("Remote load is disabled");
  });
});
