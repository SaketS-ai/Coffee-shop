import { Request, Response } from 'express';
import { storageService } from '../services/storage.service';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

export const uploadImageHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(400, 'No image file was provided.', 'MISSING_FILE');
  }
  const imageUrl = await storageService.uploadImage(req.file);
  res.status(201).json({ image_url: imageUrl });
});

