import { Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import type { AuthRequest, UserRow } from '../types';
import { AppError } from '../types';
import * as userModel from '../models/user.model';
import { env } from '../config/env';

function sanitizeUser(user: UserRow) {
  const { password_hash: _, ...safe } = user;
  return safe;
}

// ── Multer setup ──────────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.resolve(env.UPLOAD_DIR);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const userId = (req as AuthRequest).user!.userId;
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `logo-${userId}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
    }
  },
});

// Wraps multer so size/type errors come back as 400, not 500
export function logoUpload(req: AuthRequest, res: Response, next: NextFunction): void {
  upload.single('logo')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large. Maximum size is 2 MB' : err.message;
      res.status(400).json({ error: msg });
      return;
    }
    if (err) {
      res.status(400).json({ error: (err as Error).message });
      return;
    }
    next();
  });
}

// ── Controllers ───────────────────────────────────────────────────────────────

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { business_name, business_email, business_address, business_phone, currency } =
      req.body as Record<string, string | undefined>;

    const updated = await userModel.updateProfile(req.user!.userId, {
      business_name,
      business_email,
      business_address,
      business_phone,
      currency,
    });
    if (!updated) throw new AppError('User not found', 404);
    res.json({ data: sanitizeUser(updated) });
  } catch (err) {
    next(err);
  }
}

export async function uploadLogo(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Delete old logo file if it was stored locally
    const existing = await userModel.findById(req.user!.userId);
    if (existing?.logo_url?.startsWith('/uploads/')) {
      const oldPath = path.resolve(env.UPLOAD_DIR, path.basename(existing.logo_url));
      fs.unlink(oldPath, () => { /* ignore missing file errors */ });
    }

    const logoUrl = `/uploads/${req.file.filename}`;
    await userModel.updateLogoUrl(req.user!.userId, logoUrl);
    res.json({ data: { logo_url: logoUrl } });
  } catch (err) {
    next(err);
  }
}
