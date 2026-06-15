import { Router } from 'express';
import { getHabits, createHabit, updateHabit, deleteHabit, checkInHabit, freezeHabitStreak, getHabitHistory } from '../controllers/habitController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getHabits);
router.post('/', createHabit);
router.patch('/:id', updateHabit);
router.delete('/:id', deleteHabit);
router.post('/:id/checkin', checkInHabit);
router.post('/:id/freeze', freezeHabitStreak);
router.get('/:id/history', getHabitHistory);

export default router;
