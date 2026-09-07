import { Router } from 'express';
import { login, me, register } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/auth/register', register);
authRouter.post('/auth/login', login);
authRouter.get('/auth/me', requireAuth, me);
