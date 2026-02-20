import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/stats', async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [contacts, projects, jobs, quoteGroups, invoiceGroups, todayJobs, quoteValues, invoiceValues] = await Promise.all([
      prisma.contact.count({ where: { companyId } }),
      prisma.project.groupBy({ by: ['status'], where: { companyId }, _count: true }),
      prisma.job.groupBy({ by: ['status'], where: { companyId }, _count: true }),
      // Use groupBy+aggregate instead of loading all records into memory (Bug #10)
      prisma.quote.groupBy({ by: ['status'], where: { companyId }, _count: true, _sum: { total: true } }),
      prisma.invoice.groupBy({ by: ['status'], where: { companyId }, _count: true, _sum: { total: true, amountPaid: true } }),
      prisma.job.count({ where: { companyId, scheduledDate: { gte: today, lt: new Date(today.getTime() + 86400000) } } }),
      prisma.quote.aggregate({ where: { companyId }, _count: true, _sum: { total: true } }),
      prisma.invoice.aggregate({ where: { companyId }, _count: true, _sum: { total: true, amountPaid: true } }),
    ]);

    const quoteStats = {
      total: quoteValues._count,
      pending: quoteGroups.filter(q => ['draft', 'sent'].includes(q.status)).reduce((s, q) => s + q._count, 0),
      approved: quoteGroups.find(q => q.status === 'approved')?._count || 0,
      totalValue: Number(quoteValues._sum.total || 0),
    };

    const invoiceStats = {
      total: invoiceValues._count,
      paid: invoiceGroups.find(inv => inv.status === 'paid')?._count || 0,
      outstanding: invoiceGroups.filter(inv => inv.status !== 'paid').reduce((s, inv) => s + inv._count, 0),
      totalValue: Number(invoiceValues._sum.total || 0),
      outstandingValue: Number(invoiceValues._sum.total || 0) - Number(invoiceValues._sum.amountPaid || 0),
    };

    res.json({
      contacts,
      projects: { total: projects.reduce((s, p) => s + p._count, 0), byStatus: Object.fromEntries(projects.map(p => [p.status, p._count])) },
      jobs: { total: jobs.reduce((s, j) => s + j._count, 0), today: todayJobs, byStatus: Object.fromEntries(jobs.map(j => [j.status, j._count])) },
      quotes: quoteStats,
      invoices: invoiceStats,
    });
  } catch (error) { next(error); }
});

router.get('/recent-activity', async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const [recentJobs, recentQuotes, recentInvoices] = await Promise.all([
      prisma.job.findMany({ where: { companyId }, orderBy: { updatedAt: 'desc' }, take: 5, select: { id: true, number: true, title: true, status: true, updatedAt: true } }),
      prisma.quote.findMany({ where: { companyId }, orderBy: { updatedAt: 'desc' }, take: 5, select: { id: true, number: true, name: true, status: true, total: true, updatedAt: true } }),
      prisma.invoice.findMany({ where: { companyId }, orderBy: { updatedAt: 'desc' }, take: 5, select: { id: true, number: true, status: true, total: true, amountPaid: true, updatedAt: true } }),
    ]);
    res.json({ recentJobs, recentQuotes, recentInvoices });
  } catch (error) { next(error); }
});

export default router;
