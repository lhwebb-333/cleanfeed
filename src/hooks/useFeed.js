import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { CATEGORIES, SOURCES, ALL_SUBSOURCE_NAMES } from "../utils/sources";
import { LOCAL_COLOR } from "../utils/stateSources";

const API_BASE = import.meta.env.VITE_API_URL || "";
const POLL_INTERVAL = 5 * 60 * 1000;

const ALL_CAT_KEYS = CATEGORIES.map((c) => c.key);
const ALL_SRC_KEYS = SOURCES.map((s) => s.name);

function loadSet(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return new Set(JSON.parse(saved));
  } catch {}
  return new Set(fallback);
}

function saveSet(key, set) {
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch {}
}

export function useFeed() {
  const [allArticles, setAllArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Persisted filters
  const [enabledSources, setEnabledSources] = useState(() => loadSet("cleanfeed-sources", ALL_SRC_KEYS));
  const [enabledCategories, setEnabledCategories] = useState(() => loadSet("cleanfeed-categories", ALL_CAT_KEYS));
  // Sub-source toggles (disabled set — empty means all on)
  const [disabledSubSources, setDisabledSubSources] = useState(() => loadSet("cleanfeed-disabled-subsources", []));

  const toggleSubSource = useCallback((name) => {
    setDisabledSubSources((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      saveSet("cleanfeed-disabled-subsources", next);
      return next;
    });
  }, []);

  const [mutedKeywords, setMutedKeywords] = useState(() => {
    try {
      const saved = localStorage.getItem("cleanfeed-muted");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // State-level local news
  const [selectedState, setSelectedState] = useState(() => {
    try { return localStorage.getItem("cleanfeed-state") || null; } catch { return null; }
  });
  const [localArticles, setLocalArticles] = useState([]);
  const localFetchRef = useRef(null);

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
      saveSet("cleanfeed-sources", next);
      return next;
    });
  }, []);

  const enableAllSources = useCallback(() => {
    const all = new Set(ALL_SRC_KEYS);
    if (selectedState) all.add(`Local ${selectedState}`);
    setEnabledSources(all);
    saveSet("cleanfeed-sources", all);
  }, [selectedState]);

  const disableAllSources = useCallback(() => {
    setEnabledSources(new Set());
    saveSet("cleanfeed-sources", new Set());
  }, []);

  const toggleCategory = useCallback((key) => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveSet("cleanfeed-categories", next);
      return next;
    });
  }, []);

  const enableAllCats = useCallback(() => {
    const all = new Set(ALL_CAT_KEYS);
    setEnabledCategories(all);
    saveSet("cleanfeed-categories", all);
  }, []);

  const disableAllCats = useCallback(() => {
    setEnabledCategories(new Set());
    saveSet("cleanfeed-categories", new Set());
  }, []);

  const selectState = useCallback((code) => {
    setSelectedState(code);
    try { localStorage.setItem("cleanfeed-state", code); } catch {}
    // Auto-enable the local source
    setEnabledSources((prev) => {
      const next = new Set(prev);
      const localName = `Local ${code}`;
      next.add(localName);
      saveSet("cleanfeed-sources", next);
      return next;
    });
  }, []);

  const clearState = useCallback(() => {
    const prevState = selectedState;
    setSelectedState(null);
    setLocalArticles([]);
    try { localStorage.removeItem("cleanfeed-state"); } catch {}
    // Remove local source from enabled
    if (prevState) {
      setEnabledSources((prev) => {
        const next = new Set(prev);
        next.delete(`Local ${prevState}`);
        saveSet("cleanfeed-sources", next);
        return next;
      });
    }
  }, [selectedState]);

  const fetchLocalFeed = useCallback(async (stateCode) => {
    if (!stateCode) return;
    try {
      const url = `${API_BASE}/api/local-feed?state=${stateCode}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.ok) {
        setLocalArticles(data.articles);
      }
    } catch (err) {
      console.warn("[CleanFeed] Local feed error:", err);
    }
  }, []);

  // Fetch local feed when state changes or on refresh
  useEffect(() => {
    if (selectedState) {
      fetchLocalFeed(selectedState);
      localFetchRef.current = selectedState;
    } else {
      setLocalArticles([]);
      localFetchRef.current = null;
    }
  }, [selectedState, fetchLocalFeed]);

  const fetchFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const url = `${API_BASE}/api/feed?limit=1000`;
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
    // Also refresh local feed if a state is selected
    if (localFetchRef.current) {
      fetchLocalFeed(localFetchRef.current);
    }
  }, [fetchLocalFeed]);

  useEffect(() => {
    setLoading(true);
    fetchFeed();
    const interval = setInterval(() => fetchFeed(), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  // Merge national + local articles
  const combinedArticles = useMemo(() => {
    if (localArticles.length === 0) return allArticles;
    const merged = [...allArticles, ...localArticles];
    // Sort by date, newest first
    merged.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    return merged;
  }, [allArticles, localArticles]);

  // Client-side filtering: sources + categories + muted keywords + search
  const articles = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const subSourceSet = new Set(ALL_SUBSOURCE_NAMES);
    return combinedArticles.filter((a) => {
      if (subSourceSet.has(a.source)) {
        if (disabledSubSources.has(a.source)) return false;
      } else {
        if (!enabledSources.has(a.source)) return false;
      }
      if (!enabledCategories.has(a.category)) return false;
      if (mutedKeywords.length > 0) {
        const text = `${a.title} ${a.description}`.toLowerCase();
        if (mutedKeywords.some((kw) => text.includes(kw))) return false;
      }
      if (query) {
        const text = `${a.title} ${a.description}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [combinedArticles, enabledSources, enabledCategories, disabledSubSources, mutedKeywords, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const a of combinedArticles) {
      if (enabledSources.has(a.source)) {
        counts[a.category] = (counts[a.category] || 0) + 1;
      }
    }
    return counts;
  }, [combinedArticles, enabledSources]);

  const sourceCounts = useMemo(() => {
    const counts = {};
    for (const a of combinedArticles) {
      counts[a.source] = (counts[a.source] || 0) + 1;
    }
    return counts;
  }, [combinedArticles]);

  return {
    articles,
    loading,
    refreshing,
    error,
    lastUpdated,
    searchQuery,
    setSearchQuery,
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
    disabledSubSources,
    toggleSubSource,
    mutedKeywords,
    addMutedKeyword,
    removeMutedKeyword,
    clearMutedKeywords,
    selectedState,
    selectState,
    clearState,
    refresh: () => fetchFeed(true),
  };
}
