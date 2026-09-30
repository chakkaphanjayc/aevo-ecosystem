import { describe, expect, test } from "bun:test";
import { ClientDataCache } from "../src/index";

describe("ClientDataCache", () => {
  test("keeps namespaces isolated and rejects auth-shaped resources", async () => {
    const first = new ClientDataCache({ namespace: { application: "PLAY", userId: "user-1" } });
    const second = new ClientDataCache({ namespace: { application: "PLAY", userId: "user-2" } });

    await first.set("venues", [{ id: "venue-1" }]);

    expect(await second.get("venues")).toBeNull();
    expect((await first.get("venues"))?.value).toEqual([{ id: "venue-1" }]);
    await expect(first.set("auth/session", { token: "never" })).rejects.toThrow("cannot be stored");
  });

  test("revalidates an expired entry with its previous ETag", async () => {
    let now = 1_000;
    const cache = new ClientDataCache({
      namespace: { application: "ADMIN", userId: "user-1" },
      defaultTtlMs: 10,
      now: () => now
    });
    let loads = 0;

    await cache.getOrLoad("overview", async ({ etag }) => {
      loads += 1;
      expect(etag).toBeUndefined();
      return { status: "ok", value: { count: 1 }, etag: '"v1"' };
    });
    now = 2_000;
    const stale = await cache.getStale<{ count: number }>("overview");
    expect(stale?.etag).toBe('"v1"');
    const refreshed = await cache.getOrLoad("overview", async ({ etag }) => {
      loads += 1;
      expect(etag).toBe('"v1"');
      return { status: "not-modified", etag: '"v1"', ttlMs: 100 };
    });

    expect(refreshed.source).toBe("revalidated");
    expect(refreshed.value).toEqual({ count: 1 });
    expect(loads).toBe(2);
  });

  test("single-flights overlapping network loads", async () => {
    const cache = new ClientDataCache({ namespace: { application: "HUB", userId: "user-1" } });
    let loads = 0;
    const loader = async () => {
      loads += 1;
      await Promise.resolve();
      return { status: "ok" as const, value: { ready: true } };
    };

    const results = await Promise.all([
      cache.getOrLoad("stores", loader),
      cache.getOrLoad("stores", loader),
      cache.getOrLoad("stores", loader)
    ]);

    expect(loads).toBe(1);
    expect(results.map((result) => result.value)).toEqual([{ ready: true }, { ready: true }, { ready: true }]);
  });

  test("clears read models while preserving a sync marker", async () => {
    const cache = new ClientDataCache({ namespace: { application: "HUB", userId: "user-1" } });

    await cache.set("sync/manifest", { resources: { memberships: "v2" } });
    await cache.set("stores", [{ id: "store-1" }]);
    await cache.clearExcept(["sync/manifest"]);

    expect(await cache.get("sync/manifest")).not.toBeNull();
    expect(await cache.get("stores")).toBeNull();
  });

  test("does not repopulate a namespace after an in-flight load is cleared", async () => {
    const cache = new ClientDataCache({ namespace: { application: "PLAY", userId: "user-1" } });
    let markLoaderStarted!: () => void;
    const loaderStarted = new Promise<void>((resolve) => { markLoaderStarted = resolve; });
    let resolveLoader!: (value: { status: "ok"; value: { stale: false } }) => void;
    const pending = cache.getOrLoad("venues", () => {
      markLoaderStarted();
      return new Promise((resolve) => { resolveLoader = resolve; });
    });
    await loaderStarted;
    await cache.clear();
    resolveLoader({ status: "ok", value: { stale: false } });

    await expect(pending).rejects.toThrow("invalidated");
    expect(await cache.get("venues")).toBeNull();
  });
});
