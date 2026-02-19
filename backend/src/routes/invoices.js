import { Router } from 'express';
import { nextDocumentNumber } from '../utils/documentNumbers.js';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { withCompany } from '../middleware/ownership.js';
import { emitToCompany, EVENTS } from '../services/socket.js';

const router = Router();
router.use(authenticate);

const lineItemSchema = z.object({ description: z.string().min(1), quantity: z.number().default(1), unitPrice: z.number().default(0) });
const schema = z.object({
  contactId: z.string().optional(),
  projectId: z.string().optional(),
  dueDate: z.string().optional(),
  taxRate: z.number().default(0),
  discount: z.number().default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  lineItems: z.array(lineItemSchema).default([]),
});

const calcTotals = (items, taxRate, discount) => {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - discount;
  return { subtotal, taxAmount, total };
};

router.get('/', requirePermission('invoices:read'), async (req, res, next) => {
  try {
    const { status, contactId, page = '1', limit = '50' } = req.query;
    const where = { companyId: req.user.companyId };
    if (status) where.status = status;
    if (contactId) where.contactId = contactId;
    const [data, total] = await Promise.all([
      prisma.invoice.findMany({ where, include: { contact: { select: { id: true, name: true } }, lineItems: true, payments: true }, orderBy: { createdAt: 'desc' }, skip: (+page - 1) * +limit, take: +limit }),
      prisma.invoice.count({ where }),
    ]);
    res.json({ data, pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) } });
  } catch (error) { next(error); }
});

router.get('/stats', requirePermission('invoices:read'), async (req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({ where: { companyId: req.user.companyId }, select: { status: true, total: true, amountPaid: true } });
    const stats = { total: invoices.length, draft: 0, sent: 0, paid: 0, overdue: 0, totalAmount: 0, paidAmount: 0, outstanding: 0 };
    invoices.forEach(inv => { stats[inv.status] = (stats[inv.status] || 0) + 1; stats.totalAmount += Number(inv.total); stats.outstanding += Number(inv.total) - Number(inv.amountPaid); if (inv.status === 'paid') stats.paidAmount += Number(inv.total); });
    res.json(stats);
  } catch (error) { next(error); }
});

router.get('/:id', requirePermission('invoices:read'), async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, companyId: req.user.companyId }, include: { contact: true, project: true, quote: true, lineItems: { orderBy: { sortOrder: 'asc' } }, payments: { orderBy: { paidAt: 'desc' } } } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (error) { next(error); }
});

router.post('/', requirePermission('invoices:create'), async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const { lineItems, ...invoiceData } = data;
    const totals = calcTotals(lineItems, data.taxRate, data.discount);
    const docNumber = await nextDocumentNumber('INV', req.user.companyId);
    const invoice = await prisma.invoice.create({
      data: { ...invoiceData, ...totals, number: docNumber, dueDate: data.dueDate ? new Date(data.dueDate) : null, companyId: req.user.companyId, lineItems: { create: lineItems.map((item, i) => ({ ...item, total: item.quantity * item.unitPrice, sortOrder: i })) } },
      include: { lineItems: true },
    });
    emitToCompany(req.user.companyId, EVENTS.INVOICE_CREATED, invoice);
    res.status(201).json(invoice);
  } catch (error) { next(error); }
});

router.put('/:id', requirePermission('invoices:update'), async (req, res, next) => {
  try {
    const data = schema.partial().parse(req.body);
    const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });
    const { lineItems, ...invoiceData } = data;
    let totals = {};
    if (lineItems) {
      await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: req.params.id } });
      totals = calcTotals(lineItems, data.taxRate ?? Number(existing.taxRate), data.discount ?? Number(existing.discount));
      // Update amountPaid won't change on edit, balance is derived not stored
    }
    const invoice = await prisma.invoice.update({ where: withCompany(req.params.id, req.user.companyId), data: { ...invoiceData, ...totals, dueDate: data.dueDate ? new Date(data.dueDate) : undefined, lineItems: lineItems ? { create: lineItems.map((item, i) => ({ ...item, total: item.quantity * item.unitPrice, sortOrder: i })) } : undefined }, include: { lineItems: true } });
    emitToCompany(req.user.companyId, EVENTS.INVOICE_UPDATED, invoice);
    res.json(invoice);
  } catch (error) { next(error); }
});

router.delete('/:id', requirePermission('invoices:delete'), async (req, res, next) => {
  try {
    const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });
    await prisma.invoice.delete({ where: withCompany(req.params.id, req.user.companyId) });
    res.status(204).send();
  } catch (error) { next(error); }
});

router.post('/:id/send', requirePermission('invoices:update'), async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.update({ where: withCompany(req.params.id, req.user.companyId), data: { status: 'sent', sentAt: new Date() } });
    emitToCompany(req.user.companyId, EVENTS.INVOICE_SENT, { id: invoice.id, number: invoice.number });
    res.json(invoice);
  } catch (error) { next(error); }
});

router.post('/:id/payments', requirePermission('invoices:update'), async (req, res, next) => {
  try {
    const paymentSchema = z.object({ amount: z.number().positive(), method: z.string(), reference: z.string().optional(), notes: z.string().optional() });
    const data = paymentSchema.parse(req.body);
    const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, companyId: req.user.companyId } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const payment = await prisma.payment.create({ data: { ...data, invoiceId: req.params.id } });
    const newAmountPaid = Number(invoice.amountPaid) + data.amount;
    const newBalance = Number(invoice.total) - newAmountPaid;
    const newStatus = newBalance <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : invoice.status;
    const updatedInvoice = await prisma.invoice.update({ where: withCompany(req.params.id, req.user.companyId), data: { amountPaid: newAmountPaid, status: newStatus, paidAt: newBalance <= 0 ? new Date() : null } });
    emitToCompany(req.user.companyId, EVENTS.PAYMENT_RECEIVED, { invoiceId: invoice.id, invoiceNumber: invoice.number, amount: data.amount, newBalance, status: newStatus });
    if (newStatus === 'paid') {
      emitToCompany(req.user.companyId, EVENTS.INVOICE_PAID, { id: invoice.id, number: invoice.number, total: invoice.total });
    }
    res.status(201).json(payment);
  } catch (error) { next(error); }
});

// PDF download
router.get('/:id/pdf', requirePermission('invoices:read'), async (req, res, next) => {
  try {
    const { generateInvoicePDF } = await import('../services/pdf.js');
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.user.companyId },
      include: { contact: true, lineItems: { orderBy: { sortOrder: 'asc' } }, payments: { orderBy: { paidAt: 'desc' } } },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const company = await prisma.company.findUnique({ where: { id: req.user.companyId } });
    const pdfBuffer = await generateInvoicePDF(invoice, company);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.number}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) { next(error); }
});

export default router;
