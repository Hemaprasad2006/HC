import { Router } from 'express';
import {
  getWater,
  logWater,
  getWaterHistory,
  getSleep,
  logSleep,
  getSleepStats,
  getSteps,
  logSteps,
  getStepsHistory,
  getWeightHistory,
  logWeight,
  getBMI,
  getHealthScore,
  getHealthScoreHistory,
} from '../controllers/healthController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/water', getWater);
router.post('/water', logWater);
router.get('/water/history', getWaterHistory);

router.get('/sleep', getSleep);
router.post('/sleep', logSleep);
router.get('/sleep/stats', getSleepStats);

router.get('/steps', getSteps);
router.post('/steps', logSteps);
router.get('/steps/history', getStepsHistory);

router.get('/weight', getWeightHistory);
router.post('/weight', logWeight);
router.get('/weight/history', getWeightHistory);
router.get('/bmi', getBMI);

router.get('/score', getHealthScore);
router.get('/score/history', getHealthScoreHistory);

export default router;
