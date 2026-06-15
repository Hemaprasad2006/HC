import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/summary', getDashboardSummary);

export default router;
