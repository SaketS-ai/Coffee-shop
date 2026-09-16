import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { deleteProfile, updateProfile } from '../services/profile.service';
import { storageService } from '../services/storage.service';
import { AppError } from '../utils/AppError';

export const updateProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await updateProfile(req.user!.sub, req.body ?? {});
  res.status(200).json({ user });
});

export const uploadAvatarHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(400, 'No image file was provided.', 'MISSING_FILE');
  }
  const imageUrl = await storageService.uploadImage(req.file, 'avatars');
  const user = await updateProfile(req.user!.sub, { profile_image_url: imageUrl });
  res.status(200).json({ success: true, user, image_url: imageUrl });
});

export const deleteProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteProfile(req.user!.sub);
  res.status(204).send();
});