import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { UPLOADS_DIR } from '../services/storage.service';
import { AppError } from '../utils/AppError';

export { UPLOADS_DIR };

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// Memory storage holds the buffer in memory so it can be streamed directly to AWS S3
// without touching the container disk, or saved locally during dev mode.
const storage = multer.memoryStorage();

const uploadImage = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      cb(new AppError(400, 'Only PNG, JPEG, WEBP, or GIF images are allowed.', 'INVALID_FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
}).single('image');

// multer's own middleware is callback-style, not promise-based, so it can't
// go through asyncHandler - this translates its errors (wrong type, too
// large) into the same AppError shape every other route uses instead of
// falling through to errorHandler's generic 500.
export function uploadImageMiddleware(req: Request, res: Response, next: NextFunction) {
  uploadImage(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(new AppError(400, 'Image must be 5MB or smaller.', 'FILE_TOO_LARGE'));
        return;
      }
      next(new AppError(400, err.message, 'UPLOAD_ERROR'));
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
}
