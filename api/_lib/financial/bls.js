// Bureau of Labor Statistics adapter
// Optional API key (higher rate limits): https://www.bls.gov/developers/
// Without key: 25 req/day. With key: 500 req/day.

import { getCached, setCache, recordError } from "./cache.js";
import { generateHeadline } from "./headlines.js";

const API_BASE = "https://api.bls.gov/publicAPI/v2/timeseries/data/";

const SERIES = [
  { id: "LNS14000000", label: "Unemployment Rate", type: "unemployment", unit: "%", category: "labor" },
  { id: "CUUR0000SA0", label: "CPI-U (All Items)", type: "cpi", unit: "%", category: "economic" },
  { id: "WPUFD49104", label: "PPI (Final Demand)", type: "ppi", unit: "%", category: "economic" },
  { id: "CES0000000001", label: "Nonfarm Payrolls", type: "payroll", unit: "K", category: "labor" },
];

const MONTHS = {
  M01: "January", M02: "February", M03: "March", M04: "April",
  M05: "May", M06: "June", M07: "July", M08: "August",
  M09: "September", M10: "October", M11: "November", M12: "December",
  M13: "Annual",
};

function parsePeriod(year, period) {
  const monthName = MONTHS[period];
  if (!monthName || monthName === "Annual") return `${year}`;
  return `${monthName} ${year}`;
}

function periodToDate(year, period) {
  const monthNum = parseInt(period.replace("M", ""), 10);
  if (isNaN(monthNum) || monthNum > 12) return new Date(`${year}-01-01`);
  return new Date(`${year}-${String(monthNum).padStart(2, "0")}-15`);
}

export const blsAdapter = {
  name: "BLS",
  key: "bls",
  color: "#228B22",

  async fetch() {
    const cached = getCached("bls", "all");
    if (cached) return cached;

    try {
      const currentYear = new Date().getFullYear();
      const body = {
        seriesid: SERIES.map((s) => s.id),
        startyear: String(currentYear - 1),
        endyear: String(currentYear),
      };

      const apiKey = process.env.BLS_API_KEY;
      if (apiKey) body.registrationkey = apiKey;

      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`BLS: HTTP ${res.status}`);
      const json = await res.json();

      if (json.status !== "REQUEST_SUCCEEDED") {
        throw new Error(`BLS: ${json.message?.[0] || "Request failed"}`);
      }

      const items = [];
      const seriesResults = json.Results?.series || [];

      for (let i = 0; i < seriesResults.length; i++) {
        const seriesData = seriesResults[i];
        const seriesConfig = SERIES.find((s) => s.id === seriesData.seriesID) || SERIES[i];
        if (!seriesConfig) continue;

        const dataPoints = (seriesData.data || [])
          .filter((d) => d.period !== "M13") // Exclude annual averages
          .sort((a, b) => {
            const dateA = periodToDate(a.year, a.period);
            const dateB = periodToDate(b.year, b.period);
            return dateB - dateA;
          });

        if (dataPoints.length < 2) continue;

        const latest = dataPoints[0];
        const prior = dataPoints[1];
        const actual = parseFloat(latest.value);
        const priorVal = parseFloat(prior.value);

        if (isNaN(actual) || isNaN(priorVal)) continue;

        // For payrolls, compute month-over-month change
        let displayActual = actual;
        let displayPrior = priorVal;
        if (seriesConfig.type === "payroll") {
          displayActual = actual - priorVal;
          displayPrior = dataPoints.length > 2 ? priorVal - parseFloat(dataPoints[2].value) : 0;
        }

        const delta = displayActual - displayPrior;
        const period = parsePeriod(latest.year, latest.period);
        const pubDate = periodToDate(latest.year, latest.period);

        const data = {
          actual: displayActual,
          prior: displayPrior,
          expected: null,
          delta,
          unit: seriesConfig.unit,
          period,
          label: seriesConfig.label,
          indicator: seriesConfig.label,
        };

        const title = generateHeadline(seriesConfig.type, data);

        items.push({
          id: `bls-${seriesConfig.id.toLowerCase()}-${latest.year}-${latest.period}`,
          title,
          description: `Bureau of Labor Statistics, ${seriesConfig.label}`,
          link: `https://data.bls.gov/timeseries/${seriesConfig.id}`,
          pubDate: pubDate.toISOString(),
          source: "BLS",
          color: "#228B22",
          category: "financial",
          type: "financial-data",
          dataSource: "bls",
          data: {
            actual: displayActual,
            expected: null,
            prior: displayPrior,
            delta,
            unit: seriesConfig.unit,
          },
          indicator: seriesConfig.label,
          tags: [seriesConfig.category, seriesConfig.id.toLowerCase()],
          context: `${seriesConfig.label}, ${period}`,
        });
      }

      setCache("bls", "all", items);
      return items;
    } catch (err) {
      console.error("[Financial] BLS adapter error:", err.message);
      recordError("bls");
      return [];
    }
  },
};
