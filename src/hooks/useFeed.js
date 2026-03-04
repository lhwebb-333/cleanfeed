import { useState, useEffect, useCallback, useMemo } from "react";
import { CATEGORIES, SOURCES } from "../utils/sources";

const API_BASE = import.meta.env.VITE_API_URL || "";
const POLL_INTERVAL = 5 * 60 * 1000;

const ALL_CAT_KEYS = CATEGORIES.map((c) => c.key);
const ALL_SRC_KEYS = SOURCES.map((s) => s.name);

export function useFeed() {
  const [allArticles, setAllArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [enabledSources, setEnabledSources] = useState(new Set(ALL_SRC_KEYS));
  const [enabledCategories, setEnabledCategories] = useState(new Set(ALL_CAT_KEYS));
  const [mutedKeywords, setMutedKeywords] = useState(() => {
    try {
      const saved = localStorage.getItem("cleanfeed-muted");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const addMutedKeyword = useCallback((word) => {
    const trimmed = word.trim().toLowerCase();
    if (!trimmed) return;
    setMutedKeywords((prev) => {
      if (prev.includes(trimmed)) return prev;
      const next = [...prev, trimmed];
      try { localStorage.setItem("cleanfeed-muted", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeMutedKeyword = useCallback((word) => {
    setMutedKeywords((prev) => {
      const next = prev.filter((w) => w !== word);
      try { localStorage.setItem("cleanfeed-muted", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clearMutedKeywords = useCallback(() => {
    setMutedKeywords([]);
    try { localStorage.removeItem("cleanfeed-muted"); } catch {}
  }, []);

  const toggleSource = useCallback((name) => {
    setEnabledSources((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const enableAllSources = useCallback(() => setEnabledSources(new Set(ALL_SRC_KEYS)), []);
  const disableAllSources = useCallback(() => setEnabledSources(new Set()), []);

  const toggleCategory = useCallback((key) => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const enableAllCats = useCallback(() => setEnabledCategories(new Set(ALL_CAT_KEYS)), []);
  const disableAllCats = useCallback(() => setEnabledCategories(new Set()), []);

  const fetchFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const url = `${API_BASE}/api/feed?limit=200`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.ok) {
        setAllArticles(data.articles);
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err) {
      console.error("[CleanFeed] Fetch error:", err);
      setError("Failed to load feed. Pull to refresh or try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchFeed();
    const interval = setInterval(() => fetchFeed(), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  // Client-side filtering: sources + categories + muted keywords
  const articles = useMemo(() => {
    return allArticles.filter((a) => {
      if (!enabledSources.has(a.source)) return false;
      if (!enabledCategories.has(a.category)) return false;
      if (mutedKeywords.length > 0) {
        const text = `${a.title} ${a.description}`.toLowerCase();
        if (mutedKeywords.some((kw) => text.includes(kw))) return false;
      }
      return true;
    });
  }, [allArticles, enabledSources, enabledCategories, mutedKeywords]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const a of allArticles) {
      if (enabledSources.has(a.source)) {
        counts[a.category] = (counts[a.category] || 0) + 1;
      }
    }
    return counts;
  }, [allArticles, enabledSources]);

  const sourceCounts = useMemo(() => {
    const counts = {};
    for (const a of allArticles) {
      counts[a.source] = (counts[a.source] || 0) + 1;
    }
    return counts;
  }, [allArticles]);

  return {
    articles,
    loading,
    refreshing,
    error,
    lastUpdated,
    enabledSources,
    toggleSource,
    enableAllSources,
    disableAllSources,
    sourceCounts,
    enabledCategories,
    toggleCategory,
    enableAllCats,
    disableAllCats,
    categoryCounts,
    mutedKeywords,
    addMutedKeyword,
    removeMutedKeyword,
    clearMutedKeywords,
    refresh: () => fetchFeed(true),
  };
}
