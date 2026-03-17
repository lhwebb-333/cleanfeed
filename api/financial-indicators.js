import { fetchAll } from "./_lib/financial/index.js";

// Key indicators to surface in the IndicatorStrip
const KEY_INDICATORS = [
  { match: "Federal Funds Rate", short: "Fed Rate" },
  { match: "10-Year Treasury Yield", short: "10Y Yield" },
  { match: "Unemployment Rate", short: "Unemployment" },
  { match: "CPI", short: "CPI" },
  { match: "GDP", short: "GDP" },
];

export default async function handler(req, res) {
  try {
    const items = await fetchAll();

    const indicators = [];
    for (const ki of KEY_INDICATORS) {
      const item = items.find((i) => i.indicator && i.indicator.includes(ki.match));
      if (!item || !item.data) continue;

      const { actual, prior, delta, unit } = item.data;
      let direction = "flat";
      if (actual != null && prior != null) {
        if (actual > prior) direction = "up";
        else if (actual < prior) direction = "down";
      }

      indicators.push({
        key: ki.short.toLowerCase().replace(/\s+/g, "_"),
        label: ki.short,
        value: actual,
        unit: unit || "",
        delta: delta || 0,
        direction,
        updatedAt: item.pubDate,
      });
    }

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.json({ ok: true, indicators });
  } catch (err) {
    console.error("[Financial] Indicators error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch indicators" });
  }
}
