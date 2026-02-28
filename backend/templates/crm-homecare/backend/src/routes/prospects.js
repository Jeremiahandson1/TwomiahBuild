import express from 'express';
import prisma from '../config/prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/prospects
router.get('/', authenticate, async (req, res, next) => {
  const { status, assignedToId } = req.query;
  try {
    const prospects = await prisma.prospect.findMany({
      where: {
        ...(status && { status }),
        ...(assignedToId && { assignedToId }),
      },
      include: {
        referralSource: { select: { name: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
        appointments: { orderBy: { scheduledAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(prospects);
  } catch (e) { next(e); }
});

// GET /api/prospects/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const prospect = await prisma.prospect.findUnique({
      where: { id: req.params.id },
      include: {
        referralSource: { select: { name: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
        appointments: { orderBy: { scheduledAt: 'desc' } },
      },
    });
    if (!prospect) return res.status(404).json({ error: 'Prospect not found' });
    res.json(prospect);
  } catch (e) { next(e); }
});

// POST /api/prospects
router.post('/', authenticate, async (req, res, next) => {
  const { firstName, lastName, email, phone, address, city, state, zip, dateOfBirth, notes, status, sourceType, referralSourceId, assignedToId } = req.body;
  try {
    const prospect = await prisma.prospect.create({
      data: {
        firstName, lastName,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        notes: notes || null,
        status: status || 'new',
        sourceType: sourceType || null,
        referralSourceId: referralSourceId || null,
        assignedToId: assignedToId || req.user.userId,
      },
    });
    res.status(201).json(prospect);
  } catch (e) { next(e); }
});

// PUT /api/prospects/:id
router.put('/:id', authenticate, async (req, res, next) => {
  const { firstName, lastName, email, phone, notes, status, assignedToId } = req.body;
  try {
    const prospect = await prisma.prospect.update({
      where: { id: req.params.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
        ...(assignedToId !== undefined && { assignedToId }),
      },
    });
    res.json(prospect);
  } catch (e) { next(e); }
});

// POST /api/prospects/:id/appointments
router.post('/:id/appointments', authenticate, async (req, res, next) => {
  const { scheduledAt, type, notes } = req.body;
  try {
    const appointment = await prisma.prospectAppointment.create({
      data: {
        prospectId: req.params.id,
        scheduledAt: new Date(scheduledAt),
        type: type || 'assessment',
        notes: notes || null,
      },
    });
    res.status(201).json(appointment);
  } catch (e) { next(e); }
});

// POST /api/prospects/:id/convert — Convert to client
router.post('/:id/convert', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const prospect = await prisma.prospect.findUnique({ where: { id: req.params.id } });
    if (!prospect) return res.status(404).json({ error: 'Prospect not found' });

    const client = await prisma.client.create({
      data: {
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        phone: prospect.phone,
        email: prospect.email,
        address: prospect.address,
        city: prospect.city,
        state: prospect.state,
        zip: prospect.zip,
        dateOfBirth: prospect.dateOfBirth,
        referredById: prospect.referralSourceId,
        notes: prospect.notes,
      },
    });

    await prisma.prospect.update({
      where: { id: req.params.id },
      data: { status: 'converted', convertedClientId: client.id },
    });

    res.json({ success: true, clientId: client.id, client });
  } catch (e) { next(e); }
});

// DELETE /api/prospects/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.prospect.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
