import express from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Optional Twilio setup
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  const { default: twilio } = await import('twilio');
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

const sendSMS = async (to, body) => {
  if (!twilioClient || !to) return false;
  try {
    await twilioClient.messages.create({ body, from: process.env.TWILIO_PHONE_NUMBER, to });
    return true;
  } catch (e) { console.error('SMS failed:', e.message); return false; }
};

// GET /api/no-show/config
router.get('/config', authenticate, async (req, res, next) => {
  try {
    const config = await prisma.noshowAlertConfig.findFirst();
    res.json(config || {});
  } catch (e) { next(e); }
});

// PUT /api/no-show/config
router.put('/config', authenticate, async (req, res, next) => {
  const { graceMinutes, notifyAdmin, notifyCaregiver, notifyClientFamily, adminPhone, adminEmail, isActive } = req.body;
  try {
    const existing = await prisma.noshowAlertConfig.findFirst();
    const data = {
      ...(graceMinutes !== undefined && { graceMinutes: parseInt(graceMinutes) }),
      ...(notifyAdmin !== undefined && { notifyAdmin }),
      ...(notifyCaregiver !== undefined && { notifyCaregiver }),
      ...(notifyClientFamily !== undefined && { notifyClientFamily }),
      ...(adminPhone !== undefined && { adminPhone }),
      ...(adminEmail !== undefined && { adminEmail }),
      ...(isActive !== undefined && { isActive }),
    };
    const config = existing
      ? await prisma.noshowAlertConfig.update({ where: { id: existing.id }, data })
      : await prisma.noshowAlertConfig.create({ data });
    res.json(config);
  } catch (e) { next(e); }
});

// GET /api/no-show/alerts
router.get('/alerts', authenticate, async (req, res, next) => {
  const { status, limit = '50' } = req.query;
  try {
    const alerts = await prisma.noshowAlert.findMany({
      where: status && status !== 'all' ? { status } : {},
      include: {
        caregiver: { select: { firstName: true, lastName: true, phone: true } },
        client: { select: { firstName: true, lastName: true } },
        schedule: true,
      },
      orderBy: [{ shiftDate: 'desc' }, { expectedStart: 'desc' }],
      take: parseInt(limit),
    });
    res.json(alerts.map(a => ({
      ...a,
      caregiverName: a.caregiver ? `${a.caregiver.firstName} ${a.caregiver.lastName}` : null,
      caregiverPhone: a.caregiver?.phone,
      clientName: a.client ? `${a.client.firstName} ${a.client.lastName}` : null,
    })));
  } catch (e) { next(e); }
});

// PUT /api/no-show/alerts/:id/resolve
router.put('/alerts/:id/resolve', authenticate, async (req, res, next) => {
  const { resolutionNote, status = 'resolved' } = req.body;
  try {
    const alert = await prisma.noshowAlert.update({
      where: { id: req.params.id },
      data: {
        status,
        resolvedAt: new Date(),
        resolvedById: req.user.userId,
        resolutionNote: resolutionNote || null,
      },
    });
    res.json(alert);
  } catch (e) { next(e); }
});

// GET /api/no-show/stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const [open, resolved, falseAlarm, today, week] = await Promise.all([
      prisma.noshowAlert.count({ where: { status: 'open' } }),
      prisma.noshowAlert.count({ where: { status: 'resolved' } }),
      prisma.noshowAlert.count({ where: { status: 'false_alarm' } }),
      prisma.noshowAlert.count({ where: { shiftDate: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
      prisma.noshowAlert.count({ where: { shiftDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    ]);
    res.json({ openCount: open, resolvedCount: resolved, falseAlarmCount: falseAlarm, todayCount: today, weekCount: week });
  } catch (e) { next(e); }
});

// POST /api/no-show/run-check
router.post('/run-check', authenticate, async (req, res, next) => {
  try {
    const config = await prisma.noshowAlertConfig.findFirst({ where: { isActive: true } });
    if (!config) return res.json({ checked: 0, alerts: 0 });

    const grace = config.graceMinutes || 15;
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const graceCutoff = new Date(Date.now() - grace * 60 * 1000);

    // Find schedules that should have started but have no clock-in
    const overdueSchedules = await prisma.schedule.findMany({
      where: {
        isActive: true,
        startTime: { lte: graceCutoff },
      },
      include: {
        caregiver: { select: { id: true, firstName: true, lastName: true, phone: true } },
        client: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    let alertsCreated = 0;
    for (const schedule of overdueSchedules) {
      // Check if already clocked in today
      const clockedIn = await prisma.timeEntry.findFirst({
        where: {
          caregiverId: schedule.caregiverId,
          clientId: schedule.clientId,
          startTime: { gte: todayStart },
        },
      });
      if (clockedIn) continue;

      // Check if already alerted today
      const alreadyAlerted = await prisma.noshowAlert.findFirst({
        where: {
          caregiverId: schedule.caregiverId,
          clientId: schedule.clientId,
          shiftDate: todayStart,
          status: 'open',
        },
      });
      if (alreadyAlerted) continue;

      const alert = await prisma.noshowAlert.create({
        data: {
          scheduleId: schedule.id,
          caregiverId: schedule.caregiverId,
          clientId: schedule.clientId,
          shiftDate: todayStart,
          expectedStart: schedule.startTime,
        },
      });

      let smsSent = false;
      const clientName = `${schedule.client.firstName} ${schedule.client.lastName}`;
      const caregiverName = `${schedule.caregiver.firstName} ${schedule.caregiver.lastName}`;

      if (config.notifyCaregiver && schedule.caregiver.phone) {
        smsSent = await sendSMS(schedule.caregiver.phone,
          `Alert: You were scheduled to start with ${clientName} at ${schedule.startTime}. Please clock in or contact the office immediately.`
        );
      }

      if (config.notifyAdmin && config.adminPhone) {
        await sendSMS(config.adminPhone,
          `No-Show Alert: ${caregiverName} has not clocked in for ${clientName}. Please follow up.`
        );
      }

      if (smsSent) {
        await prisma.noshowAlert.update({ where: { id: alert.id }, data: { smsSent: true } });
      }

      alertsCreated++;
    }

    res.json({ checked: overdueSchedules.length, alerts: alertsCreated, graceMinutes: grace });
  } catch (e) { next(e); }
});

export default router;
