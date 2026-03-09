import { fetchSource, fetchTopicFeeds, SOURCES } from "./_lib/shared.js";

export default async function handler(req, res) {
  try {
    const { source: sourceFilter, category: categoryFilter } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 100, 200);

    const sourceKeys = sourceFilter ? [sourceFilter] : Object.keys(SOURCES);

    const [sourceResults, topicArticles] = await Promise.all([
      Promise.allSettled(sourceKeys.map((key) => fetchSource(key))),
      sourceFilter ? Promise.resolve([]) : fetchTopicFeeds(),
    ]);

    let articles = [
      ...sourceResults.filter((r) => r.status === "fulfilled").flatMap((r) => r.value),
      ...topicArticles,
    ];

    if (categoryFilter && categoryFilter !== "all") {
      articles = articles.filter((a) => a.category === categoryFilter);
    }

    articles = articles
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, limit);

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
    res.json({ ok: true, count: articles.length, articles });
  } catch (err) {
    console.error("[CleanFeed] Feed error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch feeds" });
  }
}
