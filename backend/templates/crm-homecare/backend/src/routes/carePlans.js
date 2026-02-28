import express from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/care-plans?clientId=xxx
router.get('/', authenticate, async (req, res, next) => {
  const { clientId, status } = req.query;
  try {
    const plans = await prisma.carePlan.findMany({
      where: {
        ...(clientId && { clientId }),
        ...(status && { status }),
      },
      include: {
        client: { select: { firstName: true, lastName: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        updatedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(plans);
  } catch (e) { next(e); }
});

// GET /api/care-plans/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const plan = await prisma.carePlan.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { firstName: true, lastName: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        updatedBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!plan) return res.status(404).json({ error: 'Care plan not found' });
    res.json(plan);
  } catch (e) { next(e); }
});

// POST /api/care-plans
router.post('/', authenticate, async (req, res, next) => {
  const { clientId, title, content, goals, adlNeeds, dietaryNeeds, mobilityNeeds, cognitiveNeeds, safetyNeeds, medicationNeeds } = req.body;
  try {
    const plan = await prisma.carePlan.create({
      data: {
        clientId,
        title,
        content: content || null,
        goals: goals || null,
        adlNeeds: adlNeeds || null,
        dietaryNeeds: dietaryNeeds || null,
        mobilityNeeds: mobilityNeeds || null,
        cognitiveNeeds: cognitiveNeeds || null,
        safetyNeeds: safetyNeeds || null,
        medicationNeeds: medicationNeeds || null,
        createdById: req.user.userId,
        updatedById: req.user.userId,
      },
    });
    res.status(201).json(plan);
  } catch (e) { next(e); }
});

// PUT /api/care-plans/:id
router.put('/:id', authenticate, async (req, res, next) => {
  const { title, content, goals, adlNeeds, dietaryNeeds, mobilityNeeds, cognitiveNeeds, safetyNeeds, medicationNeeds, status } = req.body;
  try {
    const plan = await prisma.carePlan.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(goals !== undefined && { goals }),
        ...(adlNeeds !== undefined && { adlNeeds }),
        ...(dietaryNeeds !== undefined && { dietaryNeeds }),
        ...(mobilityNeeds !== undefined && { mobilityNeeds }),
        ...(cognitiveNeeds !== undefined && { cognitiveNeeds }),
        ...(safetyNeeds !== undefined && { safetyNeeds }),
        ...(medicationNeeds !== undefined && { medicationNeeds }),
        ...(status !== undefined && { status }),
        updatedById: req.user.userId,
      },
    });
    res.json(plan);
  } catch (e) { next(e); }
});

// DELETE /api/care-plans/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.carePlan.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
