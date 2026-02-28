import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const sources = await prisma.referralSource.findMany({ orderBy: { name: 'asc' } });
    res.json(sources);
  } catch (err) { next(err); }
});

router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const source = await prisma.referralSource.create({ data: req.body });
    res.status(201).json(source);
  } catch (err) { next(err); }
});

router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const source = await prisma.referralSource.update({ where: { id: req.params.id }, data: req.body });
    res.json(source);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    await prisma.referralSource.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

export default router;
