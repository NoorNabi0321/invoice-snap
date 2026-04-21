import { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types';
import * as dashboardModel from '../models/dashboard.model';

export async function stats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await dashboardModel.getStats(req.user!.userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function chart(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const months = Math.min(Math.max(Number(req.query['months']) || 12, 1), 24);
    const data = await dashboardModel.getChart(req.user!.userId, months);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
