import { Router } from 'express';
import { nextDocumentNumber } from '../utils/documentNumbers.js';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';
import { withCompany } from '../middleware/ownership.js';

import { emitToCompany, EVENTS } from '../services/socket.js';

const router = Router();
router.use(authenticate);

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  projectId: z.string().optional(),
  contactId: z.string().optional(),
  assignedToId: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  estimatedHours: z.number().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  notes: z.string().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const { status, projectId, assignedToId, page = '1', limit = '50' } = req.query;
    const where = { companyId: req.user.companyId };
    if (status) where.status = status;
    if (projectId) where.projectId = projectId;
    if (assignedToId) where.assignedToId = assignedToId;
    const [data, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          contact: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'desc' }],
        skip: (+page - 1) * +limit,
        take: +limit,
      }),
      prisma.job.count({ where }),
    ]);
    res.json({ data, pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) } });
  } catch (error) { next(error); }
});

router.get('/today', async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const jobs = await prisma.job.findMany({
      where: {
        companyId: req.user.companyId,
        scheduledDate: { gte: today, lt: tomorrow },
      },
      include: {
        project: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true, phone: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledTime: 'asc' },
    });
    res.json(jobs);
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const job = await prisma.job.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: {
        project: true,
        contact: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        timeEntries: { orderBy: { date: 'desc' }, take: 10 },
      },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const docNumber = await nextDocumentNumber('JOB', req.user.companyId);
    const job = await prisma.job.create({
      data: {
        ...data,
        number: docNumber,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        companyId: req.user.companyId,
      },
      include: {
        project: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    emitToCompany(req.user.companyId, EVENTS.JOB_CREATED, job);
    res.status(201).json(job);
  } catch (error) { next(error); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = schema.partial().parse(req.body);
    const existing = await prisma.job.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!existing) return res.status(404).json({ error: 'Job not found' });
    const job = await prisma.job.update({
      where: withCompany(req.params.id, req.user.companyId),
      data: {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
      },
      include: {
        project: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    emitToCompany(req.user.companyId, EVENTS.JOB_UPDATED, job);
    res.json(job);
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.job.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!existing) return res.status(404).json({ error: 'Job not found' });
    await prisma.job.delete({ where: withCompany(req.params.id, req.user.companyId) });
    emitToCompany(req.user.companyId, EVENTS.JOB_DELETED, { id: req.params.id });
    res.status(204).send();
  } catch (error) { next(error); }
});

router.post('/:id/start', async (req, res, next) => {
  try {
    const existing = await prisma.job.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!existing) return res.status(404).json({ error: 'Job not found' });
    const job = await prisma.job.update({
      where: withCompany(req.params.id, req.user.companyId),
      data: { status: 'in_progress', startedAt: new Date() },
    });
    emitToCompany(req.user.companyId, EVENTS.JOB_STATUS_CHANGED, { id: job.id, status: 'in_progress' });
    res.json(job);
  } catch (error) { next(error); }
});

router.post('/:id/complete', async (req, res, next) => {
  try {
    const existing = await prisma.job.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!existing) return res.status(404).json({ error: 'Job not found' });
    const job = await prisma.job.update({
      where: withCompany(req.params.id, req.user.companyId),
      data: { status: 'completed', completedAt: new Date() },
    });
    emitToCompany(req.user.companyId, EVENTS.JOB_STATUS_CHANGED, { id: job.id, status: 'completed' });
    res.json(job);
  } catch (error) { next(error); }
});

router.post('/:id/dispatch', async (req, res, next) => {
  try {
    const existing = await prisma.job.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!existing) return res.status(404).json({ error: 'Job not found' });
    const job = await prisma.job.update({
      where: withCompany(req.params.id, req.user.companyId),
      data: { status: 'dispatched' },
    });
    emitToCompany(req.user.companyId, EVENTS.JOB_STATUS_CHANGED, { id: job.id, status: 'dispatched' });
    res.json(job);
  } catch (error) { next(error); }
});

export default router;
