import { fetchAll, fetchBySource } from "./_lib/financial/index.js";

// Key indicators for the market strip
const KEY_INDICATORS = [
  { match: "Federal Funds Rate", short: "Fed Rate" },
  { match: "10-Year Treasury Yield", short: "10Y Yield" },
  { match: "Unemployment Rate", short: "Unemployment" },
  { match: "CPI", short: "CPI" },
  { match: "GDP", short: "GDP" },
];

export default async function handler(req, res) {
  try {
    const { source, category, limit: limitParam, indicators } = req.query;

    // Indicators mode — returns key economic indicators for the market strip
    if (indicators === "true") {
      const items = await fetchAll();
      const result = [];
      for (const ki of KEY_INDICATORS) {
        const item = items.find((i) => i.indicator && i.indicator.includes(ki.match));
        if (!item || !item.data) continue;
        const { actual, prior, delta, unit } = item.data;
        let direction = "flat";
        if (actual != null && prior != null) {
          if (actual > prior) direction = "up";
          else if (actual < prior) direction = "down";
        }
        result.push({
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
      return res.json({ ok: true, indicators: result });
    }

    // Feed mode — returns financial data articles
    const limit = Math.min(parseInt(limitParam) || 100, 500);

    let items;
    if (source) {
      items = await fetchBySource(source);
    } else {
      items = await fetchAll();
    }

    if (category) {
      items = items.filter((item) => item.tags?.includes(category));
    }

    const total = items.length;
    items = items.slice(0, limit);

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
    res.json({ ok: true, count: items.length, total, items });
  } catch (err) {
    console.error("[Financial] Feed error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch financial data" });
  }
}
