import { fetchLocalFeed } from "./_lib/shared.js";

export default async function handler(req, res) {
  try {
    const { state } = req.query;
    if (!state || state.length < 2) {
      return res.status(400).json({ ok: false, error: "Missing state parameter (e.g. ?state=OH)" });
    }

    const stateCode = state.toUpperCase().slice(0, 2);
    const articles = await fetchLocalFeed(stateCode);

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
    res.json({ ok: true, count: articles.length, state: stateCode, articles });
  } catch (err) {
    console.error("[CleanFeed] Local feed error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch local feeds" });
  }
}
