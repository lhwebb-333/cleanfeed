import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { SOURCES, CATEGORIES, CATEGORY_SUBSOURCES, ALL_SUBSOURCE_NAMES, getSourceColor } from "../utils/sources";
import { resolveState, US_STATES, LOCAL_COLOR } from "../utils/stateSources";

const SUB_SET = new Set(ALL_SUBSOURCE_NAMES);

export function SourceRibbon({
  enabledSources, toggleSource, enableAllSources, disableAllSources, sourceCounts, selectedState,
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const localName = selectedState ? `Local ${selectedState}` : null;
  const primarySources = SOURCES.filter((s) => !SUB_SET.has(s.name));
  const allSources = localName
    ? [...primarySources, { key: "local", name: localName, color: getSourceColor(localName) }]
    : primarySources;

  const activeCount = allSources.filter((s) => enabledSources.has(s.name)).length;
  const allOn = activeCount >= allSources.length;

  return (
    <div style={{
      maxWidth: 960, margin: "0 auto",
      borderBottom: `1px solid ${theme.colors.border}`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: `3px ${theme.spacing.lg}px`,
        overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
        minHeight: 26,
      }}>
        <button onClick={() => setOpen(!open)} style={{
          ...lblStyle(theme), fontSize: 7,
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          transition: theme.transitions.fast,
          background: "none", border: "none", cursor: "pointer", padding: 0,
        }}>▸</button>
        <span style={lblStyle(theme)}>SOURCES</span>

        {!open ? (
          <span style={{
            fontFamily: theme.fonts.mono, fontSize: 9, color: theme.colors.textMuted,
          }}>
            {activeCount}/{allSources.length} active
          </span>
        ) : (
          <>
            <button onClick={allOn ? disableAllSources : enableAllSources} style={{
              ...pillBase(theme), color: theme.colors.textFaint,
              border: `1px solid ${theme.colors.border}`, background: "transparent",
            }}>
              {allOn ? "NONE" : "ALL"}
            </button>
            {allSources.map((s) => {
              const on = enabledSources.has(s.name);
              return (
                <button key={s.key} onClick={() => toggleSource(s.name)} style={{
                  ...pillBase(theme),
                  border: on ? `1px solid ${s.color}50` : `1px solid ${theme.colors.border}`,
                  background: on ? s.color + "15" : "transparent",
                  color: on ? s.color : theme.colors.textFaint,
                  opacity: on ? 1 : 0.5,
                }}>
                  {s.name}
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

export function TopicRibbon({
  enabledCategories, toggleCategory, categoryCounts,
  disabledSubSources, toggleSubSource,
}) {
  const { theme } = useTheme();
  const [expandedSub, setExpandedSub] = useState(null);

  return (
    <div style={{
      maxWidth: 960, margin: "0 auto",
      borderBottom: `1px solid ${theme.colors.border}`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: `3px ${theme.spacing.lg}px`,
        overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
        minHeight: 26,
      }}>
        <span style={lblStyle(theme)}>TOPICS</span>

        {CATEGORIES.map((cat) => {
          const on = enabledCategories.has(cat.key);
          const count = categoryCounts[cat.key] || 0;
          const hasSubs = !!CATEGORY_SUBSOURCES[cat.key];
          const isSubOpen = expandedSub === cat.key;

          return (
            <span key={cat.key} style={{ display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
              <button onClick={() => toggleCategory(cat.key)} style={{
                ...pillBase(theme),
                border: on ? "1px solid rgba(255,140,0,0.3)" : `1px solid ${theme.colors.border}`,
                background: on ? "rgba(255,140,0,0.1)" : "transparent",
                color: on ? theme.colors.textStrong : theme.colors.textFaint,
                opacity: on ? 1 : 0.5,
              }}>
                {cat.label}
                {count > 0 && <span style={{ marginLeft: 3, opacity: 0.5, fontSize: 8 }}>{count}</span>}
              </button>
              {hasSubs && on && (
                <button onClick={(e) => { e.stopPropagation(); setExpandedSub(isSubOpen ? null : cat.key); }} style={{
                  background: "none", border: "none", cursor: "pointer", padding: "1px 2px",
                  fontSize: 7, color: theme.colors.textFaint,
                  opacity: isSubOpen ? 0.9 : 0.4,
                  transform: isSubOpen ? "rotate(90deg)" : "rotate(0deg)",
                  transition: theme.transitions.fast,
                }}>▸</button>
              )}
              {hasSubs && on && isSubOpen && CATEGORY_SUBSOURCES[cat.key].map((sub) => {
                const subOn = !disabledSubSources?.has(sub.name);
                return (
                  <button key={sub.name} onClick={(e) => { e.stopPropagation(); toggleSubSource?.(sub.name); }} style={{
                    ...pillBase(theme), fontSize: 8, padding: "1px 6px",
                    border: subOn ? `1px solid ${sub.color}50` : `1px solid ${theme.colors.border}`,
                    background: subOn ? sub.color + "18" : "transparent",
                    color: subOn ? sub.color : theme.colors.textFaint,
                    opacity: subOn ? 1 : 0.4,
                  }}>
                    {sub.short || sub.name}
                  </button>
                );
              })}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function FilterRibbon({
  mutedKeywords, onAddMuted, onRemoveMuted, onClearMuted,
  selectedState, onSelectState, onClearState,
}) {
  const { theme } = useTheme();
  const [muteInput, setMuteInput] = useState("");
  const [stateInput, setStateInput] = useState("");

  const handleMute = (e) => { e.preventDefault(); onAddMuted(muteInput); setMuteInput(""); };
  const handleState = (e) => { e.preventDefault(); const code = resolveState(stateInput); if (code) { onSelectState(code); setStateInput(""); } };

  const hasFilters = mutedKeywords.length > 0 || selectedState;

  return (
    <div style={{
      maxWidth: 960, margin: "0 auto",
      borderBottom: `1px solid ${theme.colors.border}`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: `3px ${theme.spacing.lg}px`,
        overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
        minHeight: 26,
      }}>
        {/* LOCAL */}
        <span style={{ ...lblStyle(theme), color: LOCAL_COLOR }}>LOCAL</span>
        {!selectedState ? (
          <form onSubmit={handleState} style={{ flexShrink: 0 }}>
            <input type="text" value={stateInput} onChange={(e) => setStateInput(e.target.value)}
              placeholder="+ state" style={inputStyle(theme, LOCAL_COLOR + "30")} />
          </form>
        ) : (
          <button onClick={onClearState} title="Remove" style={{
            ...pillBase(theme), fontSize: 8, padding: "2px 6px",
            background: LOCAL_COLOR + "12", border: `1px solid ${LOCAL_COLOR}40`, color: LOCAL_COLOR,
          }}>
            {US_STATES[selectedState]} ({selectedState}) <span style={{ opacity: 0.5, marginLeft: 2 }}>×</span>
          </button>
        )}

        {/* Divider */}
        <span style={{ width: 1, height: 12, background: theme.colors.border, flexShrink: 0 }} />

        {/* MUTE */}
        <span style={lblStyle(theme)}>MUTE</span>
        <form onSubmit={handleMute} style={{ flexShrink: 0 }}>
          <input type="text" value={muteInput} onChange={(e) => setMuteInput(e.target.value)}
            placeholder="+ keyword" style={inputStyle(theme)} />
        </form>
        {mutedKeywords.map((kw) => (
          <button key={kw} onClick={() => onRemoveMuted(kw)} title="Unmute" style={{
            ...pillBase(theme), fontSize: 8, padding: "2px 6px",
            background: theme.colors.error + "12", border: `1px solid ${theme.colors.error}40`, color: theme.colors.error,
          }}>
            {kw} <span style={{ opacity: 0.5, marginLeft: 2 }}>×</span>
          </button>
        ))}
        {mutedKeywords.length > 0 && (
          <button onClick={onClearMuted} style={{
            ...pillBase(theme), fontSize: 7, padding: "2px 6px",
            background: "transparent", border: `1px solid ${theme.colors.border}`, color: theme.colors.textGhost,
          }}>CLEAR</button>
        )}
      </div>
    </div>
  );
}

// Shared styles
function lblStyle(theme) {
  return {
    fontFamily: theme.fonts.mono, fontSize: 8, fontWeight: 700,
    color: theme.colors.textMuted, letterSpacing: "0.06em",
    textTransform: "uppercase", flexShrink: 0,
  };
}

function pillBase(theme) {
  return {
    fontFamily: theme.fonts.mono, fontSize: 9, fontWeight: 600,
    padding: "2px 7px", borderRadius: theme.radii.sm, cursor: "pointer",
    whiteSpace: "nowrap", flexShrink: 0, letterSpacing: "0.03em",
    transition: theme.transitions.fast,
  };
}

function inputStyle(theme, borderColor) {
  return {
    fontFamily: theme.fonts.mono, fontSize: 9, padding: "2px 6px", width: 64,
    background: theme.colors.surface, border: `1px solid ${borderColor || theme.colors.border}`,
    borderRadius: theme.radii.sm, color: theme.colors.text, outline: "none",
  };
}
