import { theme } from "../styles/theme";
import { timeAgo } from "../utils/time";

export function Header({ lastUpdated, refreshing, onRefresh }) {
  return (
    <header
      style={{
        padding: `${theme.spacing.xl}px ${theme.spacing.lg}px ${theme.spacing.md}px`,
        maxWidth: theme.maxWidth,
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
              color: "#fff",
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
            News only. No opinions. No rage. No algorithms.
          </p>
        </div>
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

      {lastUpdated && (
        <p
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 10,
            color: theme.colors.textFaint,
            marginTop: 12,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Updated {timeAgo(lastUpdated.toISOString())}
        </p>
      )}
    </header>
  );
}
