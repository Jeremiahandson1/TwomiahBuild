import express from 'express';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/incidents
router.get('/', authenticate, async (req, res, next) => {
  const { clientId, caregiverId, status, severity } = req.query;
  try {
    const incidents = await prisma.incidentReport.findMany({
      where: {
        ...(clientId && { clientId }),
        ...(caregiverId && { caregiverId }),
        ...(status && { status }),
        ...(severity && { severity }),
      },
      include: {
        client: { select: { firstName: true, lastName: true } },
        caregiver: { select: { firstName: true, lastName: true } },
        reportedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { incidentDate: 'desc' },
    });
    res.json(incidents);
  } catch (e) { next(e); }
});

// GET /api/incidents/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const incident = await prisma.incidentReport.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { firstName: true, lastName: true } },
        caregiver: { select: { firstName: true, lastName: true } },
        reportedBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  } catch (e) { next(e); }
});

// POST /api/incidents
router.post('/', authenticate, async (req, res, next) => {
  const { clientId, caregiverId, title, description, incidentType, severity, incidentDate, location, witnesses, actionTaken, followUpRequired } = req.body;
  try {
    const incident = await prisma.incidentReport.create({
      data: {
        clientId: clientId || null,
        caregiverId: caregiverId || null,
        reportedById: req.user.userId,
        title,
        description,
        incidentType: incidentType || 'general',
        severity: severity || 'low',
        incidentDate: new Date(incidentDate),
        location: location || null,
        witnesses: witnesses || null,
        actionTaken: actionTaken || null,
        followUpRequired: followUpRequired || false,
      },
    });
    res.status(201).json(incident);
  } catch (e) { next(e); }
});

// PUT /api/incidents/:id
router.put('/:id', authenticate, async (req, res, next) => {
  const { title, description, incidentType, severity, location, witnesses, actionTaken, followUpRequired, followUpNotes, status } = req.body;
  try {
    const data = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(incidentType !== undefined && { incidentType }),
      ...(severity !== undefined && { severity }),
      ...(location !== undefined && { location }),
      ...(witnesses !== undefined && { witnesses }),
      ...(actionTaken !== undefined && { actionTaken }),
      ...(followUpRequired !== undefined && { followUpRequired }),
      ...(followUpNotes !== undefined && { followUpNotes }),
      ...(status !== undefined && { status }),
    };
    if (status === 'resolved' || status === 'closed') data.resolvedAt = new Date();
    const incident = await prisma.incidentReport.update({ where: { id: req.params.id }, data });
    res.json(incident);
  } catch (e) { next(e); }
});

// DELETE /api/incidents/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.incidentReport.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
