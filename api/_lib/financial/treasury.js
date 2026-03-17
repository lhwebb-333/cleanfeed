// Treasury.gov adapter
// Yield curve data from Treasury Fiscal Data API
// No API key needed, no strict rate limits

import { getCached, setCache, recordError } from "./cache.js";
import { generateHeadline } from "./headlines.js";

const YIELD_API = "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates";
const TREASURY_RATES = "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/all";

// Use the Treasury XML feed for daily rates — more reliable
const TREASURY_XML_URL = "https://home.treasury.gov/sites/default/files/interest-rates/yield.xml";

// Maturity labels
const MATURITIES = ["1 Mo", "2 Mo", "3 Mo", "4 Mo", "6 Mo", "1 Yr", "2 Yr", "3 Yr", "5 Yr", "7 Yr", "10 Yr", "20 Yr", "30 Yr"];

export const treasuryAdapter = {
  name: "Treasury",
  key: "treasury",
  color: "#4169E1",

  async fetch() {
    const cached = getCached("treasury", "yields");
    if (cached) return cached;

    try {
      // Fetch recent yield data from Fiscal Data API
      const today = new Date();
      const daysBack = new Date(today);
      daysBack.setDate(daysBack.getDate() - 7);

      const url = `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?sort=-record_date&page[size]=20`;
      const res = await fetch(url);

      if (!res.ok) throw new Error(`Treasury: HTTP ${res.status}`);
      const json = await res.json();
      const records = json.data || [];

      if (records.length === 0) {
        // Fallback: try alternative Treasury rates endpoint
        return await fetchTreasuryRatesFallback();
      }

      // Group by record_date to find latest and prior
      const byDate = {};
      for (const r of records) {
        const date = r.record_date;
        if (!byDate[date]) byDate[date] = [];
        byDate[date].push(r);
      }

      const dates = Object.keys(byDate).sort().reverse();
      if (dates.length < 1) return [];

      const items = [];
      const latestDate = dates[0];
      const latestRecords = byDate[latestDate];

      // Create a summary item for key rates
      const keyRates = latestRecords
        .filter((r) => r.security_desc && r.avg_interest_rate_amt)
        .slice(0, 10);

      if (keyRates.length > 0) {
        const ratesSummary = keyRates
          .map((r) => `${r.security_desc}: ${parseFloat(r.avg_interest_rate_amt).toFixed(2)}%`)
          .join(", ");

        items.push({
          id: `treasury-rates-${latestDate}`,
          title: `Treasury Average Interest Rates as of ${latestDate}`,
          description: ratesSummary,
          link: "https://fiscaldata.treasury.gov/datasets/average-interest-rates-treasury-securities/average-interest-rates-on-u-s-treasury-securities",
          pubDate: new Date(latestDate).toISOString(),
          source: "Treasury",
          color: "#4169E1",
          category: "financial",
          type: "financial-data",
          dataSource: "treasury",
          data: {
            rates: keyRates.map((r) => ({
              security: r.security_desc,
              rate: parseFloat(r.avg_interest_rate_amt),
            })),
            unit: "%",
          },
          indicator: "Treasury Rates",
          tags: ["rates", "treasury", "yield"],
          context: `Average interest rates on U.S. Treasury securities, ${latestDate}`,
        });
      }

      setCache("treasury", "yields", items);
      return items;
    } catch (err) {
      console.error("[Financial] Treasury adapter error:", err.message);
      recordError("treasury");
      return [];
    }
  },
};

async function fetchTreasuryRatesFallback() {
  // If the fiscal data API fails, return empty — don't break the feed
  console.warn("[Financial] Treasury fiscal data API failed, returning empty");
  return [];
}
