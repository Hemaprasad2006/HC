import { Router } from 'express';
import { getEvents, createEvent, updateEvent, deleteEvent, exportICS } from '../controllers/calendarController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getEvents);
router.post('/', createEvent);
router.patch('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.get('/export', exportICS);

export default router;
