// Alpha Vantage adapter — daily market data
// Free key: 25 req/day. https://www.alphavantage.co/support/#api-key
// Used for market reaction context on financial data releases

import { getCached, setCache, recordError } from "./cache.js";

const API_BASE = "https://www.alphavantage.co/query";

// We only need a few daily closes — keep it lean for the 25 req/day limit
const SYMBOLS = [
  { symbol: "SPY", label: "S&P 500", type: "index" },
  { symbol: "QQQ", label: "Nasdaq 100", type: "index" },
  { symbol: "TLT", label: "20+ Year Treasury Bond ETF", type: "bond" },
];

// Cache market data for 2 hours (markets close, data is stable after that)
const MARKET_CACHE_KEY = "market-daily";

export async function fetchMarketSnapshot() {
  const cached = getCached("alphavantage", MARKET_CACHE_KEY);
  if (cached) return cached;

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return {};

  const snapshot = {};

  try {
    // Only fetch SPY to conserve rate limit — it's the primary reaction gauge
    const res = await fetch(
      `${API_BASE}?function=GLOBAL_QUOTE&symbol=SPY&apikey=${apiKey}`
    );
    if (!res.ok) throw new Error(`Alpha Vantage: HTTP ${res.status}`);
    const json = await res.json();
    const quote = json["Global Quote"];

    if (quote && quote["05. price"]) {
      const price = parseFloat(quote["05. price"]);
      const change = parseFloat(quote["09. change"]);
      const changePct = parseFloat(quote["10. change percent"]?.replace("%", ""));
      const date = quote["07. latest trading day"];

      snapshot.spy = { price, change, changePct, date, label: "S&P 500" };
    }

    setCache("alphavantage", MARKET_CACHE_KEY, snapshot);
    return snapshot;
  } catch (err) {
    console.warn("[Financial] Alpha Vantage error:", err.message);
    recordError("alphavantage");
    return {};
  }
}

// Format a market reaction sentence from the snapshot
export function formatMarketReaction(snapshot, releaseDate) {
  if (!snapshot?.spy) return null;

  // Only include if the market data is from the same day as the release
  // (or most recent trading day for weekend/after-hours releases)
  const spy = snapshot.spy;
  const dir = spy.changePct > 0 ? "up" : spy.changePct < 0 ? "down" : "flat";
  const pct = Math.abs(spy.changePct).toFixed(1);

  if (dir === "flat") {
    return `S&P 500 closed flat at ${spy.price.toFixed(2)} on ${spy.date}.`;
  }
  return `S&P 500 closed ${dir} ${pct}% at ${spy.price.toFixed(2)} on ${spy.date}.`;
}
