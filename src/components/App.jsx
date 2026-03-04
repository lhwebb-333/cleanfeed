import { useState } from "react";
import { Header } from "./Header";
import { SourceFilter } from "./SourceFilter";
import { CategoryNav } from "./CategoryNav";
import { FeedList } from "./FeedList";
import { About } from "./About";
import { MuteFilter } from "./MuteFilter";
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
    mutedKeywords,
    addMutedKeyword,
    removeMutedKeyword,
    clearMutedKeywords,
    searchQuery,
    setSearchQuery,
    refresh,
  } = useFeed();

  const { pulling, pullDistance, triggered } = usePullToRefresh(refresh);

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

      <SourceFilter
        enabledSources={enabledSources}
        toggleSource={toggleSource}
        enableAllSources={enableAllSources}
        disableAllSources={disableAllSources}
        sourceCounts={sourceCounts}
      />

      {/* Mobile category filter — horizontal scroll */}
      <div className="category-mobile-bar">
        <CategoryNav
          enabledCategories={enabledCategories}
          toggleCategory={toggleCategory}
          enableAll={enableAllCats}
          disableAll={disableAllCats}
          categoryCounts={categoryCounts}
          horizontal
        />
        <div style={{ padding: `0 ${theme.spacing.lg}px` }}>
          <MuteFilter
            mutedKeywords={mutedKeywords}
            onAdd={addMutedKeyword}
            onRemove={removeMutedKeyword}
            onClear={clearMutedKeywords}
          />
        </div>
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
        {/* Sidebar filter — desktop, fixed width */}
        <div className="category-sidebar" style={{ width: 180, flexShrink: 0 }}>
          <CategoryNav
            enabledCategories={enabledCategories}
            toggleCategory={toggleCategory}
            enableAll={enableAllCats}
            disableAll={disableAllCats}
            categoryCounts={categoryCounts}
          />
          <MuteFilter
            mutedKeywords={mutedKeywords}
            onAdd={addMutedKeyword}
            onRemove={removeMutedKeyword}
            onClear={clearMutedKeywords}
          />
        </div>

        {/* Main feed */}
        <main style={{ flex: 1, minWidth: 0, paddingBottom: theme.spacing.xxl }}>
          <div
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
                color: theme.colors.textFaint,
                letterSpacing: "0.05em",
              }}
            >
              {articles.length} articles
            </span>
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
          Sources: Reuters · AP News · BBC · NPR
        </p>
        <p
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 10,
            color: theme.colors.textGhost,
            letterSpacing: "0.03em",
          }}
        >
          Auto-refreshes every 5 min · Opinion content filtered out
        </p>
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
        .category-mobile-bar { display: none; }
        @media (max-width: 700px) {
          .category-sidebar { display: none; }
          .category-mobile-bar { display: block; }
        }
      `}</style>
    </div>
  );
}
