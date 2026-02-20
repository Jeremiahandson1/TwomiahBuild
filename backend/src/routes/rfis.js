import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { withCompany } from '../middleware/ownership.js';
import { nextDocumentNumber } from '../utils/documentNumbers.js';


const router = Router();
router.use(authenticate);

const schema = z.object({ subject: z.string().min(1), question: z.string().min(1), projectId: z.string(), priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'), dueDate: z.string().optional(), assignedTo: z.string().optional() });

router.get('/', requirePermission('rfis:read'), async (req, res, next) => {
  try {
    const { status, projectId, page = '1', limit = '50' } = req.query;
    const where = { companyId: req.user.companyId }; if (status) where.status = status; if (projectId) where.projectId = projectId;
    const [data, total] = await Promise.all([prisma.rFI.findMany({ where, include: { project: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: +limit }), prisma.rFI.count({ where })]);
    res.json({ data, pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.get('/:id', requirePermission('rfis:read'), async (req, res, next) => {
  try { const rfi = await prisma.rFI.findFirst({ where: { id: req.params.id, companyId: req.user.companyId }, include: { project: true } }); if (!rfi) return res.status(404).json({ error: 'RFI not found' }); res.json(rfi); } catch (error) { next(error); }
});

router.post('/', requirePermission('rfis:create'), async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const number = await nextDocumentNumber('RFI', req.user.companyId);
    const rfi = await prisma.rFI.create({ data: { ...data, number, dueDate: data.dueDate ? new Date(data.dueDate) : null, companyId: req.user.companyId } });
    res.status(201).json(rfi);
  } catch (error) { next(error); }
});

router.put('/:id', requirePermission('rfis:update'), async (req, res, next) => {
  try { const data = schema.partial().parse(req.body); const rfi = await prisma.rFI.update({ where: withCompany(req.params.id, req.user.companyId), data: { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined } }); res.json(rfi); } catch (error) { next(error); }
});

router.delete('/:id', requirePermission('rfis:delete'), async (req, res, next) => {
  try { await prisma.rFI.delete({ where: withCompany(req.params.id, req.user.companyId) }); res.status(204).send(); } catch (error) { next(error); }
});

router.post('/:id/respond', requirePermission('rfis:update'), async (req, res, next) => {
  try { const { response, respondedBy } = req.body; const rfi = await prisma.rFI.update({ where: withCompany(req.params.id, req.user.companyId), data: { response, respondedBy, respondedAt: new Date(), status: 'answered' } }); res.json(rfi); } catch (error) { next(error); }
});

router.post('/:id/close', requirePermission('rfis:update'), async (req, res, next) => {
  try { const rfi = await prisma.rFI.update({ where: withCompany(req.params.id, req.user.companyId), data: { status: 'closed' } }); res.json(rfi); } catch (error) { next(error); }
});

export default router;
