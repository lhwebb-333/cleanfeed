import { useState } from "react";
import { useTheme } from "../hooks/useTheme";

export function MuteFilter({ mutedKeywords, onAdd, onRemove, onClear }) {
  const { theme } = useTheme();
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(input);
    setInput("");
  };

  return (
    <div style={{ paddingTop: theme.spacing.md }}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 12px",
          marginBottom: mutedKeywords.length > 0 ? 8 : 0,
        }}
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
          Mute Words
        </p>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. trump, war..."
          style={{
            flex: 1,
            minWidth: 0,
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
        {mutedKeywords.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 9,
              color: theme.colors.textFaint,
              background: "none",
              border: "none",
              cursor: "pointer",
              letterSpacing: "0.05em",
              opacity: 0.7,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            CLEAR
          </button>
        )}
      </form>

      {mutedKeywords.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            padding: "0 12px",
          }}
        >
          {mutedKeywords.map((kw) => (
            <button
              key={kw}
              onClick={() => onRemove(kw)}
              title="Click to unmute"
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 10,
                padding: "3px 8px",
                background: theme.colors.error + "18",
                border: `1px solid ${theme.colors.error}30`,
                borderRadius: theme.radii.sm,
                color: theme.colors.error,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {kw}
              <span style={{ opacity: 0.6 }}>×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
