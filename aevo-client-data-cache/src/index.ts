export const CLIENT_DATA_CACHE_SCHEMA_VERSION = 1 as const;

export interface ClientCacheNamespace {
  application: string;
  userId: string;
  organizationId?: string | null;
  storeId?: string | null;
}

export interface ClientCacheEntry<T> {
  key: string;
  namespaceKey: string;
  resourceKey: string;
  value: T;
  version: string;
  etag?: string;
  savedAt: number;
  expiresAt: number;
}

export interface ClientCacheWriteOptions {
  ttlMs?: number;
  version?: string;
  etag?: string;
}

export interface ClientCacheReadOptions {
  version?: string;
}

export interface ClientCacheLoadContext {
  etag?: string;
  version?: string;
  signal?: AbortSignal;
}

export type ClientCacheLoadResult<T> =
  | { status: "ok"; value: T; version?: string; etag?: string; ttlMs?: number }
  | { status: "not-modified"; version?: string; etag?: string; ttlMs?: number };

export type ClientCacheLoader<T> = (
  context: ClientCacheLoadContext
) => Promise<ClientCacheLoadResult<T>>;

export interface ClientCacheLoadResponse<T> {
  value: T;
  entry: ClientCacheEntry<T>;
  source: "memory" | "indexeddb" | "network" | "revalidated";
}

export interface ClientDataCacheOptions {
  namespace: ClientCacheNamespace;
  databaseName?: string;
  objectStoreName?: string;
  defaultTtlMs?: number;
  maxMemoryEntries?: number;
  now?: () => number;
}

interface StoredClientCacheEntry extends ClientCacheEntry<unknown> {}

const DEFAULT_DATABASE_NAME = "aevo-client-data-v1";
const DEFAULT_OBJECT_STORE_NAME = "entries";
const DEFAULT_TTL_MS = 60_000;
const DEFAULT_MAX_MEMORY_ENTRIES = 128;

function normalizedPart(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function namespaceKey(namespace: ClientCacheNamespace): string {
  const application = normalizedPart(namespace.application, "UNKNOWN").toUpperCase();
  const userId = normalizedPart(namespace.userId, "UNKNOWN");
  const organizationId = normalizedPart(namespace.organizationId, "none");
  const storeId = normalizedPart(namespace.storeId, "none");
  return [application, userId, organizationId, storeId]
    .map((part) => encodeURIComponent(part))
    .join("|");
}

function normalizedResourceKey(resourceKey: string): string {
  const normalized = resourceKey.trim();
  if (!normalized) throw new Error("A client cache resource key is required");
  // Authentication, authorization, session, and token responses are never
  // client-data cache entries. They remain private server/BFF decisions.
  if (/^(?:auth|access|session|permission|permissions|token)(?:[/:]|$)/iu.test(normalized)) {
    throw new Error("Authentication and authorization data cannot be stored in ClientDataCache");
  }
  return normalized;
}

function positiveMilliseconds(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || value === undefined) return fallback;
  return Math.max(1, Math.trunc(value));
}

function isBrowserIndexedDbAvailable(): boolean {
  return typeof globalThis.indexedDB !== "undefined";
}

function isUsableEntry<T>(entry: ClientCacheEntry<T> | null, now: number, expectedVersion?: string): entry is ClientCacheEntry<T> {
  return entry !== null
    && entry.expiresAt > now
    && (expectedVersion === undefined || entry.version === expectedVersion);
}

/**
 * Browser data cache for non-authoritative read models. Never use this class
 * for auth/access/session/token payloads or to bypass server authorization.
 * Each instance is isolated by app + user + organization + store namespace.
 */
export class ClientDataCache {
  private readonly namespace: string;
  private readonly databaseName: string;
  private readonly objectStoreName: string;
  private readonly defaultTtlMs: number;
  private readonly maxMemoryEntries: number;
  private readonly now: () => number;
  private readonly memory = new Map<string, ClientCacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<ClientCacheLoadResponse<unknown>>>();
  private databasePromise: Promise<IDBDatabase | null> | null = null;
  private generation = 0;

  public constructor(options: ClientDataCacheOptions) {
    if (!options.namespace.userId.trim()) throw new Error("ClientDataCache requires a user namespace");
    this.namespace = namespaceKey(options.namespace);
    this.databaseName = options.databaseName ?? DEFAULT_DATABASE_NAME;
    this.objectStoreName = options.objectStoreName ?? DEFAULT_OBJECT_STORE_NAME;
    this.defaultTtlMs = positiveMilliseconds(options.defaultTtlMs, DEFAULT_TTL_MS);
    this.maxMemoryEntries = positiveMilliseconds(options.maxMemoryEntries, DEFAULT_MAX_MEMORY_ENTRIES);
    this.now = options.now ?? Date.now;
  }

  public get namespaceKey(): string {
    return this.namespace;
  }

