export default function handler(req, res) {
  res.json({ ok: true, uptime: process.uptime() });
}
