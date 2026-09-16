import { Router } from 'express';
import { uploadImageHandler } from '../controllers/upload.controller';
import { requireAuth } from '../middleware/auth';
import { uploadImageMiddleware } from '../middleware/upload';

export const uploadRouter = Router();

// Authenticated uploads - used for cafe/drink photos and user media.
uploadRouter.post('/uploads/image', requireAuth, uploadImageMiddleware, uploadImageHandler);
