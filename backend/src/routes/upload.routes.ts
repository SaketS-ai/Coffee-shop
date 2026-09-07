import { Router } from 'express';
import { uploadImageHandler } from '../controllers/upload.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { uploadImageMiddleware } from '../middleware/upload';

export const uploadRouter = Router();

// Admin-only - this backs the cafe/drink photo upload button, not a
// general-purpose file host.
uploadRouter.post('/uploads/image', requireAuth, requireRole('ADMIN'), uploadImageMiddleware, uploadImageHandler);
