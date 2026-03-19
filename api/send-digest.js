// Send daily digest email to all subscribers
// Triggered by Vercel Cron at 12:00 UTC (7:00 AM ET)
// Uses Resend (free: 100 emails/day)

export default async function handler(req, res) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ ok: false, error: "RESEND_API_KEY not configured" });
    }

    // Get subscriber list
    const { getAllSubscribers, generateUnsubToken } = await import("./subscribe.js");
    const emails = await getAllSubscribers();

    if (emails.length === 0) {
      return res.json({ ok: true, sent: 0, message: "No subscribers" });
    }

    // Generate digest HTML
    const digestRes = await fetch("https://thecleanfeed.app/api/digest?format=json");
    const digestData = await digestRes.json();

    if (!digestData.ok || !digestData.html) {
      return res.status(500).json({ ok: false, error: "Failed to generate digest" });
    }

    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    let sent = 0;
    let failed = 0;
    let lastError = null;

    // Send to each subscriber (Resend free tier: 100/day)
    for (const email of emails.slice(0, 100)) {
      try {
        const token = generateUnsubToken(email);
        const unsubUrl = `https://thecleanfeed.app/api/subscribe?unsub=${token}&email=${encodeURIComponent(email)}`;
        const html = digestData.html.replace("%%UNSUB_URL%%", unsubUrl);

        const sendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // Use Resend's default sender until domain is verified
            // Change back to: "Clean Feed <digest@thecleanfeed.app>" once DNS propagates
            from: "Clean Feed <onboarding@resend.dev>",
            to: email,
            subject: `Clean Feed — ${today}`,
            html,
          }),
        });

        const sendBody = await sendRes.text();
        if (sendRes.ok) {
          sent++;
        } else {
          console.error(`[Digest] Failed to send to ${email}: ${sendRes.status} ${sendBody}`);
          // Include error in response for debugging
          lastError = `${sendRes.status}: ${sendBody}`;
          failed++;
        }
      } catch (err) {
        console.error(`[Digest] Error sending to ${email}: ${err.message}`);
        failed++;
      }
    }

    console.log(`[Digest] Sent: ${sent}, Failed: ${failed}, Total subscribers: ${emails.length}`);
    res.json({ ok: true, sent, failed, total: emails.length, ...(lastError ? { lastError } : {}) });
  } catch (err) {
    console.error("[Digest] Error:", err.message);
    res.status(500).json({ ok: false, error: "Failed to send digest" });
  }
}
