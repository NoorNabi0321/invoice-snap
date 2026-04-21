import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  console.error(err);
  const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  res.status(500).json({ error: message });
}
