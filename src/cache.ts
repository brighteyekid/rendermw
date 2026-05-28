/**
 * Internal structure for a cached entry.
 */
interface CacheEntry {
  value: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

/**
 * In-memory TTL cache for rendered HTML strings.
 *
 * Uses a plain `Map` — no Redis, no filesystem, no external deps.
 * Expired entries are lazily evicted on read.
 *
 * @example
 * const cache = new RenderCache();
 * cache.set('/products/shoes', '<html>...</html>', 3600);
 * const html = cache.get('/products/shoes'); // returns HTML or null if expired
 */
export class RenderCache {
  private readonly store = new Map<string, CacheEntry>();

  /**
   * Retrieves a cached HTML string for the given key.
   * Returns `null` if the entry does not exist or has expired.
   * Expired entries are deleted on access (lazy eviction).
   *
   * @param key - Cache key (typically request path + stringified query).
   */
  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Stores an HTML string under the given key with a TTL.
   *
   * @param key        - Cache key.
   * @param value      - HTML string to cache.
   * @param ttlSeconds - Time-to-live in seconds.
   */
  set(key: string, value: string, ttlSeconds: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Removes a single entry from the cache.
   *
   * @param key - Cache key to remove.
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Removes all entries from the cache.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Returns the current number of entries in the cache.
   * Note: this includes entries that may have expired but not yet been evicted.
   */
  size(): number {
    return this.store.size;
  }
}
