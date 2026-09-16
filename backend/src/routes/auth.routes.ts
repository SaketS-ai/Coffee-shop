import { Router } from 'express';
import {
  cafeLoginHandler,
  forgotPasswordHandler,
  login,
  me,
  register,
  resetPasswordHandler,
  verifyEmailHandler,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

export const authRouter = Router();

authRouter.post('/auth/register', authLimiter, register);
authRouter.post('/auth/login', authLimiter, login);
authRouter.post('/auth/cafe-login', authLimiter, cafeLoginHandler);
authRouter.get('/auth/me', requireAuth, me);
authRouter.post('/auth/verify-email', verifyEmailHandler);
authRouter.post('/auth/forgot-password', authLimiter, forgotPasswordHandler);
authRouter.post('/auth/reset-password', authLimiter, resetPasswordHandler);

