import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { resolveState, US_STATES, LOCAL_COLOR } from "../utils/stateSources";

export function CompactFilters({
  mutedKeywords, onAddMuted, onRemoveMuted, onClearMuted,
  selectedState, onSelectState, onClearState,
  sidebar,
}) {
  const { theme } = useTheme();
  const [muteInput, setMuteInput] = useState("");
  const [stateInput, setStateInput] = useState("");

  const handleMute = (e) => {
    e.preventDefault();
    onAddMuted(muteInput);
    setMuteInput("");
  };

  const handleState = (e) => {
    e.preventDefault();
    const code = resolveState(stateInput);
    if (code) { onSelectState(code); setStateInput(""); }
  };

  const chipStyle = {
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: theme.radii.sm,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    letterSpacing: "0.03em",
    transition: theme.transitions.fast,
  };

  const inputStyle = {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    padding: "3px 6px",
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radii.sm,
    color: theme.colors.text,
    outline: "none",
  };

  if (sidebar) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: `${theme.spacing.md}px 12px 0`,
      }}>
        {/* Mute row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{
            fontFamily: theme.fonts.mono,
            fontSize: 8,
            fontWeight: 700,
            color: theme.colors.textFaint,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}>
            Mute
          </span>
          <form onSubmit={handleMute} style={{ flexShrink: 0 }}>
            <input
              type="text" value={muteInput}
              onChange={(e) => setMuteInput(e.target.value)}
              placeholder="+ keyword"
              style={{ ...inputStyle, width: 72 }}
            />
          </form>
          {mutedKeywords.map((kw) => (
            <button key={kw} onClick={() => onRemoveMuted(kw)} title="Unmute" style={{
              ...chipStyle,
              background: theme.colors.error + "12",
              border: `1px solid ${theme.colors.error}40`,
              color: theme.colors.error,
            }}>
              {kw} <span style={{ opacity: 0.5 }}>×</span>
            </button>
          ))}
          {mutedKeywords.length > 0 && (
            <button onClick={onClearMuted} style={{
              ...chipStyle,
              background: "transparent",
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.textGhost,
            }}>
              CLEAR
            </button>
          )}
        </div>

        {/* Local row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontFamily: theme.fonts.mono,
            fontSize: 8,
            fontWeight: 700,
            color: LOCAL_COLOR,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}>
            Local
          </span>
          {!selectedState ? (
            <form onSubmit={handleState} style={{ flexShrink: 0 }}>
              <input
                type="text" value={stateInput}
                onChange={(e) => setStateInput(e.target.value)}
                placeholder="+ state"
                style={{ ...inputStyle, width: 64, borderColor: LOCAL_COLOR + "30" }}
              />
            </form>
          ) : (
            <button onClick={onClearState} title="Remove" style={{
              ...chipStyle,
              background: LOCAL_COLOR + "12",
              border: `1px solid ${LOCAL_COLOR}40`,
              color: LOCAL_COLOR,
            }}>
              {US_STATES[selectedState]} ({selectedState}) <span style={{ opacity: 0.5 }}>×</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Mobile: single horizontal row
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: `6px ${theme.spacing.lg}px`,
      maxWidth: 960,
      margin: "0 auto",
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
      scrollbarWidth: "none",
    }}
    className="compact-filter-row"
    >
      {/* Mute section */}
      <span style={{
        fontFamily: theme.fonts.mono,
        fontSize: 8,
        fontWeight: 700,
        color: theme.colors.textFaint,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        flexShrink: 0,
      }}>
        Mute
      </span>
      <form onSubmit={handleMute} style={{ flexShrink: 0 }}>
        <input
          type="text" value={muteInput}
          onChange={(e) => setMuteInput(e.target.value)}
          placeholder="+ keyword"
          style={{ ...inputStyle, width: 72 }}
        />
      </form>
      {mutedKeywords.map((kw) => (
        <button key={kw} onClick={() => onRemoveMuted(kw)} title="Unmute" style={{
          ...chipStyle,
          background: theme.colors.error + "12",
          border: `1px solid ${theme.colors.error}40`,
          color: theme.colors.error,
        }}>
          {kw} <span style={{ opacity: 0.5 }}>×</span>
        </button>
      ))}
      {mutedKeywords.length > 0 && (
        <button onClick={onClearMuted} style={{
          ...chipStyle,
          background: "transparent",
          border: `1px solid ${theme.colors.border}`,
          color: theme.colors.textGhost,
        }}>
          CLEAR
        </button>
      )}

      {/* Divider */}
      <span style={{
        width: 1,
        height: 12,
        background: theme.colors.border,
        flexShrink: 0,
      }} />

      {/* Local section */}
      <span style={{
        fontFamily: theme.fonts.mono,
        fontSize: 8,
        fontWeight: 700,
        color: LOCAL_COLOR,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        flexShrink: 0,
      }}>
        Local
      </span>
      {!selectedState ? (
        <form onSubmit={handleState} style={{ flexShrink: 0 }}>
          <input
            type="text" value={stateInput}
            onChange={(e) => setStateInput(e.target.value)}
            placeholder="+ state"
            style={{ ...inputStyle, width: 64, borderColor: LOCAL_COLOR + "30" }}
          />
        </form>
      ) : (
        <button onClick={onClearState} title="Remove" style={{
          ...chipStyle,
          background: LOCAL_COLOR + "12",
          border: `1px solid ${LOCAL_COLOR}40`,
          color: LOCAL_COLOR,
        }}>
          {US_STATES[selectedState]} ({selectedState}) <span style={{ opacity: 0.5 }}>×</span>
        </button>
      )}
    </div>
  );
}
