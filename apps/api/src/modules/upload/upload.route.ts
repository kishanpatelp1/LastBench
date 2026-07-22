import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { AppError } from '../../middleware/error-handler.js';
import { env } from '../../config/env.js';
import { nanoid } from 'nanoid';
import multer from 'multer';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileTypeFromBuffer } from 'file-type';

const uploadDir = join(process.cwd(), env.UPLOAD_DIR);
mkdir(uploadDir, { recursive: true }).catch(() => {});

// C-5: Hardcoded allowlist of safe MIME types and extensions
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

// Use memory storage temporarily so we can inspect bytes before writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    // First-pass: reject based on mimetype header (trivially spoofable, but quick filter)
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new AppError(400, 'Invalid file type. Only JPEG, PNG, GIF, WebP allowed.'));
      return;
    }
    cb(null, true);
  },
});

export const uploadRoutes = Router();

uploadRoutes.post('/', requireAuth(), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, 'No file provided');

    // C-5: Magic-byte validation — detect actual file type from binary content
    const detected = await fileTypeFromBuffer(req.file.buffer);
    if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
      throw new AppError(400, 'File content does not match an allowed image type.');
    }

    // C-5: Hardcoded extension from magic bytes, NOT from client-provided filename
    const ext = detected.ext;
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new AppError(400, 'File extension not allowed.');
    }

    const filename = `${nanoid()}.${ext}`;
    const filepath = join(uploadDir, filename);

    // Write file to disk only after validation
    const { writeFile } = await import('node:fs/promises');
    await writeFile(filepath, req.file.buffer);

    const url = `${env.BETTER_AUTH_URL}/uploads/${filename}`;
    res.json({ success: true, data: { url, filename } });
  } catch (err) { next(err); }
});
