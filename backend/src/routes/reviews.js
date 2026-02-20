import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/permissions.js';
import reviews from '../services/reviews.js';
import audit from '../services/audit.js';

const router = Router();

// Process scheduled review requests (cron endpoint — no JWT, secured by CRON_SECRET only)
router.post('/process-scheduled', async (req, res, next) => {
  try {
    const cronSecret = req.headers['x-cron-secret'];
    if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const results = await reviews.processScheduledRequests();
    res.json({ processed: results.length, results });
  } catch (error) {
    next(error);
  }
});

router.use(authenticate);

// Get review settings
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await reviews.getReviewSettings(req.user.companyId);
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// Update review settings
router.put('/settings', requireRole('admin', 'owner'), async (req, res, next) => {
  try {
    const settings = await reviews.updateReviewSettings(req.user.companyId, req.body);
    
    audit.log({
      action: 'REVIEW_SETTINGS_UPDATED',
      entity: 'company',
      entityId: req.user.companyId,
      req,
    });

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// Get review stats
router.get('/stats', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await reviews.getReviewStats(req.user.companyId, { startDate, endDate });
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// Get review requests
router.get('/requests', async (req, res, next) => {
  try {
    const { status, limit, page } = req.query;
    const requests = await reviews.getReviewRequests(req.user.companyId, {
      status,
      limit: parseInt(limit) || 50,
      page: parseInt(page) || 1,
    });
    res.json(requests);
  } catch (error) {
    next(error);
  }
});

// Send review request for a job
router.post('/request/:jobId', async (req, res, next) => {
  try {
    const { channel = 'both' } = req.body;
    
    const result = await reviews.sendReviewRequest(req.params.jobId, { channel });
    
    audit.log({
      action: 'REVIEW_REQUEST_SENT',
      entity: 'job',
      entityId: req.params.jobId,
      metadata: { channel },
      req,
    });

    res.json(result);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('not configured')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

// Schedule review request for a job
router.post('/schedule/:jobId', async (req, res, next) => {
  try {
    const request = await reviews.scheduleReviewRequest(req.params.jobId);
    
    if (!request) {
      return res.status(400).json({ error: 'Could not schedule review request' });
    }

    res.json(request);
  } catch (error) {
    next(error);
  }
});

// Send follow-up
router.post('/follow-up/:requestId', async (req, res, next) => {
  try {
    const result = await reviews.sendFollowUp(req.params.requestId);
    
    if (!result) {
      return res.status(400).json({ error: 'Could not send follow-up' });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Track click (public endpoint with request ID)
router.get('/track/:requestId/click', async (req, res, next) => {
  try {
    await reviews.markReviewCompleted(req.params.requestId, { clicked: true });
    
    // Get the review link and redirect
    const request = await prisma.reviewRequest.findUnique({
      where: { id: req.params.requestId },
    });
    
    if (request?.reviewLink) {
      // Validate URL to prevent open redirect — only allow known review platforms
      try {
        const url = new URL(request.reviewLink);
        const allowedHosts = ['google.com', 'www.google.com', 'yelp.com', 'www.yelp.com', 'facebook.com', 'www.facebook.com', 'houzz.com', 'www.houzz.com', 'bbb.org', 'www.bbb.org'];
        if (!['http:', 'https:'].includes(url.protocol) || !allowedHosts.some(h => url.hostname === h || url.hostname.endsWith('.' + h))) {
          return res.status(400).send('Invalid review link');
        }
        res.redirect(request.reviewLink);
      } catch {
        return res.status(400).send('Invalid review link');
      }
    } else {
      res.status(404).send('Link not found');
    }
  } catch (error) {
    next(error);
  }
});

// Generate review link preview
router.get('/preview-link', async (req, res, next) => {
  try {
    const { placeId } = req.query;
    
    if (!placeId) {
      return res.status(400).json({ error: 'placeId is required' });
    }

    const link = reviews.generateGoogleReviewLink(placeId);
    res.json({ link });
  } catch (error) {
    next(error);
  }
});

export default router;
