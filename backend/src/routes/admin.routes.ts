import { Router } from 'express';
import { getUsers, deleteUser, toggleAdmin, getStats, setUserGeminiLimit, geminiLimitValidation } from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

router.get('/users', getUsers);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/toggle-admin', toggleAdmin);
router.patch('/users/:id/gemini-limit', geminiLimitValidation, setUserGeminiLimit);
router.get('/stats', getStats);

export default router;
