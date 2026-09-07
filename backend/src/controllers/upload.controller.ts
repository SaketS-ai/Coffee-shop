import { Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

export const uploadImageHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(400, 'No image file was provided.', 'MISSING_FILE');
  }
  res.status(201).json({ image_url: `/uploads/${req.file.filename}` });
});
