import { useState } from "react";
import { useTheme } from "../hooks/useTheme";

export function MuteFilter({ mutedKeywords, onAdd, onRemove, onClear, sidebar }) {
  const { theme } = useTheme();
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(input);
    setInput("");
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: sidebar ? "flex-start" : "center",
        gap: 8,
        padding: sidebar
          ? `${theme.spacing.md}px 12px 0`
          : `${theme.spacing.md}px ${theme.spacing.lg}px 0`,
        ...(sidebar
          ? { flexWrap: "wrap" }
          : {
              maxWidth: 960,
              margin: "0 auto",
              overflowX: "auto",
              flexWrap: "nowrap",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }),
      }}
      className="mute-filter-row"
    >
      <p
        style={{
          fontFamily: theme.fonts.mono,
          fontSize: 9,
          fontWeight: 700,
          color: theme.colors.textFaint,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Mute
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ flexShrink: 0 }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="+ keyword"
          style={{
            width: 90,
            fontFamily: theme.fonts.mono,
            fontSize: 11,
            padding: "5px 8px",
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radii.sm,
            color: theme.colors.text,
            outline: "none",
            transition: theme.transitions.fast,
          }}
        />
      </form>

      {mutedKeywords.map((kw) => (
        <button
          key={kw}
          onClick={() => onRemove(kw)}
          title="Click to unmute"
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 11,
            fontWeight: 600,
            padding: "5px 14px",
            background: theme.colors.error + "15",
            border: `1px solid ${theme.colors.error}50`,
            borderRadius: theme.radii.sm,
            color: theme.colors.error,
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            letterSpacing: "0.04em",
            transition: theme.transitions.fast,
          }}
        >
          {kw} <span style={{ opacity: 0.6 }}>×</span>
        </button>
      ))}

      {mutedKeywords.length > 0 && (
        <button
          onClick={onClear}
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 9,
            padding: "5px 10px",
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radii.sm,
            cursor: "pointer",
            letterSpacing: "0.06em",
            background: "transparent",
            color: theme.colors.textFaint,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          CLEAR
        </button>
      )}
    </div>
  );
}
