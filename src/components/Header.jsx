import { useTheme } from "../hooks/useTheme";
import { timeAgo } from "../utils/time";

export function Header({ lastUpdated, refreshing, onRefresh, mode, onToggleTheme, onAbout, searchQuery, onSearchChange }) {
  const { theme } = useTheme();

  return (
    <header
      style={{
        padding: `${theme.spacing.xl}px ${theme.spacing.lg}px ${theme.spacing.md}px`,
        maxWidth: 960,
        margin: "0 auto",
        borderBottom: `1px solid ${theme.colors.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: theme.colors.textStrong,
              marginBottom: 6,
            }}
          >
            CLEAN FEED
          </h1>
          <p
            style={{
              fontFamily: theme.fonts.serif,
              fontSize: 14,
              color: theme.colors.textFaint,
              fontStyle: "italic",
            }}
          >
            No algorithms. No rage. Just news.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* About */}
          <button
            onClick={onAbout}
            style={{
              background: "none",
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.textMuted,
              fontSize: 12,
              cursor: "pointer",
              padding: "6px 10px",
              borderRadius: theme.radii.md,
              fontFamily: theme.fonts.mono,
              letterSpacing: "0.04em",
              transition: theme.transitions.fast,
            }}
          >
            ?
          </button>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle light/dark mode"
            style={{
              background: theme.colors.toggleBg,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: 20,
              width: 44,
              height: 24,
              cursor: "pointer",
              position: "relative",
              transition: "background 0.3s ease",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 3,
                left: mode === "light" ? 23 : 3,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: mode === "light" ? "#FF8C00" : "#888",
                transition: "left 0.25s ease, background 0.25s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
              }}
            >
              {mode === "light" ? "\u2600" : "\u263E"}
            </span>
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            style={{
              background: "none",
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.textMuted,
              fontSize: 20,
              cursor: refreshing ? "default" : "pointer",
              padding: "6px 10px",
              borderRadius: theme.radii.md,
              opacity: refreshing ? 0.5 : 1,
              transition: theme.transitions.fast,
            }}
          >
            <span
              style={{
                display: "inline-block",
                animation: refreshing ? "spin 1s linear infinite" : "none",
              }}
            >
              ↻
            </span>
          </button>
        </div>
      </div>

      {/* Search + timestamp row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 12,
        }}
      >
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search headlines..."
          style={{
            flex: 1,
            fontFamily: theme.fonts.mono,
            fontSize: 11,
            padding: "7px 12px",
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radii.sm,
            color: theme.colors.text,
            outline: "none",
            transition: theme.transitions.fast,
            maxWidth: 300,
          }}
        />

        {lastUpdated && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            style={{
              background: "none",
              border: "none",
              cursor: refreshing ? "default" : "pointer",
              fontFamily: theme.fonts.mono,
              fontSize: 10,
              color: theme.colors.textFaint,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              opacity: refreshing ? 0.5 : 1,
              transition: theme.transitions.fast,
              whiteSpace: "nowrap",
            }}
            title="Click to refresh"
          >
            Updated {timeAgo(lastUpdated.toISOString())} ↻
          </button>
        )}
      </div>
    </header>
  );
}