  public async get<T>(resourceKey: string, options: ClientCacheReadOptions = {}): Promise<ClientCacheEntry<T> | null> {
    const normalizedKey = normalizedResourceKey(resourceKey);
    const memoryEntry = this.memory.get(normalizedKey) ?? null;
    if (isUsableEntry(memoryEntry as ClientCacheEntry<T> | null, this.now(), options.version)) {
      const entry = memoryEntry as ClientCacheEntry<T>;
      this.promote(normalizedKey, entry);
      return entry;
    }
    const stored = await this.readIndexedDb(normalizedKey);
    if (isUsableEntry(stored as ClientCacheEntry<T> | null, this.now(), options.version)) {
      const entry = stored as ClientCacheEntry<T>;
      this.promote(normalizedKey, entry);
      return entry;
    }
    return null;
  }

  /**
   * Read an entry even when its TTL has elapsed. Stale values are never
   * returned as authoritative data; they are only used to send the previous
   * ETag/version to a loader so the server can answer with 304.
   */
  public async getStale<T>(resourceKey: string, options: ClientCacheReadOptions = {}): Promise<ClientCacheEntry<T> | null> {
    const normalizedKey = normalizedResourceKey(resourceKey);
    const memoryEntry = this.memory.get(normalizedKey) as ClientCacheEntry<T> | undefined;
    if (memoryEntry && (options.version === undefined || memoryEntry.version === options.version)) return memoryEntry;
    const stored = await this.readIndexedDb(normalizedKey);
    if (stored && (options.version === undefined || stored.version === options.version)) {
      const entry = stored as ClientCacheEntry<T>;
      this.promote(normalizedKey, entry);
      return entry;
    }
    return null;
  }

  public async set<T>(resourceKey: string, value: T, options: ClientCacheWriteOptions = {}): Promise<ClientCacheEntry<T>> {
    const normalizedKey = normalizedResourceKey(resourceKey);
    const savedAt = this.now();
    const entry: ClientCacheEntry<T> = {
      key: this.entryKey(normalizedKey),
      namespaceKey: this.namespace,
      resourceKey: normalizedKey,
      value,
      version: options.version ?? "1",
      ...(options.etag ? { etag: options.etag } : {}),
      savedAt,
      expiresAt: savedAt + positiveMilliseconds(options.ttlMs, this.defaultTtlMs)
    };
    this.promote(normalizedKey, entry);
    await this.writeIndexedDb(entry);
    return entry;
  }

  public async remove(resourceKey: string): Promise<void> {
    const normalizedKey = normalizedResourceKey(resourceKey);
    this.memory.delete(normalizedKey);
    await this.deleteIndexedDb(normalizedKey);
  }

  public async patch<T>(
    resourceKey: string,
    update: (current: T) => T,
    options: ClientCacheWriteOptions = {}
  ): Promise<ClientCacheEntry<T> | null> {
    const current = await this.get<T>(resourceKey);
    if (!current) return null;
    return this.set(resourceKey, update(current.value), {
      ttlMs: options.ttlMs ?? Math.max(1, current.expiresAt - this.now()),
      version: options.version ?? current.version,
      etag: options.etag ?? current.etag
    });
  }

  public async getOrLoad<T>(
    resourceKey: string,
    loader: ClientCacheLoader<T>,
    options: ClientCacheReadOptions = {}
  ): Promise<ClientCacheLoadResponse<T>> {
    const normalizedKey = normalizedResourceKey(resourceKey);
    const memoryEntry = this.memory.get(normalizedKey) as ClientCacheEntry<T> | undefined;
    const memoryHit = isUsableEntry(memoryEntry ?? null, this.now(), options.version);
    const cached = await this.get<T>(normalizedKey, options);
    if (cached) return { value: cached.value, entry: cached, source: memoryHit ? "memory" : "indexeddb" };

    const existing = this.inFlight.get(normalizedKey);
    if (existing) return existing as Promise<ClientCacheLoadResponse<T>>;

    const generation = this.generation;
    const pending = (async () => {
      const stale = await this.getStale<T>(normalizedKey, options);
      return this.loadAndStore(normalizedKey, loader, options.version, stale, generation);
    })();
    this.inFlight.set(normalizedKey, pending as Promise<ClientCacheLoadResponse<unknown>>);
    try {
      return await pending;
    } finally {
      if (this.inFlight.get(normalizedKey) === pending) this.inFlight.delete(normalizedKey);
    }
  }

