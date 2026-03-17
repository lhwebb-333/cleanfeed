import { getAdapterStatus, getAdapterList } from "./_lib/financial/index.js";

export default async function handler(req, res) {
  try {
    const status = getAdapterStatus();
    const adapters = getAdapterList();

    res.setHeader("Cache-Control", "no-cache");
    res.json({
      ok: true,
      adapters: status,
      registered: adapters.map((a) => a.key),
    });
  } catch (err) {
    console.error("[Financial] Health check error:", err);
    res.status(500).json({ ok: false, error: "Health check failed" });
  }
}
