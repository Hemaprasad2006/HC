import { Router } from 'express';
import { getTasks, createTask, updateTask, deleteTask, completeTask, bulkCompleteTasks, bulkPriorityTasks, bulkDeleteTasks } from '../controllers/taskController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getTasks);
router.post('/', createTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/complete', completeTask);

router.post('/bulk-complete', bulkCompleteTasks);
router.post('/bulk-priority', bulkPriorityTasks);
router.post('/bulk-delete', bulkDeleteTasks);

export default router;
