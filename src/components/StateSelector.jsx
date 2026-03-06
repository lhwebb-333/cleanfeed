import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { resolveState, US_STATES, LOCAL_COLOR } from "../utils/stateSources";

export function StateSelector({ selectedState, onSelect, onClear }) {
  const { theme } = useTheme();
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = resolveState(input);
    if (code) {
      onSelect(code);
      setInput("");
    }
  };

  return (
    <div style={{ paddingTop: theme.spacing.md }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 12px",
          marginBottom: selectedState ? 8 : 0,
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
          Local News
        </p>

        {!selectedState ? (
          <form onSubmit={handleSubmit} style={{ flex: 1, minWidth: 0 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. OH, Texas..."
              style={{
                width: "100%",
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
        ) : (
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
              whiteSpace: "nowrap",
              flexShrink: 0,
              marginLeft: "auto",
            }}
          >
            CLEAR
          </button>
        )}
      </div>

      {selectedState && (
        <div style={{ padding: "0 12px" }}>
          <button
            onClick={onClear}
            title="Click to remove"
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 10,
              padding: "3px 8px",
              background: LOCAL_COLOR + "18",
              border: `1px solid ${LOCAL_COLOR}30`,
              borderRadius: theme.radii.sm,
              color: LOCAL_COLOR,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {US_STATES[selectedState]} ({selectedState})
            <span style={{ opacity: 0.6 }}>×</span>
          </button>
        </div>
      )}
    </div>
  );
}
