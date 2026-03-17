// FRED (Federal Reserve Economic Data) adapter
// Free API key required: https://fred.stlouisfed.org/docs/api/api_key.html
// Rate limit: 120 req/min

import { getCached, setCache, recordError } from "./cache.js";
import { generateHeadline } from "./headlines.js";

const API_BASE = "https://api.stlouisfed.org/fred";

const SERIES = [
  { id: "GDP", label: "GDP", type: "gdp", unit: "%", category: "economic", context: "Quarterly, seasonally adjusted annual rate", frequency: "quarterly" },
  { id: "CPIAUCSL", label: "CPI", type: "cpi", unit: "%", category: "economic", context: "Monthly, all urban consumers", frequency: "monthly" },
  { id: "UNRATE", label: "Unemployment Rate", type: "unemployment", unit: "%", category: "labor", context: "Monthly, seasonally adjusted", frequency: "monthly" },
  { id: "FEDFUNDS", label: "Federal Funds Rate", type: "fed_funds", unit: "%", category: "rates", context: "Monthly average, effective rate", frequency: "monthly" },
  { id: "DGS10", label: "10-Year Treasury Yield", type: "yield", unit: "%", category: "rates", context: "Daily, constant maturity", frequency: "daily" },
  { id: "DGS2", label: "2-Year Treasury Yield", type: "yield", unit: "%", category: "rates", context: "Daily, constant maturity", frequency: "daily" },
  { id: "PAYEMS", label: "Nonfarm Payrolls", type: "payroll", unit: "K", category: "labor", context: "Monthly, thousands of persons, seasonally adjusted", frequency: "monthly" },
];

function formatPeriod(date, frequency) {
  const d = new Date(date);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  if (frequency === "quarterly") {
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return `Q${q} ${d.getFullYear()}`;
  }
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

async function fetchSeries(seriesId, apiKey) {
  const url = `${API_BASE}/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${seriesId}: HTTP ${res.status}`);
  const json = await res.json();
  return (json.observations || []).filter((o) => o.value !== ".");
}

async function fetchSeriesInfo(seriesId, apiKey) {
  const url = `${API_BASE}/series?series_id=${seriesId}&api_key=${apiKey}&file_type=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  return json.seriess?.[0] || null;
}

export const fredAdapter = {
  name: "FRED",
  key: "fred",
  color: "#2E86AB",

  async fetch() {
    const cached = getCached("fred", "all");
    if (cached) return cached;

    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey) {
      console.warn("[Financial] FRED_API_KEY not set, skipping FRED adapter");
      return [];
    }

    try {
      const results = await Promise.allSettled(
        SERIES.map((s) => fetchSeries(s.id, apiKey).then((obs) => ({ series: s, obs })))
      );

      const items = [];
      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        const { series, obs } = result.value;
        if (obs.length < 2) continue;

        const latest = obs[0];
        const prior = obs[1];
        const actual = parseFloat(latest.value);
        const priorVal = parseFloat(prior.value);

        if (isNaN(actual) || isNaN(priorVal)) continue;

        // For payrolls, the value is level — compute change
        let displayActual = actual;
        let displayPrior = priorVal;
        if (series.type === "payroll") {
          displayActual = actual - priorVal;
          displayPrior = priorVal - (obs.length > 2 ? parseFloat(obs[2].value) : priorVal);
        }

        const delta = displayActual - displayPrior;
        const period = formatPeriod(latest.date, series.frequency);

        const data = {
          actual: displayActual,
          prior: displayPrior,
          expected: null, // FRED doesn't provide consensus
          delta,
          unit: series.unit,
          period,
          label: series.label,
          indicator: series.label,
        };

        const title = generateHeadline(series.type, data);

        items.push({
          id: `fred-${series.id.toLowerCase()}-${latest.date}`,
          title,
          description: series.context,
          link: `https://fred.stlouisfed.org/series/${series.id}`,
          pubDate: new Date(latest.date).toISOString(),
          source: "FRED",
          color: "#2E86AB",
          category: "financial",
          type: "financial-data",
          dataSource: "fred",
          data: {
            actual: displayActual,
            expected: null,
            prior: displayPrior,
            delta,
            unit: series.unit,
          },
          indicator: series.label,
          tags: [series.category, series.id.toLowerCase()],
          context: series.context,
        });
      }

      setCache("fred", "all", items);
      return items;
    } catch (err) {
      console.error("[Financial] FRED adapter error:", err.message);
      recordError("fred");
      return [];
    }
  },
};
