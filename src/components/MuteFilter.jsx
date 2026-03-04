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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 12px",
          marginBottom: 10,
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
          }}
        >
          Mute Words
        </p>
        {mutedKeywords.length > 0 && (
          <button
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
            }}
          >
            CLEAR
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ padding: "0 12px", marginBottom: 8 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. trump, war..."
          style={{
            width: "100%",
            fontFamily: theme.fonts.mono,
            fontSize: 11,
            padding: "7px 10px",
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radii.sm,
            color: theme.colors.text,
            outline: "none",
            transition: theme.transitions.fast,
          }}
        />
      </form>

      {mutedKeywords.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
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
                alignSelf: "flex-start",
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
