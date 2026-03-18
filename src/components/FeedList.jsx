import { useTheme } from "../hooks/useTheme";
import { ArticleCard } from "./ArticleCard";
import { FinancialCard } from "./FinancialCard";

export function FeedList({ articles, loading, error, onRetry }) {
  const { theme } = useTheme();

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: theme.colors.textFaint,
            margin: "0 auto 16px",
            animation: "pulse 1.5s ease infinite",
          }}
        />
        <p
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 11,
            color: theme.colors.textFaint,
            letterSpacing: "0.05em",
          }}
        >
          Fetching clean news...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <p
          style={{
            color: theme.colors.error,
            fontSize: 14,
            fontFamily: theme.fonts.serif,
            marginBottom: 16,
          }}
        >
          {error}
        </p>
        <button
          onClick={onRetry}
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 12,
            padding: "8px 20px",
            background: "none",
            border: `1px solid ${theme.colors.border}`,
            color: theme.colors.textMuted,
            borderRadius: theme.radii.sm,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <p
        style={{
          textAlign: "center",
          color: theme.colors.textFaint,
          padding: "60px 0",
          fontFamily: theme.fonts.serif,
          fontStyle: "italic",
        }}
      >
        No articles found.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {articles.map((article, i) =>
        article.type === "financial-data" ? (
          <FinancialCard key={article.id || i} item={article} />
        ) : (
          <ArticleCard key={article.id || i} article={article} />
        )
      )}
      {articles.length > 0 && (
        <div style={{
          textAlign: "center",
          padding: "24px 0 8px",
        }}>
          <p style={{
            fontFamily: theme.fonts.mono,
            fontSize: 9,
            color: theme.colors.textGhost,
            letterSpacing: "0.06em",
          }}>
            You're caught up.
          </p>
        </div>
      )}
    </div>
  );
}
