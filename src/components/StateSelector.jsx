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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: `${theme.spacing.md}px ${theme.spacing.lg}px 0`,
        maxWidth: 960,
        margin: "0 auto",
        overflowX: "auto",
        flexWrap: "nowrap",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
      className="state-filter-row"
    >
      <p
        style={{
          fontFamily: theme.fonts.mono,
          fontSize: 9,
          fontWeight: 700,
          color: LOCAL_COLOR,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Local
      </p>

      {!selectedState ? (
        <form
          onSubmit={handleSubmit}
          style={{ flexShrink: 0 }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="+ state"
            style={{
              width: 80,
              fontFamily: theme.fonts.mono,
              fontSize: 11,
              padding: "5px 8px",
              background: theme.colors.surface,
              border: `1px solid ${LOCAL_COLOR}30`,
              borderRadius: theme.radii.sm,
              color: theme.colors.text,
              outline: "none",
              transition: theme.transitions.fast,
            }}
          />
        </form>
      ) : (
        <>
          <button
            onClick={onClear}
            title="Click to remove"
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 11,
              fontWeight: 600,
              padding: "5px 14px",
              background: LOCAL_COLOR + "15",
              border: `1px solid ${LOCAL_COLOR}50`,
              borderRadius: theme.radii.sm,
              color: LOCAL_COLOR,
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
            {US_STATES[selectedState]} ({selectedState})
            <span style={{ opacity: 0.6 }}>×</span>
          </button>
        </>
      )}
    </div>
  );
}
