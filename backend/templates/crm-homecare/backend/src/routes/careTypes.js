import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  res.json([
    { id: 'personal_care', name: 'Personal Care' },
    { id: 'companionship', name: 'Companionship' },
    { id: 'homemaking', name: 'Homemaking' },
    { id: 'skilled_nursing', name: 'Skilled Nursing' },
    { id: 'physical_therapy', name: 'Physical Therapy' },
    { id: 'occupational_therapy', name: 'Occupational Therapy' },
    { id: 'respite_care', name: 'Respite Care' },
  ]);
});

export default router;
