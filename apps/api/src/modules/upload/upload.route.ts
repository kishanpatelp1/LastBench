import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { AppError } from '../../middleware/error-handler.js';
import { env } from '../../config/env.js';
import { nanoid } from 'nanoid';
import multer from 'multer';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const uploadDir = join(process.cwd(), env.UPLOAD_DIR);
mkdir(uploadDir, { recursive: true }).catch(() => {});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop() ?? 'jpg';
    cb(null, `${nanoid()}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      cb(new AppError(400, 'Invalid file type. Only JPEG, PNG, GIF, WebP allowed.'));
      return;
    }
    cb(null, true);
  },
});

export const uploadRoutes = Router();

uploadRoutes.post('/', requireAuth(), upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, 'No file provided');
    const url = `${env.BETTER_AUTH_URL}/uploads/${req.file.filename}`;
    res.json({ success: true, data: { url, filename: req.file.filename } });
  } catch (err) { next(err); }
});
