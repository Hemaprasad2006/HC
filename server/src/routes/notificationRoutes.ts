import { Router } from 'express';
import { getNotifications, markAsRead, markAllRead, deleteNotification } from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;
