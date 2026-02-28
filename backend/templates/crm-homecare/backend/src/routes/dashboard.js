import { Router } from 'express';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/dashboard/stats
router.get('/stats', async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      activeClients,
      activeCaregiversCount,
      openShifts,
      openNoshows,
      incompleteOnboarding,
      invoicesOutstanding,
      authsExpiringSoon,
      shiftsToday,
    ] = await Promise.all([
      prisma.client.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'caregiver', isActive: true } }),
      prisma.openShift.count({ where: { status: 'open', date: { gte: today } } }),
      prisma.noshowAlert.count({ where: { status: 'open' } }),
      prisma.clientOnboarding.count({ where: { allCompleted: false } }),
      prisma.invoice.aggregate({ where: { paymentStatus: { in: ['pending', 'overdue'] } }, _sum: { total: true } }),
      prisma.authorization.count({
        where: {
          status: 'active',
          endDate: { lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) },
        }
      }),
      prisma.timeEntry.count({ where: { startTime: { gte: today, lt: tomorrow }, isComplete: false } }),
    ]);

    // Caregivers currently on shift
    const caregiversClockedIn = await prisma.timeEntry.findMany({
      where: { startTime: { gte: today }, endTime: null, isComplete: false },
      select: { caregiverId: true },
      distinct: ['caregiverId'],
    });

    res.json({
      activeClients,
      activeCaregiversCount,
      caregiversClockedIn: caregiversClockedIn.length,
      openShifts,
      openNoshows,
      incompleteOnboarding,
      outstandingRevenue: Number(invoicesOutstanding._sum.total || 0),
      authsExpiringSoon,
      shiftsToday,
    });
  } catch (err) { next(err); }
});

// GET /api/dashboard/recent-activity
router.get('/recent-activity', async (req, res, next) => {
  try {
    const [recentClients, recentTimeEntries, recentInvoices, pendingAbsences] = await Promise.all([
      prisma.client.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, firstName: true, lastName: true, serviceType: true, createdAt: true } }),
      prisma.timeEntry.findMany({ orderBy: { startTime: 'desc' }, take: 8, select: { id: true, startTime: true, endTime: true, isComplete: true, caregiver: { select: { firstName: true, lastName: true } }, client: { select: { firstName: true, lastName: true } } } }),
      prisma.invoice.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, invoiceNumber: true, total: true, paymentStatus: true, createdAt: true, client: { select: { firstName: true, lastName: true } } } }),
      prisma.absence.findMany({ orderBy: { createdAt: 'desc' }, take: 5, where: { coverageNeeded: true, coverageAssignedTo: null }, select: { id: true, date: true, type: true, caregiver: { select: { firstName: true, lastName: true } } } }),
    ]);

    res.json({ recentClients, recentTimeEntries, recentInvoices, pendingAbsences });
  } catch (err) { next(err); }
});

// GET /api/dashboard/alerts
router.get('/alerts', async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [noshowAlerts, expiringAuths, expiringCerts] = await Promise.all([
      prisma.noshowAlert.findMany({
        where: { status: 'open' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { caregiver: { select: { firstName: true, lastName: true } }, client: { select: { firstName: true, lastName: true } } },
      }),
      prisma.authorization.findMany({
        where: {
          status: 'active',
          endDate: { lte: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000) },
        },
        include: { client: { select: { firstName: true, lastName: true } } },
        orderBy: { endDate: 'asc' },
        take: 10,
      }),
      prisma.user.findMany({
        where: {
          role: 'caregiver',
          isActive: true,
          certificationsExpiry: { hasSome: [] },
        },
        select: { id: true, firstName: true, lastName: true, certifications: true, certificationsExpiry: true },
        take: 10,
      }),
    ]);

    res.json({ noshowAlerts, expiringAuths, expiringCerts });
  } catch (err) { next(err); }
});

// Aliases for frontend compatibility
router.get('/summary', async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [activeClients, activeCaregiversCount, invoicesOutstanding, monthRevenue] = await Promise.all([
      prisma.client.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'caregiver', isActive: true } }),
      prisma.invoice.aggregate({ where: { paymentStatus: { in: ['pending', 'overdue'] } }, _sum: { total: true } }),
      prisma.invoice.aggregate({ where: { paymentStatus: 'paid', createdAt: { gte: monthStart } }, _sum: { total: true } }),
    ]);

    res.json({
      activeClients,
      activeCaregivers: activeCaregiversCount,
      pendingInvoices: Number(invoicesOutstanding._sum.total || 0),
      monthRevenue: Number(monthRevenue._sum.total || 0),
    });
  } catch (err) { next(err); }
});

router.get('/referrals', async (req, res, next) => {
  try {
    const referrals = await prisma.referralSource.findMany({
      include: { _count: { select: { clients: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }).catch(() => []);
    res.json(referrals);
  } catch (err) { next(err); }
});

router.get('/caregiver-hours', async (req, res, next) => {
  try {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const entries = await prisma.timeEntry.findMany({
      where: { startTime: { gte: weekAgo }, isComplete: true },
      include: { caregiver: { select: { firstName: true, lastName: true } } },
    }).catch(() => []);
    res.json(entries);
  } catch (err) { next(err); }
});

export default router;
