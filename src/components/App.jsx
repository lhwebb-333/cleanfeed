import { useState, useEffect, useRef } from "react";
import { Header } from "./Header";
import { FeedList } from "./FeedList";
import { About } from "./About";
import { DataBars } from "./DataBars";
import { TopicRibbon, FilterRibbon, TodayRibbon } from "./RibbonBar";
import { InstallPrompt } from "./InstallPrompt";
import { DigestSignup } from "./DigestSignup";
import { LiveCounter } from "./LiveCounter";
import { useFeed } from "../hooks/useFeed";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { useTheme } from "../hooks/useTheme";

export default function App() {
  const { theme, mode, toggle: toggleTheme } = useTheme();
  const [aboutOpen, setAboutOpen] = useState(false);
  const {
    articles, loading, refreshing, error, lastUpdated,
    enabledSources, toggleSource, enableAllSources, disableAllSources, sourceCounts,
    enabledCategories, toggleCategory, enableAllCats, disableAllCats, categoryCounts,
    disabledSubSources, toggleSubSource,
    mutedKeywords, addMutedKeyword, removeMutedKeyword, clearMutedKeywords,
    selectedState, selectState, clearState,
    searchQuery, setSearchQuery, refresh,
    loadMore, hasMore, hoursWindow, setBriefMode,
    degradedSources,
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
            position: "fixed", top: 0, left: 0, right: 0,
            display: "flex", justifyContent: "center",
            paddingTop: pullDistance - 30, zIndex: 100, pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 28, height: 28, borderRadius: "50%",
              border: `2px solid ${triggered ? theme.colors.textStrong : theme.colors.textFaint}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: triggered ? theme.colors.textStrong : theme.colors.textFaint,
              background: theme.colors.surface, transform: `rotate(${pullDistance * 3}deg)`,
            }}
          >
            ↻
          </div>
        </div>
      )}

      <About open={aboutOpen} onClose={() => setAboutOpen(false)} />

      <Header
        lastUpdated={lastUpdated} refreshing={refreshing} onRefresh={refresh}
        mode={mode} onToggleTheme={toggleTheme} onAbout={() => setAboutOpen(true)}
        searchQuery={searchQuery} onSearchChange={setSearchQuery}
        onDetectState={(stateCode) => {
          // Auto-select local state if not already set
          if (!selectedState) selectState(stateCode);
        }}
      />

      {/* All ribbons — same visual weight, same interaction */}
      <TopicRibbon
        enabledSources={enabledSources} toggleSource={toggleSource}
        enableAllSources={enableAllSources} disableAllSources={disableAllSources}
        sourceCounts={sourceCounts} selectedState={selectedState}
        enabledCategories={enabledCategories} toggleCategory={toggleCategory}
        categoryCounts={categoryCounts}
        disabledSubSources={disabledSubSources} toggleSubSource={toggleSubSource}
      />

      <DataBars />

      <TodayRibbon />

      <FilterRibbon
        mutedKeywords={mutedKeywords} onAddMuted={addMutedKeyword}
        onRemoveMuted={removeMutedKeyword} onClearMuted={clearMutedKeywords}
        selectedState={selectedState} onSelectState={selectState} onClearState={clearState}
      />

      {/* Source degradation banner */}
      {degradedSources.length > 0 && (
        <div style={{
          maxWidth: 960, margin: "0 auto",
          padding: `6px ${theme.spacing.lg}px`,
          fontFamily: theme.fonts.mono, fontSize: 9,
          color: "#FF8C00", letterSpacing: "0.03em",
          borderBottom: `1px solid ${theme.colors.border}`,
        }}>
          {degradedSources.join(", ")} temporarily unavailable — other sources active
        </div>
      )}

      {/* Feed */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: `0 ${theme.spacing.lg}px` }}>
        <main style={{ paddingBottom: theme.spacing.xxl }}>
          <div
            ref={feedRef}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: `${theme.spacing.sm}px 0`,
              flexWrap: "wrap",
            }}
          >
            <span style={{
              fontFamily: theme.fonts.mono, fontSize: 10,
              color: searchQuery ? theme.colors.textMuted : theme.colors.textFaint,
              letterSpacing: "0.05em",
            }}>
              {searchQuery ? `${articles.length} results for "${searchQuery}"` : hoursWindow <= 3 ? "Recent" : hoursWindow <= 12 ? "Brief" : "Today's feed"}
            </span>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{
                fontFamily: theme.fonts.mono, fontSize: 9, padding: "3px 8px",
                background: "transparent", border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radii.sm, color: theme.colors.textFaint,
                cursor: "pointer", letterSpacing: "0.04em",
              }}>
                CLEAR
              </button>
            )}
            {!searchQuery && (
              <div style={{ display: "flex", gap: 4, marginLeft: "auto", alignItems: "center" }}>
                {/* Quick filter presets — always visible */}
                {(() => {
                  const politicsWords = ["trump", "biden", "election", "democrat", "republican", "congress", "senate", "partisan", "gop", "liberal", "conservative"];
                  const familyWords = ["killed", "murder", "shooting", "stabbing", "assault", "rape", "abuse", "gunman", "massacre", "execution", "torture", "fentanyl", "overdose", "suicide", "bomb", "bombing", "terrorist", "hostage", "graphic", "explicit", "violence"];
                  const politicsOn = mutedKeywords.some((kw) => politicsWords.includes(kw));
                  const familyOn = mutedKeywords.some((kw) => familyWords.includes(kw));
                  return (
                    <>
                      <button onClick={() => {
                        if (politicsOn) politicsWords.forEach((kw) => removeMutedKeyword(kw));
                        else politicsWords.forEach((kw) => addMutedKeyword(kw));
                      }} style={{
                        fontFamily: theme.fonts.mono, fontSize: 7, padding: "2px 6px",
                        background: politicsOn ? "rgba(239,83,80,0.08)" : "transparent",
                        border: `1px solid ${politicsOn ? "rgba(239,83,80,0.3)" : theme.colors.border}`,
                        borderRadius: theme.radii.sm,
                        color: politicsOn ? "#EF5350" : theme.colors.textGhost,
                        cursor: "pointer", letterSpacing: "0.04em",
                        transition: theme.transitions.fast,
                      }}>
                        {politicsOn ? "POLITICS \u2715" : "MUTE POLITICS"}
                      </button>
                      <button onClick={() => {
                        if (familyOn) familyWords.forEach((kw) => removeMutedKeyword(kw));
                        else familyWords.forEach((kw) => addMutedKeyword(kw));
                      }} style={{
                        fontFamily: theme.fonts.mono, fontSize: 7, padding: "2px 6px",
                        background: familyOn ? "rgba(76,175,80,0.08)" : "transparent",
                        border: `1px solid ${familyOn ? "rgba(76,175,80,0.3)" : theme.colors.border}`,
                        borderRadius: theme.radii.sm,
                        color: familyOn ? "#4CAF50" : theme.colors.textGhost,
                        cursor: "pointer", letterSpacing: "0.04em",
                        transition: theme.transitions.fast,
                      }}>
                        {familyOn ? "FAMILY \u2715" : "FAMILY MODE"}
                      </button>
                    </>
                  );
                })()}
                <span style={{ width: 1, height: 10, background: theme.colors.border }} />
                {[3, 12, 24].map((h) => (
                  <button key={h} onClick={() => setBriefMode(h)} style={{
                    fontFamily: theme.fonts.mono, fontSize: 8, padding: "2px 6px",
                    background: hoursWindow === h ? "rgba(255,140,0,0.1)" : "transparent",
                    border: `1px solid ${hoursWindow === h ? "rgba(255,140,0,0.3)" : theme.colors.border}`,
                    borderRadius: theme.radii.sm,
                    color: hoursWindow === h ? theme.colors.textStrong : theme.colors.textFaint,
                    cursor: "pointer", letterSpacing: "0.04em",
                  }}>
                    {h === 3 ? "3H" : h === 12 ? "12H" : "24H"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <FeedList articles={articles} loading={loading} error={error} onRetry={refresh} />

          {hasMore && !loading && (
            <div style={{ textAlign: "center", padding: `${theme.spacing.lg}px 0` }}>
              <button
                onClick={loadMore}
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 9,
                  letterSpacing: "0.06em",
                  padding: "6px 20px",
                  background: "transparent",
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radii.sm,
                  color: theme.colors.textMuted,
                  cursor: "pointer",
                  transition: theme.transitions.fast,
                }}
              >
                LOAD EARLIER
              </button>
            </div>
          )}
        </main>
      </div>

      <footer style={{
        maxWidth: 960, margin: "0 auto",
        padding: `${theme.spacing.lg}px ${theme.spacing.lg}px ${theme.spacing.xxl}px`,
      }}>
        <div style={{ width: 40, height: 1, background: theme.colors.border, marginBottom: 16 }} />
        <p style={{
          fontFamily: theme.fonts.mono, fontSize: 10, color: theme.colors.textFaint,
          letterSpacing: "0.05em", marginBottom: 4,
        }}>
          Sources: Reuters · AP News · BBC · NPR · The Hill · PBS · CSM · Bloomberg · DW · France 24 · Ars Technica · MIT Tech Review · Nature · Phys.org · STAT News · KFF Health · FRED · SEC · BLS · Treasury · Fed{selectedState ? ` · Local ${selectedState}` : ""}
        </p>
        <p style={{
          fontFamily: theme.fonts.mono, fontSize: 10, color: theme.colors.textGhost,
          letterSpacing: "0.03em", marginBottom: 14,
        }}>
          Auto-refreshes every 5 min · Opinion content filtered out ·{" "}
          <a href="/api/reader" target="_blank" rel="noopener noreferrer"
            style={{ color: theme.colors.textFaint, textDecoration: "underline", textUnderlineOffset: 2 }}>
            Reader mode
          </a>
        </p>
        {/* Daily digest signup */}
        <DigestSignup />

        <p style={{
          fontFamily: theme.fonts.serif, fontSize: 12, color: theme.colors.textFaint,
          lineHeight: 1.5, marginBottom: 12,
        }}>
          Clean Feed believes clarity should be free.{" "}
          <a href="https://buymeacoffee.com/lhwebb" target="_blank" rel="noopener noreferrer"
            style={{ color: theme.colors.textMuted, textDecoration: "underline", textUnderlineOffset: 2 }}>
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
              fontFamily: theme.fonts.mono, fontSize: 9, letterSpacing: "0.06em",
              padding: "5px 12px", background: "transparent",
              border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.sm,
              color: theme.colors.textMuted, cursor: "pointer", transition: theme.transitions.fast,
            }}
          >
            SHARE CLEAN FEED
          </button>
          <span id="share-toast" style={{
            fontFamily: theme.fonts.mono, fontSize: 9, color: theme.colors.textFaint,
            opacity: 0, transition: "opacity 0.3s ease",
          }}>
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
        .source-filter-row::-webkit-scrollbar { display: none; }
        @media (max-width: 700px) {
          .ribbon-label { font-size: 9px !important; padding: 5px 0 5px 12px !important; }
          .ribbon-label span { font-size: 8px !important; }
          .ribbon-count { font-size: 9px !important; }
          .ribbon-dropdown { padding-left: 12px !important; }
          .ribbon-dropdown button { font-size: 9px !important; padding: 3px 8px !important; }
          .ribbon-dropdown span { font-size: 8px !important; }
        }
      `}</style>
      <InstallPrompt />
    </div>
  );
}
