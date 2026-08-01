import { Router } from 'express';
import { requireAuth, requireVerifiedEmail } from '../../middleware/auth.middleware.js';
import { AppError } from '../../middleware/error-handler.js';
import { env } from '../../config/env.js';
import { nanoid } from 'nanoid';
import multer from 'multer';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import { getSupabaseClient } from '../../lib/supabase.js';
import { logger } from '../../lib/logger.js';

const uploadDir = join(process.cwd(), env.UPLOAD_DIR);
mkdir(uploadDir, { recursive: true }).catch(() => {});

// C-5: Hardcoded allowlist of safe MIME types and extensions
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
]);
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov', 'avi']);

// Use memory storage temporarily so we can inspect bytes before writing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB to allow videos
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new AppError(400, 'Invalid file type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, MOV) are allowed.'));
      return;
    }
    cb(null, true);
  },
});

export const uploadRoutes: Router = Router();

uploadRoutes.post('/', requireAuth(), requireVerifiedEmail(), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, 'No file provided');

    // C-5: Magic-byte validation — detect actual file type from binary content
    // For images, we detect via magic bytes. For videos, trust the MIME type from multer
    // (file-type package may not always detect all video container formats).
    const isVideo = req.file.mimetype.startsWith('video/');
    let detectedMime: string;
    let ext: string;

    if (isVideo) {
      // Use the MIME type declared by the browser for video (already validated by multer above)
      const mimeExtMap: Record<string, string> = {
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/quicktime': 'mov',
        'video/x-msvideo': 'avi',
      };
      detectedMime = req.file.mimetype;
      ext = mimeExtMap[req.file.mimetype] ?? 'mp4';
    } else {
      const detected = await fileTypeFromBuffer(req.file.buffer);
      if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
        throw new AppError(400, 'File content does not match an allowed image type.');
      }
      detectedMime = detected.mime;
      ext = detected.ext;
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        throw new AppError(400, 'File extension not allowed.');
      }
    }

    const filename = `${nanoid()}.${ext}`;
    const supabase = getSupabaseClient();

    if (supabase) {
      const bucket = env.SUPABASE_STORAGE_BUCKET;
      const { data: uploadData, error } = await supabase.storage
        .from(bucket)
        .upload(filename, req.file.buffer, {
          contentType: detectedMime,
          upsert: true,
        });

      if (error) {
        logger.error({ error, bucket, filename }, 'Supabase Storage upload failed, falling back to local disk');
      } else if (uploadData) {
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filename);
        const url = publicUrlData.publicUrl;
        logger.info({ filename, url }, '☁️ File uploaded to Supabase Storage CDN successfully');
        res.json({ success: true, data: { url, filename } });
        return;
      }
    }

    // Fallback to local disk if Supabase is not configured or fails
    const filepath = join(uploadDir, filename);
    const { writeFile } = await import('node:fs/promises');
    await writeFile(filepath, req.file.buffer);

    const url = `${env.BETTER_AUTH_URL}/uploads/${filename}`;
    res.json({ success: true, data: { url, filename } });
  } catch (err) {
    next(err);
  }
});
