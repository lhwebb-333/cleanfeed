// Markets endpoint — major index quotes
// Uses Yahoo Finance v8 chart API (more reliable than v7 quote)

const SYMBOLS = [
  { symbol: "%5EGSPC", raw: "^GSPC", label: "S&P 500", short: "S&P" },
  { symbol: "%5EDJI", raw: "^DJI", label: "Dow Jones", short: "Dow" },
  { symbol: "%5EIXIC", raw: "^IXIC", label: "Nasdaq", short: "Nasdaq" },
  { symbol: "%5EVIX", raw: "^VIX", label: "VIX", short: "VIX" },
  { symbol: "GC%3DF", raw: "GC=F", label: "Gold", short: "Gold" },
  { symbol: "CL%3DF", raw: "CL=F", label: "Crude Oil", short: "Oil" },
  { symbol: "%5ETNX", raw: "^TNX", label: "10Y Yield", short: "10Y" },
];

const cache = new Map();
const CACHE_TTL = 2 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

async function fetchQuote(sym) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym.symbol}?range=1d&interval=1d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status} for ${sym.raw}`);
  const data = await res.json();
  const result = data.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta || {};
  const price = meta.regularMarketPrice;
  const prevClose = meta.chartPreviousClose || meta.previousClose;

  if (price == null || prevClose == null) return null;

  const change = price - prevClose;
  const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;

  return {
    symbol: sym.raw,
    label: sym.label,
    short: sym.short,
    price: +price.toFixed(2),
    change: +change.toFixed(2),
    changePct: +changePct.toFixed(2),
    prevClose: +prevClose.toFixed(2),
    direction: change > 0.001 ? "up" : change < -0.001 ? "down" : "flat",
    marketState: meta.marketState || "CLOSED",
  };
}

export default async function handler(req, res) {
  try {
    const cached = getCached("markets");
    if (cached) {
      res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
      return res.json(cached);
    }

    const results = await Promise.allSettled(SYMBOLS.map(fetchQuote));
    const indices = [];
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) indices.push(r.value);
    }

    const result = {
      ok: true,
      indices,
      marketState: indices[0]?.marketState || "CLOSED",
    };

    setCache("markets", result);
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.json(result);
  } catch (err) {
    console.error("[Markets] Error:", err.message);
    res.status(500).json({ ok: false, error: "Failed to fetch market data" });
  }
}
