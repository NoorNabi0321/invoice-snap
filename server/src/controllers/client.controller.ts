import { Response, NextFunction } from 'express';
import { AppError, AuthRequest } from '../types';
import * as clientModel from '../models/client.model';

export async function list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search } = req.query as { search?: string };
    const clients = await clientModel.findAll(req.user!.userId, search);
    res.status(200).json({ data: clients });
  } catch (err) {
    next(err);
  }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, phone, address, city, country } = req.body as {
      name: string;
      email: string;
      phone?: string;
      address?: string;
      city?: string;
      country?: string;
    };

    const client = await clientModel.create({
      user_id: req.user!.userId,
      name,
      email,
      phone,
      address,
      city,
      country,
    });

    res.status(201).json({ data: client });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const client = await clientModel.findById(req.params['id'] as string, req.user!.userId);
    if (!client) throw new AppError('Client not found', 404);
    res.status(200).json({ data: client });
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, phone, address, city, country } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      country?: string;
    };

    const client = await clientModel.update(req.params['id'] as string, req.user!.userId, {
      name,
      email,
      phone,
      address,
      city,
      country,
    });

    if (!client) throw new AppError('Client not found', 404);
    res.status(200).json({ data: client });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const deleted = await clientModel.remove(req.params['id'] as string, req.user!.userId);
    if (!deleted) throw new AppError('Client not found', 404);
    res.status(200).json({ data: { message: 'Client deleted successfully' } });
  } catch (err) {
    next(err);
  }
}
