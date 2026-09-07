import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../utils/AppError';

// Local-first (no S3/cloud this phase, per CLAUDE.md): admin-uploaded cafe/
// drink photos are saved to disk here and served back via the static mount
// in app.ts. Moving to object storage later only changes this file and the
// static mount, not the /api/uploads/image contract callers use.
export const UPLOADS_DIR = path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME_TYPES[file.mimetype] ?? path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

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
