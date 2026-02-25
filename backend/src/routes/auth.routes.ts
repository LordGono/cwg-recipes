import { Router } from 'express';
import {
  register,
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes
router.get('/me', authenticate, getCurrentUser);
router.patch('/me', authenticate, updateProfileValidation, updateProfile);
router.post('/me/change-password', authenticate, changePasswordValidation, changePassword);

export default router;
