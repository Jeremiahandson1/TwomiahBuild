import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { withCompany } from '../middleware/ownership.js';
import { nextDocumentNumber } from '../utils/documentNumbers.js';


const router = Router();
router.use(authenticate);

const schema = z.object({ type: z.string(), projectId: z.string(), scheduledDate: z.string().optional(), inspector: z.string().optional(), notes: z.string().optional() });

router.get('/', requirePermission('inspections:read'), async (req, res, next) => {
  try {
    const { status, projectId, page = '1', limit = '50' } = req.query;
    const where = { companyId: req.user.companyId }; if (status) where.status = status; if (projectId) where.projectId = projectId;
    const [data, total] = await Promise.all([prisma.inspection.findMany({ where, include: { project: { select: { id: true, name: true } } }, orderBy: { scheduledDate: 'desc' }, skip: (page - 1) * limit, take: +limit }), prisma.inspection.count({ where })]);
    res.json({ data, pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.post('/', requirePermission('inspections:create'), async (req, res, next) => {
  try { const data = schema.parse(req.body); const number = await nextDocumentNumber('INS', req.user.companyId); const item = await prisma.inspection.create({ data: { ...data, number, scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null, companyId: req.user.companyId } }); res.status(201).json(item); } catch (error) { next(error); }
});

router.put('/:id', requirePermission('inspections:update'), async (req, res, next) => { try { const data = schema.partial().parse(req.body); const item = await prisma.inspection.update({ where: withCompany(req.params.id, req.user.companyId), data: { ...data, scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined } }); res.json(item); } catch (error) { next(error); } });
router.delete('/:id', requirePermission('inspections:delete'), async (req, res, next) => { try { await prisma.inspection.delete({ where: withCompany(req.params.id, req.user.companyId) }); res.status(204).send(); } catch (error) { next(error); } });
router.post('/:id/pass', requirePermission('inspections:update'), async (req, res, next) => { try { const item = await prisma.inspection.update({ where: withCompany(req.params.id, req.user.companyId), data: { status: 'passed', result: 'pass' } }); res.json(item); } catch (error) { next(error); } });
router.post('/:id/fail', requirePermission('inspections:update'), async (req, res, next) => { try { const { deficiencies } = req.body; const item = await prisma.inspection.update({ where: withCompany(req.params.id, req.user.companyId), data: { status: 'failed', result: 'fail', deficiencies } }); res.json(item); } catch (error) { next(error); } });

export default router;
