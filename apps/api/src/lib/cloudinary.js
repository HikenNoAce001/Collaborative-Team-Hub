// Cloudinary client wrapper. Configured lazily on first use so the API can boot
// without credentials (handy for local dev that doesn't touch uploads). The
// `requireCloudinary` helper turns missing credentials into a clean 503 instead
// of a stack trace.

import { v2 as cloudinary } from 'cloudinary';
import { env } from '../env.js';
import { AppError } from './errors.js';

let configured = false;

function configureOnce() {
  if (configured) return;
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    return;
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

export function isCloudinaryConfigured() {
  configureOnce();
  return configured;
}

export function requireCloudinary() {
  if (!isCloudinaryConfigured()) {
    throw new AppError('Image upload is not configured on this server.', {
      status: 503,
      code: 'CLOUDINARY_NOT_CONFIGURED',
    });
  }
  return cloudinary;
}

/**
 * Upload an in-memory buffer to Cloudinary. Wraps the streaming uploader in a
 * promise so callers can `await` it normally.
 *
 * @param {Buffer} buffer
 * @param {{ folder?: string, publicId?: string, transformation?: object[] }} [opts]
 * @returns {Promise<{ secureUrl: string, publicId: string }>}
 */
export function uploadBuffer(buffer, opts = {}) {
  const cld = requireCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cld.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: opts.folder ?? 'team-hub/avatars',
        public_id: opts.publicId,
        overwrite: true,
        invalidate: true,
        transformation: opts.transformation,
      },
      (err, result) => {
        if (err) return reject(err);
        if (!result) return reject(new Error('Cloudinary upload returned no result'));
        resolve({ secureUrl: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}
