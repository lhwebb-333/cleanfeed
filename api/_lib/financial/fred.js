// FRED (Federal Reserve Economic Data) adapter
// Free API key required: https://fred.stlouisfed.org/docs/api/api_key.html
// Rate limit: 120 req/min

import { getCached, setCache, recordError } from "./cache.js";
import { generateHeadline, generateSummary } from "./headlines.js";

const API_BASE = "https://api.stlouisfed.org/fred";

// rawUnit: what the API returns. displayUnit: what we show.
// indexToPercent: true means compute MoM % change from index levels.
// levelToDelta: true means compute period-over-period change from absolute levels.
const SERIES = [
  { id: "GDP", label: "GDP", type: "gdp", unit: "B", displayUnit: "$B", category: "economic", context: "Quarterly, seasonally adjusted annual rate, billions of dollars", frequency: "quarterly", levelToDelta: false },
  { id: "A191RL1Q225SBEA", label: "Real GDP Growth", type: "gdp", unit: "%", displayUnit: "%", category: "economic", context: "Quarterly, percent change from preceding period, annualized", frequency: "quarterly" },
  { id: "CPIAUCSL", label: "CPI", type: "cpi", unit: "%", displayUnit: "%", category: "economic", context: "Monthly, all urban consumers, percent change", frequency: "monthly", indexToPercent: true },
  { id: "UNRATE", label: "Unemployment Rate", type: "unemployment", unit: "%", displayUnit: "%", category: "labor", context: "Monthly, seasonally adjusted", frequency: "monthly" },
  { id: "FEDFUNDS", label: "Federal Funds Rate", type: "fed_funds", unit: "%", displayUnit: "%", category: "rates", context: "Monthly average, effective rate", frequency: "monthly" },
  { id: "DGS10", label: "10-Year Treasury Yield", type: "yield", unit: "%", displayUnit: "%", category: "rates", context: "Daily, constant maturity", frequency: "daily" },
  { id: "DGS2", label: "2-Year Treasury Yield", type: "yield", unit: "%", displayUnit: "%", category: "rates", context: "Daily, constant maturity", frequency: "daily" },
  { id: "PAYEMS", label: "Nonfarm Payrolls", type: "payroll", unit: "K", displayUnit: "K", category: "labor", context: "Monthly, thousands of persons, seasonally adjusted", frequency: "monthly", levelToDelta: true },
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

        let displayActual = actual;
        let displayPrior = priorVal;
        let displayUnit = series.displayUnit || series.unit;

        if (series.indexToPercent) {
          // Convert index levels to month-over-month percent change
          // e.g., CPI 326.785 → 325.252 = +0.47%
          displayActual = priorVal !== 0 ? +((actual - priorVal) / priorVal * 100).toFixed(1) : 0;
          const prevPrior = obs.length > 2 ? parseFloat(obs[2].value) : priorVal;
          displayPrior = prevPrior !== 0 ? +((priorVal - prevPrior) / prevPrior * 100).toFixed(1) : 0;
          displayUnit = "%";
        } else if (series.levelToDelta) {
          // Convert absolute levels to period-over-period change
          // e.g., Payrolls 157,000K → 157,092K = +92K
          displayActual = +(actual - priorVal).toFixed(0);
          const prevPrior = obs.length > 2 ? parseFloat(obs[2].value) : priorVal;
          displayPrior = +(priorVal - prevPrior).toFixed(0);
        }

        const delta = +(displayActual - displayPrior).toFixed(2);
        const period = formatPeriod(latest.date, series.frequency);

        const data = {
          actual: displayActual,
          prior: displayPrior,
          expected: null, // FRED doesn't provide consensus
          delta,
          unit: displayUnit,
          period,
          label: series.label,
          indicator: series.label,
        };

        const title = generateHeadline(series.type, data);
        const summary = generateSummary(series.type, data);

        items.push({
          id: `fred-${series.id.toLowerCase()}-${latest.date}`,
          title,
          description: summary || series.context,
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
            unit: displayUnit,
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
