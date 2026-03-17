// Financial adapter registry
// Each adapter exports: { name, key, color, fetch(), healthCheck() }

import { fredAdapter } from "./fred.js";
import { secAdapter } from "./sec.js";
import { blsAdapter } from "./bls.js";
import { treasuryAdapter } from "./treasury.js";
import { fedAdapter } from "./fed.js";
import { getStats } from "./cache.js";

const adapters = [fredAdapter, secAdapter, blsAdapter, treasuryAdapter, fedAdapter];

const adapterMap = {};
for (const a of adapters) {
  adapterMap[a.key] = a;
}

// Fetch from all adapters in parallel
export async function fetchAll() {
  const results = await Promise.allSettled(adapters.map((a) => a.fetch()));
  const items = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
    }
  }
  // Sort by timestamp descending
  items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  return items;
}

// Fetch from a single adapter
export async function fetchBySource(sourceKey) {
  const adapter = adapterMap[sourceKey];
  if (!adapter) return [];
  return adapter.fetch();
}

// Get status for all adapters
export function getAdapterStatus() {
  const cacheStats = getStats();
  const status = {};
  for (const a of adapters) {
    status[a.key] = {
      name: a.name,
      color: a.color,
      ...(cacheStats[a.key] || { hits: 0, misses: 0, lastFetch: null, errors: 0 }),
    };
  }
  return status;
}

// Get list of adapter metadata (for frontend source registry)
export function getAdapterList() {
  return adapters.map((a) => ({ key: a.key, name: a.name, color: a.color }));
}
