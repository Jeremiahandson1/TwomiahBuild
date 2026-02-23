/**
 * Status Route
 * GET /api/status — checks third-party service health
 * Used by the frontend to show a banner when Stripe or SendGrid is down
 */
import express from 'express';
const router = express.Router();

// Cache results for 2 minutes to avoid hammering status APIs
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 2 * 60 * 1000;

async function checkService(url, name) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return { status: 'degraded', name };
    const data = await res.json();
    // Atlassian status page format (used by Stripe, SendGrid, Render)
    const indicator = data?.status?.indicator;
    if (indicator === 'none') return { status: 'ok', name };
    if (indicator === 'minor') return { status: 'degraded', name, message: data?.status?.description };
    if (indicator === 'major' || indicator === 'critical') return { status: 'down', name, message: data?.status?.description };
    return { status: 'ok', name };
  } catch (err) {
    // Timeout or network error — don't alarm users, just mark unknown
    return { status: 'unknown', name };
  }
}

/**
 * GET /api/status
 * Returns health of third-party dependencies
 * No auth required — called from frontend before login too
 */
router.get('/', async (req, res) => {
  // Serve cache if fresh
  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return res.json(cache);
  }

  const [stripe, sendgrid, render] = await Promise.all([
    checkService('https://status.stripe.com/api/v2/status.json', 'Stripe'),
    checkService('https://status.sendgrid.com/api/v2/status.json', 'SendGrid'),
    checkService('https://status.render.com/api/v2/status.json', 'Render'),
  ]);

  const services = { stripe, sendgrid, render };

  // Overall: worst status wins
  const statuses = [stripe.status, sendgrid.status, render.status];
  const overall = statuses.includes('down') ? 'down'
    : statuses.includes('degraded') ? 'degraded'
    : 'ok';

  cache = { overall, services, checkedAt: new Date().toISOString() };
  cacheTime = Date.now();

  res.json(cache);
});

export default router;
