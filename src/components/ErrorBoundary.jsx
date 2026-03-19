import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[CleanFeed] Render error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Georgia, serif",
          color: "#ddd",
          background: "#0d0d0d",
          padding: 24,
          textAlign: "center",
        }}>
          <h1 style={{ fontFamily: "monospace", fontSize: 14, letterSpacing: "0.2em", marginBottom: 8 }}>
            CLEAN FEED
          </h1>
          <p style={{ fontSize: 14, color: "#888", marginBottom: 20 }}>
            Something went wrong loading the feed.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              padding: "8px 20px",
              background: "transparent",
              border: "1px solid #444",
              borderRadius: 3,
              color: "#aaa",
              cursor: "pointer",
            }}
          >
            RELOAD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
