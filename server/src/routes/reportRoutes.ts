import { Router } from 'express';
import { getDashboardData, getWeeklyReview } from '../controllers/reportController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/dashboard', getDashboardData);
router.get('/weekly-review', getWeeklyReview);

export default router;
