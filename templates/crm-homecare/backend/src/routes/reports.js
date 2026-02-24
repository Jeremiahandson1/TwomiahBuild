import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireAdmin);

// Hours by caregiver
router.get('/hours-by-caregiver', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { isComplete: true };
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }
    const entries = await prisma.timeEntry.groupBy({
      by: ['caregiverId'],
      where,
      _sum: { billableMinutes: true, durationMinutes: true },
      _count: true,
    });

    const caregivers = await prisma.user.findMany({
      where: { id: { in: entries.map(e => e.caregiverId) } },
      select: { id: true, firstName: true, lastName: true, defaultPayRate: true },
    });

    const result = entries.map(e => {
      const cg = caregivers.find(c => c.id === e.caregiverId);
      const hours = (e._sum.billableMinutes || e._sum.durationMinutes || 0) / 60;
      return { caregiver: cg, totalHours: Number(hours.toFixed(2)), visits: e._count, estimatedPay: Number((hours * Number(cg?.defaultPayRate || 15)).toFixed(2)) };
    });

    res.json(result);
  } catch (err) { next(err); }
});

// Revenue by period
router.get('/revenue', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate || endDate) {
      where.billingPeriodStart = {};
      if (startDate) where.billingPeriodStart.gte = new Date(startDate);
      if (endDate) where.billingPeriodStart.lte = new Date(endDate);
    }
    const summary = await prisma.invoice.aggregate({
      where,
      _sum: { total: true, subtotal: true },
      _count: true,
    });
    const byStatus = await prisma.invoice.groupBy({ by: ['paymentStatus'], where, _sum: { total: true }, _count: true });
    res.json({ summary, byStatus });
  } catch (err) { next(err); }
});

// Client census
router.get('/census', async (req, res, next) => {
  try {
    const byService = await prisma.client.groupBy({ by: ['serviceType'], where: { isActive: true }, _count: true });
    const total = await prisma.client.count({ where: { isActive: true } });
    const newThisMonth = await prisma.client.count({
      where: { startDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
    });
    res.json({ total, newThisMonth, byServiceType: byService });
  } catch (err) { next(err); }
});

// Payer mix
router.get('/payer-mix', async (req, res, next) => {
  try {
    const mix = await prisma.client.groupBy({
      by: ['insuranceProvider'],
      where: { isActive: true },
      _count: true,
    });
    res.json(mix.sort((a, b) => b._count - a._count));
  } catch (err) { next(err); }
});

// Revenue forecast
router.get('/forecast', async (req, res, next) => {
  try {
    const activeAuths = await prisma.authorization.findMany({
      where: { status: 'active', endDate: { gte: new Date() } },
      include: { client: { select: { firstName: true, lastName: true } } },
    });
    const forecast = activeAuths.map(a => {
      const remainingUnits = Number(a.authorizedUnits) - Number(a.usedUnits);
      return { clientName: `${a.client.firstName} ${a.client.lastName}`, remainingUnits, endDate: a.endDate, procedureCode: a.procedureCode };
    });
    res.json({ activeAuthorizationsCount: activeAuths.length, forecast });
  } catch (err) { next(err); }
});

// No-show rate
router.get('/noshow-rate', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    const [total, noShows] = await Promise.all([
      prisma.timeEntry.count({ where: { isComplete: true, ...where.date ? { startTime: where.date } : {} } }),
      prisma.absence.count({ where: { type: 'no_show', ...where } }),
    ]);
    res.json({ totalShifts: total, noShows, rate: total > 0 ? Number((noShows / total * 100).toFixed(1)) : 0 });
  } catch (err) { next(err); }
});

export default router;
