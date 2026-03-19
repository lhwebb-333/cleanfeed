// Email digest subscription — stores email for daily delivery
// Privacy: email stored only for delivery, never shared, one-click unsubscribe
// Storage: Upstash Redis (free tier: 10K commands/day, 256MB)

import { Redis } from "@upstash/redis";
import crypto from "crypto";

// Initialize Redis — uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// from Vercel environment variables (auto-added when you connect the database)
let redis;
try {
  redis = Redis.fromEnv();
} catch {
  console.warn("[Subscribe] Upstash not configured — falling back to in-memory (data will not persist)");
  redis = null;
}

// In-memory fallback for local dev / before Upstash is connected
const memoryFallback = new Map();

async function getSubscriber(email) {
  if (redis) {
    return redis.get(`sub:${email}`);
  }
  return memoryFallback.get(email) || null;
}

async function setSubscriber(email, data) {
  if (redis) {
    // Store subscriber data + add to the subscriber set for enumeration
    await redis.set(`sub:${email}`, data);
    await redis.sadd("subscribers", email);
  } else {
    memoryFallback.set(email, data);
  }
}

async function deleteSubscriber(email) {
  if (redis) {
    await redis.del(`sub:${email}`);
    await redis.srem("subscribers", email);
  } else {
    memoryFallback.delete(email);
  }
}

async function getSubscriberCount() {
  if (redis) {
    return redis.scard("subscribers");
  }
  return memoryFallback.size;
}

async function getAllSubscribers() {
  if (redis) {
    const emails = await redis.smembers("subscribers");
    return emails || [];
  }
  return [...memoryFallback.keys()];
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateUnsubToken(email) {
  return crypto.createHash("sha256").update(email + (process.env.UNSUB_SALT || "cleanfeed")).digest("hex").slice(0, 16);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://thecleanfeed.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
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
      const existing = await getSubscriber(normalized);
      if (existing) {
        return res.json({ ok: true, message: "Already subscribed" });
      }

      const token = generateUnsubToken(normalized);
      await setSubscriber(normalized, {
        email: normalized,
        subscribedAt: new Date().toISOString(),
        unsubToken: token,
      });

      const count = await getSubscriberCount();
      console.log(`[Subscribe] New: ${normalized} (total: ${count})`);

      return res.json({
        ok: true,
        message: "Subscribed. You'll receive the daily digest at 7:00 AM ET.",
      });
    }

    // Unsubscribe via GET (for email link clicks)
    if (req.method === "GET") {
      const { unsub, email } = req.query;
      if (unsub && email) {
        const normalized = email.trim().toLowerCase();
        const expectedToken = generateUnsubToken(normalized);

        if (unsub === expectedToken) {
          await deleteSubscriber(normalized);
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

      // Stats endpoint
      const count = await getSubscriberCount();
      return res.json({
        ok: true,
        count,
        persistent: !!redis,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("[Subscribe] Error:", err.message);
    res.status(500).json({ ok: false, error: "Subscription failed" });
  }
}

// Export for use by the digest cron job
export { getAllSubscribers, getSubscriber, generateUnsubToken };
