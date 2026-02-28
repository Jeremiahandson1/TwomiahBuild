import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const userSelect = {
  id: true, email: true, firstName: true, lastName: true,
  phone: true, role: true, isActive: true, hireDate: true, defaultPayRate: true,
};

// GET /api/users?role=caregiver
router.get('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { role } = req.query;
    const users = await prisma.user.findMany({
      where: role ? { role } : {},
      select: userSelect,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    res.json(users);
  } catch (e) { next(e); }
});

// GET /api/users/admins
router.get('/admins', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: userSelect,
      orderBy: { firstName: 'asc' },
    });
    res.json(admins);
  } catch (e) { next(e); }
});

// GET /api/users/all
router.get('/all', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
    res.json(users);
  } catch (e) { next(e); }
});

// GET /api/users/caregivers
router.get('/caregivers', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const caregivers = await prisma.user.findMany({
      where: { role: 'caregiver' },
      select: { ...userSelect, certifications: true },
      orderBy: { firstName: 'asc' },
    });
    res.json(caregivers);
  } catch (e) { next(e); }
});

// GET /api/users/caregivers/:id
router.get('/caregivers/:id', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, role: 'caregiver' },
    });
    if (!user) return res.status(404).json({ error: 'Caregiver not found' });
    res.json(user);
  } catch (e) { next(e); }
});

// POST /api/users/convert-to-admin
router.post('/convert-to-admin', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.body;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: 'admin' },
      select: userSelect,
    });
    res.json(user);
  } catch (e) { next(e); }
});

// PUT /api/users/:id/reset-password
router.put('/:id/reset-password', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    res.json({ success: true, user });
  } catch (e) { next(e); }
});

export default router;
