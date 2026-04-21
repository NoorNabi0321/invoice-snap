import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthRequest, AppError } from '../types';

export function auth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  // Fall back to ?token= query param for direct download links (e.g. PDF)
  const queryToken = typeof req.query['token'] === 'string' ? req.query['token'] : undefined;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : queryToken;

  if (!token) {
    return next(new AppError('No token provided', 401));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string };
    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}