  /**
   * Clear current user/tenant data during logout or namespace switch.
   *
   * The optional allow-list is used by the sync-manifest boundary: a
   * security/version marker can remain available while all other
   * non-authoritative read models are discarded.
   */
  public async clearExcept(resourceKeys: readonly string[] = []): Promise<void> {
    this.generation += 1;
    const preserved = new Set(resourceKeys.map((resourceKey) => normalizedResourceKey(resourceKey)));
    for (const resourceKey of this.memory.keys()) {
      if (!preserved.has(resourceKey)) this.memory.delete(resourceKey);
    }
    for (const resourceKey of this.inFlight.keys()) {
      if (!preserved.has(resourceKey)) this.inFlight.delete(resourceKey);
    }
    const database = await this.openDatabase();
    if (!database) return;
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(this.objectStoreName, "readwrite");
      const store = transaction.objectStore(this.objectStoreName);
      const cursorRequest = store.openCursor();
      cursorRequest.onerror = () => reject(cursorRequest.error ?? new Error("IndexedDB cursor failed"));
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        const value = cursor.value as StoredClientCacheEntry;
        if (value.namespaceKey === this.namespace && !preserved.has(value.resourceKey)) cursor.delete();
        cursor.continue();
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB clear failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB clear aborted"));
    }).catch(() => undefined);
  }

  public clear(): Promise<void> {
    return this.clearExcept();
  }

  public logoutCleanup(): Promise<void> {
    return this.clear();
  }

  private async loadAndStore<T>(
    resourceKey: string,
    loader: ClientCacheLoader<T>,
    version?: string,
    stale?: ClientCacheEntry<T> | null,
    generation = this.generation
  ): Promise<ClientCacheLoadResponse<T>> {
    const existing = stale ?? await this.getStale<T>(resourceKey, { version });
    const result = await loader({ etag: existing?.etag, version: existing?.version });
    if (generation !== this.generation) throw new Error(`Client cache load was invalidated for ${resourceKey}`);
    if (result.status === "not-modified") {
      if (!existing) throw new Error(`Client cache loader returned 304 without a cached value for ${resourceKey}`);
      const entry = await this.set(resourceKey, existing.value, {
        ttlMs: result.ttlMs,
        version: result.version ?? existing.version,
        etag: result.etag ?? existing.etag
      });
      return { value: entry.value, entry, source: "revalidated" };
    }
    const entry = await this.set(resourceKey, result.value, {
      ttlMs: result.ttlMs,
      version: result.version ?? version,
      etag: result.etag
    });
    return { value: entry.value, entry, source: "network" };
  }

  private entryKey(resourceKey: string): string {
    return `${this.namespace}::${resourceKey}`;
  }

  private promote<T>(resourceKey: string, entry: ClientCacheEntry<T>): void {
    this.memory.delete(resourceKey);
    this.memory.set(resourceKey, entry);
    while (this.memory.size > this.maxMemoryEntries) {
      const oldest = this.memory.keys().next().value;
      if (oldest === undefined) break;
      this.memory.delete(oldest);
    }
  }

  private openDatabase(): Promise<IDBDatabase | null> {
    if (!isBrowserIndexedDbAvailable()) return Promise.resolve(null);
    if (this.databasePromise) return this.databasePromise;
    this.databasePromise = new Promise<IDBDatabase | null>((resolve) => {
      let request: IDBOpenDBRequest;
      try {
        request = globalThis.indexedDB.open(this.databaseName, CLIENT_DATA_CACHE_SCHEMA_VERSION);
      } catch {
        resolve(null);
        return;
      }
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(this.objectStoreName)) {
          const store = database.createObjectStore(this.objectStoreName, { keyPath: "key" });
          store.createIndex("namespaceKey", "namespaceKey", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
    return this.databasePromise;
  }

  private async readIndexedDb(resourceKey: string): Promise<StoredClientCacheEntry | null> {
    const database = await this.openDatabase();
    if (!database) return null;
    return new Promise<StoredClientCacheEntry | null>((resolve) => {
      try {
        const transaction = database.transaction(this.objectStoreName, "readonly");
        const request = transaction.objectStore(this.objectStoreName).get(this.entryKey(resourceKey));
        request.onsuccess = () => {
          const value = request.result as StoredClientCacheEntry | undefined;
          resolve(value?.namespaceKey === this.namespace ? value : null);
        };
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  private async writeIndexedDb<T>(entry: ClientCacheEntry<T>): Promise<void> {
    const database = await this.openDatabase();
    if (!database) return;
    await new Promise<void>((resolve) => {
      try {
        const transaction = database.transaction(this.objectStoreName, "readwrite");
        transaction.objectStore(this.objectStoreName).put(entry as StoredClientCacheEntry);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
        transaction.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  private async deleteIndexedDb(resourceKey: string): Promise<void> {
    const database = await this.openDatabase();
    if (!database) return;
    await new Promise<void>((resolve) => {
      try {
        const transaction = database.transaction(this.objectStoreName, "readwrite");
        transaction.objectStore(this.objectStoreName).delete(this.entryKey(resourceKey));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
        transaction.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export function createClientDataCache(options: ClientDataCacheOptions): ClientDataCache {
  return new ClientDataCache(options);
}
