const DEFAULT_LIMIT = 1000;

class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  set(key, value, ttlSeconds) {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt, touchedAt: Date.now() });
    this.compact();
    return value;
  }

  get(key) {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    entry.touchedAt = Date.now();
    return entry.value;
  }

  del(key) {
    this.store.delete(key);
  }

  keys(prefix = "") {
    return [...this.store.keys()].filter((key) => key.startsWith(prefix));
  }

  compact(limit = DEFAULT_LIMIT) {
    if (this.store.size <= limit) {
      return;
    }

    const ordered = [...this.store.entries()].sort((a, b) => a[1].touchedAt - b[1].touchedAt);
    const removable = ordered.slice(0, this.store.size - limit);
    removable.forEach(([key]) => this.store.delete(key));
  }
}

module.exports = new MemoryCache();
