// Email digest subscription — stores email for daily delivery
// Privacy: email stored only for delivery, never shared, one-click unsubscribe
// Storage: Vercel KV (free tier) — swap to any KV/DB later

// For MVP without Vercel KV, use a simple JSON approach
// TODO: Migrate to Vercel KV when ready: import { kv } from "@vercel/kv";

const subscribers = new Map(); // In-memory for now — persists across warm invocations only
// In production, replace with Vercel KV or similar persistent store

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateUnsubToken(email) {
  // Simple hash — replace with crypto.randomUUID() + stored token for production
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash + email.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export default async function handler(req, res) {
  // CORS for the frontend
  res.setHeader("Access-Control-Allow-Origin", "https://thecleanfeed.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "POST") {
      const { email } = req.body || {};

      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ ok: false, error: "Valid email required" });
      }

      const normalized = email.trim().toLowerCase();

      // Check if already subscribed
      if (subscribers.has(normalized)) {
        return res.json({ ok: true, message: "Already subscribed" });
      }

      const token = generateUnsubToken(normalized);
      subscribers.set(normalized, {
        email: normalized,
        subscribedAt: new Date().toISOString(),
        unsubToken: token,
      });

      console.log(`[Subscribe] New subscriber: ${normalized} (total: ${subscribers.size})`);

      return res.json({
        ok: true,
        message: "Subscribed. You'll receive the daily digest at 7:00 AM ET.",
        unsubscribeUrl: `https://thecleanfeed.app/api/subscribe?unsub=${token}&email=${encodeURIComponent(normalized)}`,
      });
    }

    // Unsubscribe via GET (for email link clicks)
    if (req.method === "GET") {
      const { unsub, email } = req.query;
      if (unsub && email) {
        const normalized = email.trim().toLowerCase();
        const sub = subscribers.get(normalized);
        if (sub && sub.unsubToken === unsub) {
          subscribers.delete(normalized);
          console.log(`[Subscribe] Unsubscribed: ${normalized}`);
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          return res.send(`<!DOCTYPE html><html><body style="font-family:Georgia,serif;max-width:400px;margin:60px auto;text-align:center;color:#ddd;background:#0d0d0d;padding:20px;">
            <h1 style="font-family:monospace;font-size:14px;letter-spacing:0.15em;">CLEAN FEED</h1>
            <p style="margin-top:20px;">You've been unsubscribed.</p>
            <p style="color:#888;font-size:13px;">No hard feelings. The feed is always here.</p>
            <a href="https://thecleanfeed.app" style="color:#888;font-size:12px;">Back to Clean Feed</a>
          </body></html>`);
        }
        return res.status(400).send("Invalid unsubscribe link");
      }

      // Stats (for Luke)
      return res.json({
        ok: true,
        count: subscribers.size,
        note: "In-memory store — resets on cold start. Migrate to Vercel KV for persistence.",
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("[Subscribe] Error:", err.message);
    res.status(500).json({ ok: false, error: "Subscription failed" });
  }
}
