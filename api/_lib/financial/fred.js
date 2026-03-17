// FRED (Federal Reserve Economic Data) adapter
// Free API key required: https://fred.stlouisfed.org/docs/api/api_key.html
// Rate limit: 120 req/min

import { getCached, setCache, recordError } from "./cache.js";
import { generateHeadline, generateSummary } from "./headlines.js";
import { computeYoY, computeStreak, computeHistoricalRange, calendarContext } from "./context.js";
import { fetchMarketSnapshot, formatMarketReaction } from "./alpha-vantage.js";

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
  // Pull 24 observations for YoY, streak, and historical range computation
  const url = `${API_BASE}/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=24`;
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
      // Fetch all series + market snapshot in parallel
      const [seriesResults, marketSnapshot] = await Promise.all([
        Promise.allSettled(
          SERIES.map((s) => fetchSeries(s.id, apiKey).then((obs) => ({ series: s, obs })))
        ),
        fetchMarketSnapshot().catch(() => ({})),
      ]);

      // First pass: collect indicator values for cross-referencing
      const indicatorValues = {};
      const items = [];

      for (const result of seriesResults) {
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
          displayActual = priorVal !== 0 ? +((actual - priorVal) / priorVal * 100).toFixed(1) : 0;
          const prevPrior = obs.length > 2 ? parseFloat(obs[2].value) : priorVal;
          displayPrior = prevPrior !== 0 ? +((priorVal - prevPrior) / prevPrior * 100).toFixed(1) : 0;
          displayUnit = "%";
        } else if (series.levelToDelta) {
          displayActual = +(actual - priorVal).toFixed(0);
          const prevPrior = obs.length > 2 ? parseFloat(obs[2].value) : priorVal;
          displayPrior = +(priorVal - prevPrior).toFixed(0);
        }

        // Store for cross-referencing
        if (series.type === "fed_funds") indicatorValues.fed_funds = { value: actual };
        if (series.type === "unemployment") indicatorValues.unemployment = { value: actual };

        // Compute YoY for index-based series (CPI raw index)
        let yoy = null;
        if (series.indexToPercent) {
          yoy = computeYoY(obs, actual);
        } else if (series.type === "unemployment" || series.type === "fed_funds") {
          yoy = computeYoY(obs, actual);
        }

        // Compute streak from display values
        const displayValues = [];
        if (series.indexToPercent) {
          // Compute MoM% for each pair
          for (let i = 0; i < obs.length - 1; i++) {
            const a = parseFloat(obs[i].value);
            const b = parseFloat(obs[i + 1].value);
            if (!isNaN(a) && !isNaN(b) && b !== 0) displayValues.push(+((a - b) / b * 100).toFixed(1));
          }
        } else if (series.levelToDelta) {
          for (let i = 0; i < obs.length - 1; i++) {
            displayValues.push(parseFloat(obs[i].value) - parseFloat(obs[i + 1].value));
          }
        } else {
          for (const o of obs) {
            const v = parseFloat(o.value);
            if (!isNaN(v)) displayValues.push(v);
          }
        }
        const streak = computeStreak(displayValues);

        // Historical range (only for non-index series)
        const rawValues = obs.map((o) => parseFloat(o.value)).filter((v) => !isNaN(v));
        const historicalRange = computeHistoricalRange(obs, actual, series.indexToPercent);

        // Calendar context
        const calendar = calendarContext(latest.date);

        // Market reaction
        const marketReaction = formatMarketReaction(marketSnapshot, latest.date);

        const delta = +(displayActual - displayPrior).toFixed(2);
        const period = formatPeriod(latest.date, series.frequency);

        const data = {
          actual: displayActual,
          prior: displayPrior,
          expected: null,
          delta,
          unit: displayUnit,
          period,
          label: series.label,
          indicator: series.label,
          marketReaction,
        };

        const title = generateHeadline(series.type, data);

        // Build rich summary
        let summary = generateSummary(series.type, data);
        const extraContext = [];
        if (yoy) extraContext.push(`Year-over-year change: ${yoy.pctChange > 0 ? "+" : ""}${yoy.pctChange}% from ${yoy.period}.`);
        if (streak) extraContext.push(streak.description);
        if (historicalRange) extraContext.push(historicalRange.description);
        // Cross-reference fed funds on inflation/labor data
        if ((series.type === "cpi" || series.type === "ppi" || series.type === "unemployment") && indicatorValues.fed_funds) {
          extraContext.push(`Fed funds rate currently at ${indicatorValues.fed_funds.value}%.`);
        }
        if (calendar) extraContext.push(calendar);
        if (extraContext.length > 0) {
          summary = summary + " " + extraContext.join(" ");
        }

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
