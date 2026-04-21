import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError, AuthRequest, UserRow } from '../types';
import * as userModel from '../models/user.model';

function signToken(user: UserRow): string {
  return jwt.sign(
    { userId: user.id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );
}

function sanitizeUser(user: UserRow) {
  const { password_hash: _, ...safe } = user;
  return safe;
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, business_name } = req.body as {
      email: string;
      password: string;
      business_name?: string;
    };

    const existing = await userModel.findByEmail(email);
    if (existing) {
      throw new AppError('Email already in use', 409);
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await userModel.create({ email, password_hash, business_name });
    const token = signToken(user);

    res.status(201).json({ data: { token, user: sanitizeUser(user) } });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = await userModel.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = signToken(user);
    res.status(200).json({ data: { token, user: sanitizeUser(user) } });
  } catch (err) {
    next(err);
  }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userModel.findById(req.user!.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    res.status(200).json({ data: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}
