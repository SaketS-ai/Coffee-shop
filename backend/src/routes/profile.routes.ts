import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { uploadImageMiddleware } from '../middleware/upload';
import {
  deleteProfileHandler,
  updateProfileHandler,
  uploadAvatarHandler,
} from '../controllers/profile.controller';

export const profileRouter = Router();

profileRouter.patch('/profile', requireAuth, updateProfileHandler);
profileRouter.post('/profile/avatar', requireAuth, uploadImageMiddleware, uploadAvatarHandler);
profileRouter.delete('/profile', requireAuth, deleteProfileHandler);