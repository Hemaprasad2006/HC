import { Router } from 'express';
import { subscribe, unsubscribe, getVapidPublicKey, testPush } from '../controllers/pushController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public key is unauthenticated so client can fetch it to subscribe
router.get('/vapid-public-key', getVapidPublicKey);

// Authenticated routes
router.use(authenticateToken);
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
router.post('/test', testPush);

export default router;
