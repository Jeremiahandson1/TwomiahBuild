import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import crypto from 'crypto';
import selections from '../services/selections.js';

const router = Router();

// Local portal auth middleware — reads token from X-Portal-Token header or ?token query param
async function portalAuth(req, res, next) {
  try {
    const token = req.headers['x-portal-token'] || req.query.token;

    if (!token) {
      return res.status(401).json({ error: 'Portal token required' });
    }

    const contact = await prisma.contact.findFirst({
      where: { portalToken: token, portalEnabled: true },
      include: {
        companyRef: {
          select: { id: true, name: true, logo: true, primaryColor: true, email: true, phone: true },
        },
      },
    });

    if (!contact) {
      return res.status(401).json({ error: 'Invalid or expired portal link' });
    }

    // Timing-safe token comparison
    const storedBuf = Buffer.from((contact.portalToken || '').padEnd(64, '0'));
    const providedBuf = Buffer.from(token.padEnd(64, '0').slice(0, storedBuf.length));
    if (!crypto.timingSafeEqual(storedBuf, providedBuf)) {
      return res.status(401).json({ error: 'Invalid or expired portal link' });
    }

    if (contact.portalTokenExp && new Date() > contact.portalTokenExp) {
      return res.status(401).json({ error: 'Portal link has expired' });
    }

    req.portal = {
      contact,
      company: contact.companyRef,
      companyId: contact.companyId,
    };

    next();
  } catch (error) {
    next(error);
  }
}

// Apply portal auth to all routes in this router
router.use(portalAuth);

/**
 * Get selections for client
 */
router.get('/project/:projectId/selections', async (req, res, next) => {
  try {
    const data = await selections.getClientSelections(
      req.params.projectId,
      req.portal.contact.id
    );
    res.json(data);
  } catch (error) {
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    next(error);
  }
});

/**
 * Client makes a selection
 */
router.post('/project/:projectId/selections/:selectionId', async (req, res, next) => {
  try {
    const { optionId, notes } = req.body;

    if (!optionId) {
      return res.status(400).json({ error: 'Option ID is required' });
    }

    const result = await selections.clientMakeSelection(
      req.params.projectId,
      req.params.selectionId,
      req.portal.contact.id,
      { optionId, notes }
    );

    res.json(result);
  } catch (error) {
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (error.message === 'Selection cannot be changed') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

export default router;
