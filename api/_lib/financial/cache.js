// Financial data cache with per-source TTL
const cache = new Map();

const TTL = {
  fred: 6 * 60 * 60 * 1000,      // 6 hours
  sec: 15 * 60 * 1000,            // 15 minutes
  bls: 6 * 60 * 60 * 1000,        // 6 hours
  treasury: 60 * 60 * 1000,       // 1 hour
  fed: 2 * 60 * 60 * 1000,        // 2 hours
};

const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour

const stats = {};

export function getCached(source, key) {
  const fullKey = `${source}:${key}`;
  const entry = cache.get(fullKey);
  if (!entry) return null;
  const ttl = TTL[source] || DEFAULT_TTL;
  if (Date.now() - entry.timestamp > ttl) {
    cache.delete(fullKey);
    return null;
  }
  if (!stats[source]) stats[source] = { hits: 0, misses: 0, lastFetch: null, errors: 0 };
  stats[source].hits++;
  return entry.data;
}

export function setCache(source, key, data) {
  const fullKey = `${source}:${key}`;
  cache.set(fullKey, { data, timestamp: Date.now() });
  if (!stats[source]) stats[source] = { hits: 0, misses: 0, lastFetch: null, errors: 0 };
  stats[source].lastFetch = new Date().toISOString();
  stats[source].misses++;
}

export function recordError(source) {
  if (!stats[source]) stats[source] = { hits: 0, misses: 0, lastFetch: null, errors: 0 };
  stats[source].errors++;
}

export function getStats() {
  const result = {};
  for (const [source, s] of Object.entries(stats)) {
    result[source] = { ...s, ttlMs: TTL[source] || DEFAULT_TTL };
  }
  return result;
}
