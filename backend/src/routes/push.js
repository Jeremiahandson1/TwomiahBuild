import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';
import push from '../services/push.js';

const router = Router();

// Get VAPID public key (no auth required)
router.get('/vapid-public-key', (req, res) => {
  const key = push.getVapidPublicKey();
  
  if (!key) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }

  res.json({ key });
});

// All other routes require authentication
router.use(authenticate);

// Subscribe to push notifications
router.post('/subscribe', async (req, res, next) => {
  try {
    const { subscription } = req.body;

    if (!subscription?.endpoint || !subscription?.keys) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    const saved = await push.saveSubscription(req.user.userId, {
      ...subscription,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, id: saved.id });
  } catch (error) {
    next(error);
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', async (req, res, next) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    await push.removeSubscription(req.user.userId, endpoint);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get user's subscriptions
router.get('/subscriptions', async (req, res, next) => {
  try {
    const subscriptions = await push.getUserSubscriptions(req.user.userId);
    res.json(subscriptions.map(s => ({
      id: s.id,
      endpoint: s.endpoint,
      createdAt: s.createdAt,
      userAgent: s.userAgent,
    })));
  } catch (error) {
    next(error);
  }
});

// Send test notification to self
router.post('/test', requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    const result = await push.sendToUser(req.user.userId, {
      title: 'Test Notification',
      body: 'Push notifications are working!',
      url: '/',
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Admin: Send notification to user
router.post('/send', requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    const { userId, userIds, title, body, url } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    let result;

    if (userIds?.length) {
      result = await push.sendToUsers(userIds, { title, body, url });
    } else if (userId) {
      result = await push.sendToUser(userId, { title, body, url });
    } else {
      return res.status(400).json({ error: 'userId or userIds is required' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Admin: Send notification to all company users
router.post('/broadcast', requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    const { title, body, url } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    const result = await push.sendToCompany(req.user.companyId, { title, body, url });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ── Mobile (Expo) push token registration ─────────────────────────────────────

// Register Expo push token (mobile app)
router.post('/register', async (req, res, next) => {
  try {
    const { token, platform, userAgent } = req.body;
    if (!token) return res.status(400).json({ error: 'Push token is required' });

    // Store in push subscriptions table reusing existing infra
    // Expo tokens are stored alongside web push subscriptions
    await push.saveSubscription(req.user.userId, {
      endpoint: token,            // Expo token doubles as the endpoint key
      platform: platform || 'mobile',
      userAgent: userAgent || req.headers['user-agent'] || null,
      type: 'expo',
    }).catch(() => {}); // Graceful if schema doesn't have type field yet

    res.json({ message: 'Device registered' });
  } catch (error) {
    next(error);
  }
});

// Unregister Expo push token (mobile logout)
router.post('/unregister', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (token) {
      await push.removeSubscription(req.user.userId, token).catch(() => {});
    }
    res.json({ message: 'Device unregistered' });
  } catch (error) {
    next(error);
  }
});

export default router;
