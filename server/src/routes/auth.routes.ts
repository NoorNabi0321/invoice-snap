import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { auth } from '../middleware/auth';
import * as authController from '../controllers/auth.controller';

const router = Router();

router.post(
  '/register',
  validate([
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ]),
  authController.register
);

router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ]),
  authController.login
);

router.get('/me', auth, authController.me);

export default router;
