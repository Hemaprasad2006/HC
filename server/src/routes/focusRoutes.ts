import { Router } from 'express';
import { logSession, getSessions, getFocusStats, deleteSession } from '../controllers/focusController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/sessions', logSession);
router.get('/sessions', getSessions);
router.delete('/sessions/:id', deleteSession);
router.get('/stats', getFocusStats);

export default router;
