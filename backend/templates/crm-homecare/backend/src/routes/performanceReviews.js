import express from 'express';
import prisma from '../config/prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/performance-reviews
router.get('/', authenticate, async (req, res, next) => {
  const { caregiverId, status } = req.query;
  try {
    const reviews = await prisma.performanceReview.findMany({
      where: {
        ...(caregiverId && { caregiverId }),
        ...(status && { status }),
      },
      include: {
        caregiver: { select: { id: true, firstName: true, lastName: true } },
        reviewer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { reviewDate: 'desc' },
    });
    res.json(reviews);
  } catch (e) { next(e); }
});

// GET /api/performance-reviews/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const review = await prisma.performanceReview.findUnique({
      where: { id: req.params.id },
      include: {
        caregiver: { select: { firstName: true, lastName: true } },
        reviewer: { select: { firstName: true, lastName: true } },
      },
    });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json(review);
  } catch (e) { next(e); }
});

// POST /api/performance-reviews
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  const { caregiverId, reviewDate, periodStart, periodEnd, punctuality, clientFeedback, documentation, professionalism, strengths, improvements, goals } = req.body;
  try {
    const scores = [punctuality, clientFeedback, documentation, professionalism].filter(s => s != null);
    const overallScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    const review = await prisma.performanceReview.create({
      data: {
        caregiverId,
        reviewerId: req.user.userId,
        reviewDate: new Date(reviewDate),
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        punctuality: punctuality ? parseInt(punctuality) : null,
        clientFeedback: clientFeedback ? parseInt(clientFeedback) : null,
        documentation: documentation ? parseInt(documentation) : null,
        professionalism: professionalism ? parseInt(professionalism) : null,
        overallScore,
        strengths: strengths || null,
        improvements: improvements || null,
        goals: goals || null,
        status: 'completed',
      },
    });
    res.status(201).json(review);
  } catch (e) { next(e); }
});

// PUT /api/performance-reviews/:id
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  const { punctuality, clientFeedback, documentation, professionalism, strengths, improvements, goals, status } = req.body;
  try {
    const scores = [punctuality, clientFeedback, documentation, professionalism].filter(s => s != null);
    const overallScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;

    const review = await prisma.performanceReview.update({
      where: { id: req.params.id },
      data: {
        ...(punctuality !== undefined && { punctuality: parseInt(punctuality) }),
        ...(clientFeedback !== undefined && { clientFeedback: parseInt(clientFeedback) }),
        ...(documentation !== undefined && { documentation: parseInt(documentation) }),
        ...(professionalism !== undefined && { professionalism: parseInt(professionalism) }),
        ...(overallScore !== undefined && { overallScore }),
        ...(strengths !== undefined && { strengths }),
        ...(improvements !== undefined && { improvements }),
        ...(goals !== undefined && { goals }),
        ...(status !== undefined && { status }),
      },
    });
    res.json(review);
  } catch (e) { next(e); }
});

// DELETE /api/performance-reviews/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.performanceReview.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
