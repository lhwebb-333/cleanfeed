import { useState } from "react";
import { useTheme } from "../hooks/useTheme";

const API_BASE = import.meta.env.VITE_API_URL || "";

export function DigestSignup() {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null); // null | "sending" | "done" | "error"

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch(`${API_BASE}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("done");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p style={{
        fontFamily: theme.fonts.mono, fontSize: 10, color: theme.colors.textMuted,
        marginBottom: 14, letterSpacing: "0.03em",
      }}>
        You're in. Daily digest at 7:00 AM ET. No tracking. One-click unsubscribe.
      </p>
    );
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{
        fontFamily: theme.fonts.mono, fontSize: 9, fontWeight: 700,
        color: theme.colors.textMuted, letterSpacing: "0.06em",
        marginBottom: 6, textTransform: "uppercase",
      }}>
        Daily Digest
      </p>
      <p style={{
        fontFamily: theme.fonts.serif, fontSize: 12, color: theme.colors.textFaint,
        lineHeight: 1.5, marginBottom: 8,
      }}>
        Yesterday's top stories at 7:00 AM. Same feed, no tracking pixels, no click counting.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          required
          style={{
            fontFamily: theme.fonts.mono, fontSize: 10, padding: "5px 10px",
            background: theme.colors.surface, border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radii.sm, color: theme.colors.text,
            outline: "none", width: 200, transition: theme.transitions.fast,
          }}
        />
        <button
          type="submit"
          disabled={status === "sending"}
          style={{
            fontFamily: theme.fonts.mono, fontSize: 9, fontWeight: 700,
            padding: "5px 14px", letterSpacing: "0.06em",
            background: theme.colors.textStrong, color: theme.colors.bg,
            border: "none", borderRadius: theme.radii.sm,
            cursor: status === "sending" ? "default" : "pointer",
            opacity: status === "sending" ? 0.5 : 1,
            transition: theme.transitions.fast,
          }}
        >
          {status === "sending" ? "..." : "SUBSCRIBE"}
        </button>
      </form>
      {status === "error" && (
        <p style={{ fontFamily: theme.fonts.mono, fontSize: 9, color: theme.colors.error, marginTop: 4 }}>
          Something went wrong. Try again.
        </p>
      )}
    </div>
  );
}
