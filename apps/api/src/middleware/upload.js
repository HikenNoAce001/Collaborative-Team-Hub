// Multer factory for in-memory uploads. Files never touch disk — we hand the
// buffer straight to the Cloudinary uploader.

import multer from 'multer';
import { BadRequest } from '../lib/errors.js';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Single-file image upload at `req.file`. Rejects non-images and oversized files
 * with the canonical AppError envelope (no raw multer messages leaking out).
 *
 * @param {{ field?: string, maxBytes?: number }} [opts]
 */
export function imageUpload({ field = 'file', maxBytes = MAX_AVATAR_BYTES } = {}) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(BadRequest('File must be an image (image/*)'));
      }
      cb(null, true);
    },
  });

  const single = upload.single(field);

  return (req, res, next) => {
    single(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(BadRequest(`File too large — max ${Math.round(maxBytes / 1024 / 1024)} MB`));
      }
      if (err.name === 'AppError') return next(err);
      next(BadRequest(err.message ?? 'Upload failed'));
    });
  };
}
