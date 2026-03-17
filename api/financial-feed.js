import { fetchAll, fetchBySource } from "./_lib/financial/index.js";

export default async function handler(req, res) {
  try {
    const { source, category, limit: limitParam } = req.query;
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
