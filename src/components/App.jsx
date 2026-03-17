import { useState, useEffect, useRef } from "react";
import { Analytics } from "@vercel/analytics/react";
import { Header } from "./Header";
import { SourceFilter } from "./SourceFilter";
import { CategoryNav } from "./CategoryNav";
import { FeedList } from "./FeedList";
import { About } from "./About";
import { InfoStrip } from "./InfoStrip";
import { DataBars } from "./DataBars";
import { CompactFilters } from "./CompactFilters";
import { useFeed } from "../hooks/useFeed";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { useTheme } from "../hooks/useTheme";

export default function App() {
  const { theme, mode, toggle: toggleTheme } = useTheme();
  const [aboutOpen, setAboutOpen] = useState(false);
  const {
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
    disabledSubSources,
    toggleSubSource,
    mutedKeywords,
    addMutedKeyword,
    removeMutedKeyword,
    clearMutedKeywords,
    selectedState,
    selectState,
    clearState,
    searchQuery,
    setSearchQuery,
    refresh,
  } = useFeed();

  const { pulling, pullDistance, triggered } = usePullToRefresh(refresh);
  const feedRef = useRef(null);

  useEffect(() => {
    if (searchQuery && feedRef.current) {
      feedRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [searchQuery]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.colors.bg,
        color: theme.colors.text,
        fontFamily: theme.fonts.serif,
        position: "relative",
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      {pulling && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            paddingTop: pullDistance - 30,
            zIndex: 100,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: `2px solid ${triggered ? theme.colors.textStrong : theme.colors.textFaint}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              color: triggered ? theme.colors.textStrong : theme.colors.textFaint,
              background: theme.colors.surface,
              transform: `rotate(${pullDistance * 3}deg)`,
            }}
          >
            ↻
          </div>
        </div>
      )}

      <About open={aboutOpen} onClose={() => setAboutOpen(false)} />

      <Header
        lastUpdated={lastUpdated}
        refreshing={refreshing}
        onRefresh={refresh}
        mode={mode}
        onToggleTheme={toggleTheme}
        onAbout={() => setAboutOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Weather line */}
      <InfoStrip />

      {/* Scores + Markets — thin expandable bars */}
      <DataBars />

      {/* Mobile: sources + categories + filters in one block */}
      <div className="category-mobile-bar">
        <SourceFilter
          enabledSources={enabledSources}
          toggleSource={toggleSource}
          enableAllSources={enableAllSources}
          disableAllSources={disableAllSources}
          sourceCounts={sourceCounts}
          selectedState={selectedState}
        />
        <CategoryNav
          enabledCategories={enabledCategories}
          toggleCategory={toggleCategory}
          enableAll={enableAllCats}
          disableAll={disableAllCats}
          categoryCounts={categoryCounts}
          disabledSubSources={disabledSubSources}
          toggleSubSource={toggleSubSource}
          horizontal
        />
        <CompactFilters
          mutedKeywords={mutedKeywords}
          onAddMuted={addMutedKeyword}
          onRemoveMuted={removeMutedKeyword}
          onClearMuted={clearMutedKeywords}
          selectedState={selectedState}
          onSelectState={selectState}
          onClearState={clearState}
        />
      </div>

      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          gap: theme.spacing.lg,
          padding: `0 ${theme.spacing.lg}px`,
        }}
      >
        {/* Sidebar — desktop */}
        <div className="category-sidebar" style={{ width: 180, flexShrink: 0, overflow: "hidden" }}>
          <SourceFilter
            enabledSources={enabledSources}
            toggleSource={toggleSource}
            enableAllSources={enableAllSources}
            disableAllSources={disableAllSources}
            sourceCounts={sourceCounts}
            selectedState={selectedState}
            sidebar
          />
          <CategoryNav
            enabledCategories={enabledCategories}
            toggleCategory={toggleCategory}
            enableAll={enableAllCats}
            disableAll={disableAllCats}
            categoryCounts={categoryCounts}
            disabledSubSources={disabledSubSources}
            toggleSubSource={toggleSubSource}
          />
          <CompactFilters
            mutedKeywords={mutedKeywords}
            onAddMuted={addMutedKeyword}
            onRemoveMuted={removeMutedKeyword}
            onClearMuted={clearMutedKeywords}
            selectedState={selectedState}
            onSelectState={selectState}
            onClearState={clearState}
            sidebar
          />
        </div>

        {/* Main feed */}
        <main style={{ flex: 1, minWidth: 0, paddingBottom: theme.spacing.xxl }}>
          <div
            ref={feedRef}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: `${theme.spacing.sm}px 0 ${theme.spacing.sm}px`,
            }}
          >
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 10,
                color: searchQuery ? theme.colors.textMuted : theme.colors.textFaint,
                letterSpacing: "0.05em",
              }}
            >
              {searchQuery
                ? `${articles.length} results for "${searchQuery}"`
                : `${articles.length} articles`}
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 9,
                  padding: "3px 8px",
                  background: "transparent",
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radii.sm,
                  color: theme.colors.textFaint,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                CLEAR
              </button>
            )}
          </div>

          <FeedList
            articles={articles}
            loading={loading}
            error={error}
            onRetry={refresh}
          />
        </main>
      </div>

      <footer
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: `${theme.spacing.lg}px ${theme.spacing.lg}px ${theme.spacing.xxl}px`,
        }}
      >
        <div
          style={{
            width: 40,
            height: 1,
            background: theme.colors.border,
            marginBottom: 16,
          }}
        />
        <p
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 10,
            color: theme.colors.textFaint,
            letterSpacing: "0.05em",
            marginBottom: 4,
          }}
        >
          Sources: Reuters · AP News · BBC · NPR · Ars Technica · MIT Tech Review · Nature · Phys.org · STAT News · KFF Health · FRED · SEC · BLS · Treasury · Fed{selectedState ? ` · Local ${selectedState}` : ""}
        </p>
        <p
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 10,
            color: theme.colors.textGhost,
            letterSpacing: "0.03em",
            marginBottom: 14,
          }}
        >
          Auto-refreshes every 5 min · Opinion content filtered out
        </p>
        <p
          style={{
            fontFamily: theme.fonts.serif,
            fontSize: 12,
            color: theme.colors.textFaint,
            lineHeight: 1.5,
            marginBottom: 12,
          }}
        >
          Clean Feed believes clarity should be free.{" "}
          <a
            href="https://buymeacoffee.com/lhwebb"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: theme.colors.textMuted,
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            Support our work
          </a>
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => {
              const text = "I switched to Clean Feed — chronological news from Reuters, AP, BBC & NPR. No algorithms, no rage. https://thecleanfeed.app";
              if (navigator.share) {
                navigator.share({ title: "Clean Feed", text, url: "https://thecleanfeed.app" }).catch(() => {});
              } else {
                navigator.clipboard.writeText(text).then(() => {
                  const el = document.getElementById("share-toast");
                  if (el) { el.style.opacity = 1; setTimeout(() => { el.style.opacity = 0; }, 1500); }
                });
              }
            }}
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 9,
              letterSpacing: "0.06em",
              padding: "5px 12px",
              background: "transparent",
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radii.sm,
              color: theme.colors.textMuted,
              cursor: "pointer",
              transition: theme.transitions.fast,
            }}
          >
            SHARE CLEAN FEED
          </button>
          <span
            id="share-toast"
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 9,
              color: theme.colors.textFaint,
              opacity: 0,
              transition: "opacity 0.3s ease",
            }}
          >
            Copied!
          </span>
        </div>
      </footer>

      <style>{`
        @import url('${theme.fontImport}');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: ${theme.colors.bg}; transition: background 0.3s ease; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${theme.colors.textGhost}; border-radius: 2px; }
        a { text-decoration: none; color: inherit; }
        .category-sidebar {
          position: sticky;
          top: 0;
          align-self: flex-start;
          flex-shrink: 0;
        }
        .source-filter-row::-webkit-scrollbar { display: none; }
        .compact-filter-row::-webkit-scrollbar { display: none; }
        .data-bars-row::-webkit-scrollbar { display: none; }
        .category-mobile-bar { display: none; }
        @media (max-width: 700px) {
          .category-sidebar { display: none; }
          .category-mobile-bar { display: block; }
          .data-bars-row { flex-direction: column !important; }
          .data-bars-row > * { border-right: none !important; border-bottom: 1px solid ${theme.colors.border}; }
        }
      `}</style>
      <Analytics />
    </div>
  );
}
