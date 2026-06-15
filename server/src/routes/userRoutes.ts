import { Router } from 'express';
import { getProfile, updateProfile, updatePreferences, deleteAccount, exportUserData } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.patch('/preferences', updatePreferences);
router.delete('/account', deleteAccount);
router.get('/export', exportUserData);

export default router;
