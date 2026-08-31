/**
 * In-Memory TTL Cache Utility
 * Lightweight pure-JS cache for static and read-heavy aggregation endpoints
 * to minimize database queries and CPU load under concurrent requests.
 */

class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  /**
   * Get value from cache if not expired
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set value in cache with TTL
   * @param {string} key
   * @param {any} value
   * @param {number} ttlSeconds - Time-to-live in seconds (0 = indefinite)
   */
  set(key, value, ttlSeconds = 60) {
    const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Delete a specific cache key
   * @param {string} key
   */
  del(key) {
    this.store.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix
   * @param {string} prefix
   */
  delPrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.store.clear();
  }
}

const cache = new MemoryCache();

module.exports = cache;
