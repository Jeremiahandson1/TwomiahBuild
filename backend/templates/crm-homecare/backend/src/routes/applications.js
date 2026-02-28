import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// POST /api/applications — Public, no auth (from website)
router.post('/', async (req, res, next) => {
  const {
    firstName, lastName, email, phone, address, city, state, zip, dob,
    driversLicense, transportation, legalToWork, backgroundCheck,
    felony, felonyExplanation, yearsExperience, cnaLicense, certifications,
    previousEmployer, reasonForLeaving, availability, shifts, hoursDesired, startDate,
    ref1Name, ref1Relationship, ref1Phone, ref1Email,
    ref2Name, ref2Relationship, ref2Phone, ref2Email,
    whyInterested, additionalInfo,
  } = req.body;

  try {
    const application = await prisma.jobApplication.create({
      data: {
        firstName, lastName, email,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        dateOfBirth: dob ? new Date(dob) : null,
        hasDriversLicense: driversLicense === 'yes',
        hasTransportation: transportation === 'yes',
        legalToWork: legalToWork === 'yes',
        willingBackgroundCheck: backgroundCheck === 'yes',
        felonyConviction: felony === 'yes',
        felonyExplanation: felonyExplanation || null,
        yearsExperience: yearsExperience ? parseInt(yearsExperience) : null,
        cnaLicense: cnaLicense || null,
        certifications: Array.isArray(certifications) ? certifications.join(',') : certifications || null,
        previousEmployer: previousEmployer || null,
        reasonForLeaving: reasonForLeaving || null,
        availabilityDays: Array.isArray(availability) ? availability.join(',') : availability || null,
        availabilityShifts: Array.isArray(shifts) ? shifts.join(',') : shifts || null,
        hoursDesired: hoursDesired || null,
        earliestStartDate: startDate ? new Date(startDate) : null,
        ref1Name: ref1Name || null,
        ref1Relationship: ref1Relationship || null,
        ref1Phone: ref1Phone || null,
        ref1Email: ref1Email || null,
        ref2Name: ref2Name || null,
        ref2Relationship: ref2Relationship || null,
        ref2Phone: ref2Phone || null,
        ref2Email: ref2Email || null,
        whyInterested: whyInterested || null,
        additionalInfo: additionalInfo || null,
      },
      select: { id: true, firstName: true, lastName: true, createdAt: true },
    });

    res.json({
      success: true,
      message: 'Application submitted successfully',
      applicationId: application.id,
    });
  } catch (error) {
    console.error('Application submission error:', error);
    res.status(500).json({ error: 'Failed to submit application. Please try again.' });
  }
});

// GET /api/applications — Admin only
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  const { status, startDate, endDate } = req.query;
  try {
    const applications = await prisma.jobApplication.findMany({
      where: {
        ...(status && { status }),
        ...(startDate && { createdAt: { gte: new Date(startDate) } }),
        ...(endDate && { createdAt: { lte: new Date(endDate) } }),
      },
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        city: true, state: true, yearsExperience: true, cnaLicense: true,
        status: true, createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(applications);
  } catch (e) { next(e); }
});

// GET /api/applications/stats/summary
router.get('/stats/summary', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const [total, newCount, reviewing, interviewed, offered, hired, rejected, last7, last30] = await Promise.all([
      prisma.jobApplication.count(),
      prisma.jobApplication.count({ where: { status: 'new' } }),
      prisma.jobApplication.count({ where: { status: 'reviewing' } }),
      prisma.jobApplication.count({ where: { status: 'interviewed' } }),
      prisma.jobApplication.count({ where: { status: 'offered' } }),
      prisma.jobApplication.count({ where: { status: 'hired' } }),
      prisma.jobApplication.count({ where: { status: 'rejected' } }),
      prisma.jobApplication.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
      prisma.jobApplication.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    ]);
    res.json({ total, newCount, reviewing, interviewed, offered, hired, rejected, last7Days: last7, last30Days: last30 });
  } catch (e) { next(e); }
});

// GET /api/applications/:id
router.get('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const application = await prisma.jobApplication.findUnique({
      where: { id: req.params.id },
      include: { statusHistory: { orderBy: { createdAt: 'desc' }, include: { changedBy: { select: { firstName: true, lastName: true } } } } },
    });
    if (!application) return res.status(404).json({ error: 'Application not found' });
    res.json(application);
  } catch (e) { next(e); }
});

// PUT /api/applications/:id/status
router.put('/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  const { status, notes } = req.body;
  try {
    await prisma.$transaction([
      prisma.jobApplication.update({ where: { id: req.params.id }, data: { status } }),
      prisma.jobApplicationStatusHistory.create({
        data: { applicationId: req.params.id, status, notes: notes || null, changedById: req.user.userId },
      }),
    ]);
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /api/applications/:id/notes
router.post('/:id/notes', authenticate, requireAdmin, async (req, res, next) => {
  const { notes } = req.body;
  try {
    const existing = await prisma.jobApplication.findUnique({ where: { id: req.params.id }, select: { interviewNotes: true } });
    const updated = existing?.interviewNotes
      ? `${existing.interviewNotes}\n\n${notes} - ${new Date().toLocaleDateString()}`
      : `${notes} - ${new Date().toLocaleDateString()}`;
    await prisma.jobApplication.update({ where: { id: req.params.id }, data: { interviewNotes: updated } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /api/applications/:id/hire
router.post('/:id/hire', authenticate, requireAdmin, async (req, res, next) => {
  const { hourlyRate, email, password } = req.body;
  try {
    const application = await prisma.jobApplication.findUnique({ where: { id: req.params.id } });
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.status === 'hired') return res.status(400).json({ error: 'Already hired' });

    const caregiverEmail = email || application.email;
    if (!caregiverEmail) return res.status(400).json({ error: 'Email required to create caregiver account' });

    const existing = await prisma.user.findUnique({ where: { email: caregiverEmail } });
    if (existing) return res.status(409).json({ error: 'A user with this email already exists' });

    const tempPassword = password || `${application.lastName.charAt(0).toUpperCase()}${Math.random().toString(36).slice(-6)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const [caregiver] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: caregiverEmail,
          passwordHash,
          firstName: application.firstName,
          lastName: application.lastName,
          phone: application.phone,
          role: 'caregiver',
          defaultPayRate: hourlyRate ? parseFloat(hourlyRate) : 15.0,
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, defaultPayRate: true },
      }),
      prisma.jobApplication.update({
        where: { id: req.params.id },
        data: { status: 'hired', hiredCaregiverId: undefined }, // will be set after user creation
      }),
    ]);

    // Update with caregiver ID now that we have it
    await prisma.jobApplication.update({
      where: { id: req.params.id },
      data: { hiredCaregiverId: caregiver.id },
    });

    await prisma.jobApplicationStatusHistory.create({
      data: {
        applicationId: req.params.id,
        status: 'hired',
        notes: `Converted to caregiver account.`,
        changedById: req.user.userId,
      },
    });

    res.json({
      success: true,
      caregiverId: caregiver.id,
      tempPassword,
      caregiver,
      message: `${application.firstName} ${application.lastName} is now a caregiver. Temp password: ${tempPassword}`,
    });
  } catch (e) { next(e); }
});

// DELETE /api/applications/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.jobApplication.delete({ where: { id: req.params.id } }); // cascades to statusHistory
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
