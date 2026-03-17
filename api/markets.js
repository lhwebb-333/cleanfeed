// Markets endpoint — major index quotes
// Uses Yahoo Finance unofficial API (free, no key)

const SYMBOLS = [
  { symbol: "^GSPC", label: "S&P 500", short: "S&P" },
  { symbol: "^DJI", label: "Dow Jones", short: "Dow" },
  { symbol: "^IXIC", label: "Nasdaq", short: "Nasdaq" },
  { symbol: "^VIX", label: "VIX", short: "VIX" },
  { symbol: "GC=F", label: "Gold", short: "Gold" },
  { symbol: "CL=F", label: "Crude Oil", short: "Oil" },
  { symbol: "^TNX", label: "10Y Yield", short: "10Y" },
];

const cache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 min

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

export default async function handler(req, res) {
  try {
    const cached = getCached("markets");
    if (cached) {
      res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
      return res.json(cached);
    }

    const symbolList = SYMBOLS.map((s) => s.symbol).join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolList)}`;

    const yRes = await fetch(url, {
      headers: {
        "User-Agent": "CleanFeed/1.0",
      },
    });

    if (!yRes.ok) throw new Error(`Yahoo Finance ${yRes.status}`);
    const data = await yRes.json();
    const quotes = data.quoteResponse?.result || [];

    const indices = [];
    for (const sym of SYMBOLS) {
      const q = quotes.find((r) => r.symbol === sym.symbol);
      if (!q) continue;

      const price = q.regularMarketPrice;
      const change = q.regularMarketChange;
      const changePct = q.regularMarketChangePercent;
      const prevClose = q.regularMarketPreviousClose;

      indices.push({
        symbol: sym.symbol,
        label: sym.label,
        short: sym.short,
        price: price != null ? +price.toFixed(2) : null,
        change: change != null ? +change.toFixed(2) : null,
        changePct: changePct != null ? +changePct.toFixed(2) : null,
        prevClose: prevClose != null ? +prevClose.toFixed(2) : null,
        direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
        marketState: q.marketState || "CLOSED",
      });
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
